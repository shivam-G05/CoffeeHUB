package com.coffeehub.dispute;

import com.coffeehub.audit.AuditService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.notification.NotificationService;
import com.coffeehub.order.OrderService;
import com.coffeehub.order.OrderStatus;
import com.coffeehub.order.VendorOrder;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorService;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/** Buyer raises a case with evidence -> vendor responds -> admin records the resolution (with or without a refund). */
@Service
@RequiredArgsConstructor
@Transactional
public class DisputeService {

    public interface DisputeRepository extends JpaRepository<Dispute, Long> {

        List<Dispute> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

        List<Dispute> findByVendorOrderVendorIdOrderByCreatedAtDesc(Long vendorId);

        Page<Dispute> findAllByOrderByCreatedAtDesc(Pageable pageable);

        boolean existsByVendorOrderIdAndStatusIn(Long vendorOrderId, Collection<Dispute.Status> statuses);

        long countByStatusIn(Collection<Dispute.Status> statuses);
    }

    public record DisputeDto(Long id, Long vendorOrderId, String subOrderNumber, Long orderId, Long buyerId, String buyerName,
                             Long vendorId, String vendorName, BigDecimal orderTotal, Dispute.Reason reason, String description,
                             List<String> evidenceUrls, String vendorResponse, Instant vendorRespondedAt,
                             Dispute.Status status, String resolution, BigDecimal refundAmount,
                             Instant createdAt, Instant resolvedAt) {
    }

    public record CreateRequest(@NotNull Long vendorOrderId, @NotNull Dispute.Reason reason,
                                @NotBlank @Size(max = 2000) String description,
                                @Size(max = 6) List<@Size(max = 500) String> evidenceUrls) {
    }

    public record RespondRequest(@NotBlank @Size(max = 2000) String response) {
    }

    public record ResolveRequest(@NotBlank @Size(max = 2000) String resolution,
                                 @DecimalMin(value = "0.0") BigDecimal refundAmount) {
    }

    private static final Set<Dispute.Status> ACTIVE = EnumSet.of(Dispute.Status.OPEN, Dispute.Status.VENDOR_RESPONDED);

    private final DisputeRepository disputeRepository;
    private final OrderService orderService;
    private final VendorService vendorService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public DisputeDto create(User buyer, CreateRequest req) {
        VendorOrder vendorOrder = orderService.findVendorOrder(req.vendorOrderId());
        if (!vendorOrder.getOrder().getCustomer().getId().equals(buyer.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        }
        OrderStatus status = vendorOrder.getStatus();
        if (status == OrderStatus.CANCELLED || status == OrderStatus.REFUNDED || status == OrderStatus.PLACED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A dispute cannot be raised on an order that is " + status.name().toLowerCase());
        }
        if (disputeRepository.existsByVendorOrderIdAndStatusIn(vendorOrder.getId(), ACTIVE)) {
            throw new ApiException(HttpStatus.CONFLICT, "There is already an open dispute for this order");
        }
        Dispute dispute = Dispute.builder()
                .vendorOrder(vendorOrder)
                .buyer(buyer)
                .reason(req.reason())
                .description(req.description().trim())
                .build();
        if (req.evidenceUrls() != null) {
            req.evidenceUrls().stream()
                    // Evidence must be files uploaded to this platform, never arbitrary external links.
                    .filter(url -> url != null && url.startsWith("/api/files/"))
                    .forEach(dispute.getEvidenceUrls()::add);
        }
        disputeRepository.save(dispute);
        orderService.markDisputed(vendorOrder);

        notificationService.notify(vendorOrder.getVendor().getUser(), "DISPUTE_OPENED",
                "Dispute opened on " + vendorOrder.getSubOrderNumber(),
                "The buyer reported: " + label(req.reason()) + ". Please respond.", "/seller/disputes");
        notificationService.notifyAdmins("DISPUTE_OPENED", "New dispute on " + vendorOrder.getSubOrderNumber(),
                label(req.reason()), "/admin/disputes");
        return dto(dispute);
    }

    @Transactional(readOnly = true)
    public List<DisputeDto> mine(User buyer) {
        return disputeRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId()).stream().map(this::dto).toList();
    }

