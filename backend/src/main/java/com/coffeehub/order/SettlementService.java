package com.coffeehub.order;

import com.coffeehub.audit.AuditService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.notification.NotificationService;
import com.coffeehub.order.OrderDtos.SettlementRequest;
import com.coffeehub.order.OrderDtos.VendorOrderDto;
import com.coffeehub.order.OrderDtos.View;
import com.coffeehub.order.OrderRepositories.SettlementRepository;
import com.coffeehub.order.OrderRepositories.VendorOrderRepository;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorBankAccount;
import com.coffeehub.vendor.VendorRepositories.VendorBankAccountRepository;
import com.coffeehub.vendor.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Vendor payouts: what each vendor is owed for delivered, paid orders, and the record of what has been paid out. */
@Service
@RequiredArgsConstructor
@Transactional
public class SettlementService {

    private final VendorOrderRepository vendorOrderRepository;
    private final SettlementRepository settlementRepository;
    private final VendorBankAccountRepository bankRepository;
    private final VendorService vendorService;
    private final OrderService orderService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    public record SettlementDto(Long id, Long vendorId, String vendorName, BigDecimal amount, int orderCount,
                                String reference, String note, Instant createdAt) {
        static SettlementDto from(Settlement s) {
            return new SettlementDto(s.getId(), s.getVendor().getId(), s.getVendor().getBusinessName(), s.getAmount(),
                    s.getOrderCount(), s.getReference(), s.getNote(), s.getCreatedAt());
        }
    }

    /** One row per vendor with money waiting to be paid out. */
    public record Payable(Long vendorId, String vendorName, BigDecimal amount, int orderCount,
                          VendorBankAccount.Status bankStatus, boolean payoutOnHold) {
    }

    public record VendorPayments(BigDecimal pending, BigDecimal eligible, BigDecimal onHold, BigDecimal settled,
                                 VendorBankAccount.Status bankStatus, boolean payoutOnHold,
                                 List<VendorOrderDto> orders, List<SettlementDto> settlements) {
    }

    @Transactional(readOnly = true)
    public List<Payable> payables() {
        Map<Long, List<VendorOrder>> byVendor = new LinkedHashMap<>();
        for (VendorOrder vo : vendorOrderRepository.findBySettlementStatus(VendorOrder.SettlementStatus.ELIGIBLE)) {
            byVendor.computeIfAbsent(vo.getVendor().getId(), k -> new ArrayList<>()).add(vo);
        }
        List<Payable> result = new ArrayList<>();
        byVendor.forEach((vendorId, orders) -> {
            Vendor vendor = orders.get(0).getVendor();
            VendorBankAccount.Status bankStatus = bankStatus(vendorId);
            result.add(new Payable(vendorId, vendor.getBusinessName(),
                    orders.stream().map(VendorOrder::getVendorPayable).reduce(BigDecimal.ZERO, BigDecimal::add),
                    orders.size(), bankStatus, bankStatus != VendorBankAccount.Status.VERIFIED));
        });
        return result;
    }

    /** Pays out everything currently eligible for one vendor. Blocked while their bank details are unverified. */
    public SettlementDto settle(User admin, SettlementRequest req) {
        Vendor vendor = vendorService.findOrThrow(req.vendorId());
        if (bankStatus(vendor.getId()) != VendorBankAccount.Status.VERIFIED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payouts are on hold until this vendor's bank details are verified");
        }
        List<VendorOrder> orders = vendorOrderRepository.findByVendorIdAndSettlementStatus(vendor.getId(), VendorOrder.SettlementStatus.ELIGIBLE);
        if (orders.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This vendor has nothing eligible for settlement");
        }
        BigDecimal amount = orders.stream().map(VendorOrder::getVendorPayable).reduce(BigDecimal.ZERO, BigDecimal::add);
        Settlement settlement = settlementRepository.save(Settlement.builder()
                .vendor(vendor)
                .amount(amount)
                .orderCount(orders.size())
                .reference(req.reference().trim())
                .note(req.note())
                .build());
        for (VendorOrder vo : orders) {
            vo.setSettlementStatus(VendorOrder.SettlementStatus.SETTLED);
            vo.setSettlement(settlement);
        }
        auditService.log(admin, "SETTLEMENT_PAID", "Settlement", settlement.getId(),
                vendor.getBusinessName() + " ₹" + amount + " for " + orders.size() + " order(s), ref " + req.reference().trim());
        notificationService.notify(vendor.getUser(), "SETTLEMENT", "Payout of ₹" + amount + " sent",
                "Reference " + req.reference().trim() + ", covering " + orders.size() + " order(s).", "/seller/payments");
        return SettlementDto.from(settlement);
    }

    @Transactional(readOnly = true)
    public PageDto<SettlementDto> all(int page, int size) {
        return PageDto.from(settlementRepository.findAllByOrderByCreatedAtDesc(PageDto.request(page, size, Sort.unsorted())),
                SettlementDto::from);
    }

    @Transactional(readOnly = true)
    public VendorPayments forVendor(User seller) {
        Vendor vendor = vendorService.requireForUser(seller);
        Long id = vendor.getId();
        VendorBankAccount.Status bankStatus = bankStatus(id);
        List<VendorOrderDto> recent = vendorOrderRepository
                .findByVendorIdOrderByCreatedAtDesc(id, PageDto.request(0, 50, Sort.unsorted()))
                .map(vo -> orderService.toDto(vo, View.VENDOR)).getContent();
        return new VendorPayments(
                vendorOrderRepository.sumPayable(id, VendorOrder.SettlementStatus.PENDING),
                vendorOrderRepository.sumPayable(id, VendorOrder.SettlementStatus.ELIGIBLE),
                vendorOrderRepository.sumPayable(id, VendorOrder.SettlementStatus.ON_HOLD),
                vendorOrderRepository.sumPayable(id, VendorOrder.SettlementStatus.SETTLED),
                bankStatus,
                bankStatus != VendorBankAccount.Status.VERIFIED,
                recent,
                settlementRepository.findByVendorIdOrderByCreatedAtDesc(id).stream().map(SettlementDto::from).toList());
    }

    private VendorBankAccount.Status bankStatus(Long vendorId) {
        return bankRepository.findByVendorId(vendorId).map(VendorBankAccount::getStatus).orElse(null);
    }
}