    @Transactional(readOnly = true)
    public List<DisputeDto> forVendor(User seller) {
        Vendor vendor = vendorService.requireForUser(seller);
        return disputeRepository.findByVendorOrderVendorIdOrderByCreatedAtDesc(vendor.getId()).stream().map(this::dto).toList();
    }

    public DisputeDto respond(User seller, Long id, String response) {
        Vendor vendor = vendorService.requireForUser(seller);
        Dispute dispute = findOrThrow(id);
        if (!dispute.getVendorOrder().getVendor().getId().equals(vendor.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Dispute not found");
        }
        if (!ACTIVE.contains(dispute.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This dispute is already resolved");
        }
        dispute.setVendorResponse(response.trim());
        dispute.setVendorRespondedAt(Instant.now());
        dispute.setStatus(Dispute.Status.VENDOR_RESPONDED);
        notificationService.notify(dispute.getBuyer(), "DISPUTE_UPDATE", "The seller responded to your dispute",
                dispute.getVendorOrder().getSubOrderNumber(), "/customer/disputes");
        notificationService.notifyAdmins("DISPUTE_UPDATE", "Vendor responded on " + dispute.getVendorOrder().getSubOrderNumber(),
                null, "/admin/disputes");
        return dto(dispute);
    }

    @Transactional(readOnly = true)
    public PageDto<DisputeDto> adminList(int page, int size) {
        return PageDto.from(disputeRepository.findAllByOrderByCreatedAtDesc(PageDto.request(page, size, Sort.unsorted())), this::dto);
    }

    /** Admin closes the case. A refund amount > 0 is issued against the vendor order; otherwise the order returns to its prior state. */
    public DisputeDto resolve(User admin, Long id, ResolveRequest req) {
        Dispute dispute = findOrThrow(id);
        if (!ACTIVE.contains(dispute.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This dispute is already resolved");
        }
        VendorOrder vendorOrder = dispute.getVendorOrder();
        boolean refund = req.refundAmount() != null && req.refundAmount().signum() > 0;
        if (refund) {
            orderService.refund(vendorOrder, req.refundAmount());
            dispute.setRefundAmount(req.refundAmount());
        }
        // After a partial (or no) refund the order leaves DISPUTED and goes back to where it was.
        orderService.restoreAfterDispute(vendorOrder);
        dispute.setStatus(refund ? Dispute.Status.RESOLVED_REFUND : Dispute.Status.RESOLVED_NO_REFUND);
        dispute.setResolution(req.resolution().trim());
        dispute.setResolvedAt(Instant.now());
        auditService.log(admin, "DISPUTE_RESOLVED", "Dispute", id,
                vendorOrder.getSubOrderNumber() + ": " + dispute.getStatus() + (refund ? " ₹" + req.refundAmount() : ""));
        String body = req.resolution().trim();
        notificationService.notify(dispute.getBuyer(), "DISPUTE_UPDATE", "Your dispute has been resolved", body, "/customer/disputes");
        notificationService.notify(vendorOrder.getVendor().getUser(), "DISPUTE_UPDATE",
                "Dispute resolved on " + vendorOrder.getSubOrderNumber(), body, "/seller/disputes");
        return dto(dispute);
    }

    public long activeCount() {
        return disputeRepository.countByStatusIn(ACTIVE);
    }

    private Dispute findOrThrow(Long id) {
        return disputeRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Dispute not found"));
    }

    private static String label(Dispute.Reason reason) {
        return reason.name().toLowerCase().replace('_', ' ');
    }

    private DisputeDto dto(Dispute d) {
        VendorOrder vo = d.getVendorOrder();
        return new DisputeDto(d.getId(), vo.getId(), vo.getSubOrderNumber(), vo.getOrder().getId(), d.getBuyer().getId(),
                d.getBuyer().getName(), vo.getVendor().getId(), vo.getVendor().getBusinessName(), vo.getTotalAmount(),
                d.getReason(), d.getDescription(), List.copyOf(d.getEvidenceUrls()), d.getVendorResponse(),
                d.getVendorRespondedAt(), d.getStatus(), d.getResolution(), d.getRefundAmount(), d.getCreatedAt(), d.getResolvedAt());
    }
}
