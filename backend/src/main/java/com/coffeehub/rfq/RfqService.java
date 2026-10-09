package com.coffeehub.rfq;

import com.coffeehub.audit.AuditService;
import com.coffeehub.category.Category;
import com.coffeehub.category.CategoryService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.messaging.Conversation;
import com.coffeehub.messaging.MessagingService;
import com.coffeehub.notification.NotificationService;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.product.ProductStatus;
import com.coffeehub.rfq.RfqDtos.*;
import com.coffeehub.rfq.RfqRepositories.*;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorDtos.VendorSummary;
import com.coffeehub.vendor.VendorRepositories.VendorRepository;
import com.coffeehub.vendor.VendorService;
import com.coffeehub.vendor.VendorStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * B2B sourcing: Buyer RFQ -> admin review -> relevant vendors -> vendor quotes ->
 * buyer comparison -> supplier selection. Matching is admin-assisted in Phase 1.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RfqService {

    private enum View {
        BUYER, VENDOR, ADMIN
    }

    private final RfqRepository rfqRepository;
    private final RfqVendorRepository rfqVendorRepository;
    private final QuoteRepository quoteRepository;
    private final VendorRepository vendorRepository;
    private final ProductRepository productRepository;
    private final CategoryService categoryService;
    private final VendorService vendorService;
    private final MessagingService messagingService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    // ---------------------------------------------------------------- buyer

    public RfqDto create(User buyer, RfqRequest req) {
        Category category = categoryService.findOrThrow(req.categoryId());
        Product product = null;
        if (req.productId() != null) {
            product = productRepository.findById(req.productId())
                    .filter(Product::isPubliclyVisible)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Product not found"));
        }
        Rfq rfq = rfqRepository.save(Rfq.builder()
                .buyer(buyer)
                .title(req.title().trim())
                .category(category)
                .product(product)
                .coffeeType(blankToNull(req.coffeeType()))
                .specification(blankToNull(req.specification()))
                .quantity(req.quantity())
                .unit(req.unit().trim())
                .targetPrice(req.targetPrice())
                .deliveryLocation(req.deliveryLocation().trim())
                .requiredBy(req.requiredBy())
                .sampleRequired(req.sampleRequired())
                .privateLabelRequired(req.privateLabelRequired())
                .additionalRequirements(blankToNull(req.additionalRequirements()))
                .build());
        notificationService.notifyAdmins("RFQ_SUBMITTED", "New RFQ to review", rfq.getTitle(), "/admin/rfqs/" + rfq.getId());
        return dto(rfq, View.BUYER, null);
    }

    @Transactional(readOnly = true)
    public PageDto<RfqDto> mine(User buyer, int page, int size) {
        return PageDto.from(rfqRepository.findByBuyerIdOrderByCreatedAtDesc(buyer.getId(), pageable(page, size)),
                r -> dto(r, View.BUYER, null));
    }

    @Transactional(readOnly = true)
    public RfqDto getForBuyer(User buyer, Long id) {
        return dto(findOwned(buyer, id), View.BUYER, null);
    }

    public RfqDto cancel(User buyer, Long id) {
        Rfq rfq = findOwned(buyer, id);
        if (rfq.getStatus() != Rfq.Status.SUBMITTED && rfq.getStatus() != Rfq.Status.OPEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This requirement is already closed");
        }
        rfq.setStatus(Rfq.Status.CANCELLED);
        return dto(rfq, View.BUYER, null);
    }

    /** Buyer picks one quote: it is accepted, the rest are declined, and a thread opens with the chosen supplier. */
    public RfqDto selectSupplier(User buyer, Long rfqId, Long quoteId) {
        Rfq rfq = findOwned(buyer, rfqId);
        if (rfq.getStatus() != Rfq.Status.OPEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A supplier can only be selected while the requirement is open");
        }
        List<Quote> quotes = quoteRepository.findByRfqIdOrderByPricePerUnitAsc(rfqId);
        Quote chosen = quotes.stream()
                .filter(q -> q.getId().equals(quoteId) && q.getStatus() == Quote.Status.SUBMITTED)
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Quote not found"));
        if (chosen.getValidUntil() != null && chosen.getValidUntil().isBefore(LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This quote has expired. Ask the supplier to refresh it.");
        }
        for (Quote quote : quotes) {
            if (quote.getStatus() != Quote.Status.SUBMITTED) {
                continue;
            }
            boolean won = quote == chosen;
            quote.setStatus(won ? Quote.Status.ACCEPTED : Quote.Status.REJECTED);
            quote.setUpdatedAt(Instant.now());
            notificationService.notify(quote.getVendor().getUser(), won ? "QUOTE_ACCEPTED" : "QUOTE_NOT_SELECTED",
                    won ? "Your quote was accepted" : "Quote not selected",
                    "\"" + rfq.getTitle() + "\"" + (won ? ": the buyer chose you as their supplier." : ": the buyer selected another supplier."),
                    "/seller/quotes");
        }
        rfq.setStatus(Rfq.Status.AWARDED);
        rfq.setSelectedQuoteId(chosen.getId());
        messagingService.ensure(buyer, chosen.getVendor(), Conversation.ContextType.RFQ, rfq.getId(), "RFQ: " + rfq.getTitle());
        return dto(rfq, View.BUYER, null);
    }

    // ---------------------------------------------------------------- admin

    @Transactional(readOnly = true)
    public PageDto<RfqDto> adminList(Rfq.Status status, int page, int size) {
        Page<Rfq> result = status == null
                ? rfqRepository.findAllByOrderByCreatedAtDesc(pageable(page, size))
                : rfqRepository.findByStatusOrderByCreatedAtDesc(status, pageable(page, size));
        return PageDto.from(result, r -> dto(r, View.ADMIN, null));
    }

    @Transactional(readOnly = true)
    public RfqDto adminGet(Long id) {
        return dto(findOrThrow(id), View.ADMIN, null);
    }

    /** Approved vendors already selling in the RFQ's category (and the product's own vendor first), for the admin to pick from. */
    @Transactional(readOnly = true)
    public List<VendorSummary> suggestedVendors(Long rfqId) {
        Rfq rfq = findOrThrow(rfqId);
        Map<Long, Vendor> candidates = new LinkedHashMap<>();
        if (rfq.getProduct() != null && rfq.getProduct().getVendor() != null && rfq.getProduct().getVendor().isVerified()) {
            candidates.put(rfq.getProduct().getVendor().getId(), rfq.getProduct().getVendor());
        }
        Category category = rfq.getCategory();
        List<Long> categoryIds = new ArrayList<>(categoryService.selfAndChildIds(category));
        if (category.getParent() != null) {
            categoryIds.add(category.getParent().getId());
        }
        productRepository.findVendorsSellingIn(categoryIds, EnumSet.of(ProductStatus.APPROVED, ProductStatus.OUT_OF_STOCK), VendorStatus.APPROVED)
                .forEach(v -> candidates.putIfAbsent(v.getId(), v));
        return candidates.values().stream().limit(50).map(vendorService::summary).toList();
    }

    public RfqDto route(User admin, Long rfqId, RouteRequest req) {
        Rfq rfq = findOrThrow(rfqId);
        if (rfq.getStatus() != Rfq.Status.SUBMITTED && rfq.getStatus() != Rfq.Status.OPEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This requirement is closed and cannot be routed");
        }
        int invited = 0;
        for (Long vendorId : req.vendorIds()) {
            Vendor vendor = vendorRepository.findById(vendorId)
                    .filter(Vendor::isVerified)
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Vendor " + vendorId + " is not an approved vendor"));
            if (rfqVendorRepository.findByRfqIdAndVendorId(rfqId, vendorId).isPresent()) {
                continue;
            }
            rfqVendorRepository.save(RfqVendor.builder().rfq(rfq).vendor(vendor).build());
            invited++;
            notificationService.notify(vendor.getUser(), "RFQ_INVITATION", "New matching RFQ",
                    rfq.getTitle() + " — " + rfq.getQuantity().stripTrailingZeros().toPlainString() + " " + rfq.getUnit(),
                    "/seller/rfqs/" + rfq.getId());
        }
        boolean firstRouting = rfq.getStatus() == Rfq.Status.SUBMITTED;
        rfq.setStatus(Rfq.Status.OPEN);
        if (req.note() != null && !req.note().isBlank()) {
            rfq.setAdminNote(req.note().trim());
        }
        auditService.log(admin, "RFQ_ROUTED", "Rfq", rfqId, "Invited " + invited + " vendor(s): " + req.vendorIds());
        if (firstRouting) {
            notificationService.notify(rfq.getBuyer(), "RFQ_OPEN", "Your requirement is with suppliers",
                    "\"" + rfq.getTitle() + "\" was sent to " + invited + " verified supplier(s). You'll be notified as quotes arrive.",
                    "/customer/rfqs/" + rfq.getId());
        }
        return dto(rfq, View.ADMIN, null);
    }

    public RfqDto reject(User admin, Long rfqId, String reason) {
        Rfq rfq = findOrThrow(rfqId);
        if (rfq.getStatus() != Rfq.Status.SUBMITTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only requirements awaiting review can be rejected");
        }
        rfq.setStatus(Rfq.Status.REJECTED);
        rfq.setAdminNote(reason.trim());
        auditService.log(admin, "RFQ_REJECTED", "Rfq", rfqId, reason.trim());
        notificationService.notify(rfq.getBuyer(), "RFQ_REJECTED", "Your requirement could not be processed",
                reason.trim(), "/customer/rfqs/" + rfq.getId());
        return dto(rfq, View.ADMIN, null);
    }

    @Transactional(readOnly = true)
    public PageDto<QuoteDto> adminQuotes(int page, int size) {
        return PageDto.from(quoteRepository.findAllByOrderByCreatedAtDesc(pageable(page, size)), this::quoteDto);
    }

    // ---------------------------------------------------------------- vendor

    @Transactional(readOnly = true)
    public PageDto<RfqDto> vendorRfqs(User seller, int page, int size) {
        Vendor vendor = vendorService.requireForUser(seller);
        return PageDto.from(rfqVendorRepository.findByVendorIdOrderByInvitedAtDesc(vendor.getId(), pageable(page, size)),
                invitation -> dto(invitation.getRfq(), View.VENDOR, invitation));
    }

    @Transactional(readOnly = true)
    public RfqDto vendorRfq(User seller, Long rfqId) {
        RfqVendor invitation = findInvitation(seller, rfqId);
        return dto(invitation.getRfq(), View.VENDOR, invitation);
    }

    /** Submits this vendor's quote, or revises it while it is still open. */
    public RfqDto submitQuote(User seller, Long rfqId, QuoteRequest req) {
        RfqVendor invitation = findInvitation(seller, rfqId);
        Rfq rfq = invitation.getRfq();
        Vendor vendor = invitation.getVendor();
        if (!vendor.isVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only verified vendors can quote");
        }
        if (rfq.getStatus() != Rfq.Status.OPEN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This requirement is no longer accepting quotes");
        }
        Quote quote = quoteRepository.findByRfqIdAndVendorId(rfqId, vendor.getId())
                .orElseGet(() -> Quote.builder().rfq(rfq).vendor(vendor).build());
        boolean isNew = quote.getId() == null;
        quote.setPricePerUnit(req.pricePerUnit());
        quote.setMoq(req.moq());
        quote.setAvailableQuantity(req.availableQuantity());
        quote.setTaxPercent(req.taxPercent());
        quote.setShippingCost(req.shippingCost());
        quote.setLeadTimeDays(req.leadTimeDays());
        quote.setValidUntil(req.validUntil());
        quote.setSampleCost(req.sampleCost());
        quote.setNotes(blankToNull(req.notes()));
        quote.setStatus(Quote.Status.SUBMITTED);
        quote.setUpdatedAt(Instant.now());
        quoteRepository.save(quote);
        invitation.setStatus(RfqVendor.Status.QUOTED);
        notificationService.notify(rfq.getBuyer(), "QUOTE_RECEIVED",
                isNew ? "New quote received" : "A supplier updated their quote",
                vendor.getBusinessName() + " quoted on \"" + rfq.getTitle() + "\".", "/customer/rfqs/" + rfq.getId());
        return dto(rfq, View.VENDOR, invitation);
    }

    public RfqDto decline(User seller, Long rfqId) {
        RfqVendor invitation = findInvitation(seller, rfqId);
        quoteRepository.findByRfqIdAndVendorId(rfqId, invitation.getVendor().getId())
                .filter(q -> q.getStatus() == Quote.Status.SUBMITTED)
                .ifPresent(q -> q.setStatus(Quote.Status.WITHDRAWN));
        invitation.setStatus(RfqVendor.Status.DECLINED);
        return dto(invitation.getRfq(), View.VENDOR, invitation);
    }

    @Transactional(readOnly = true)
    public PageDto<QuoteDto> vendorQuotes(User seller, int page, int size) {
        Vendor vendor = vendorService.requireForUser(seller);
        return PageDto.from(quoteRepository.findByVendorIdOrderByCreatedAtDesc(vendor.getId(), pageable(page, size)), this::quoteDto);
    }

    // ---------------------------------------------------------------- helpers

    private Pageable pageable(int page, int size) {
        return PageDto.request(page, size, Sort.unsorted());
    }

    private Rfq findOrThrow(Long id) {
        return rfqRepository.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Requirement not found"));
    }

    private Rfq findOwned(User buyer, Long id) {
        Rfq rfq = findOrThrow(id);
        if (!rfq.getBuyer().getId().equals(buyer.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Requirement not found");
        }
        return rfq;
    }

    /** Vendors can only see RFQs they were invited to. */
    private RfqVendor findInvitation(User seller, Long rfqId) {
        Vendor vendor = vendorService.requireForUser(seller);
        return rfqVendorRepository.findByRfqIdAndVendorId(rfqId, vendor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Requirement not found"));
    }

    private RfqDto dto(Rfq rfq, View view, RfqVendor invitation) {
        List<QuoteDto> quotes = List.of();
        QuoteDto myQuote = null;
        List<VendorSummary> invitedVendors = List.of();
        if (view == View.VENDOR) {
            myQuote = quoteRepository.findByRfqIdAndVendorId(rfq.getId(), invitation.getVendor().getId())
                    .map(this::quoteDto).orElse(null);
        } else {
            // Withdrawn quotes are not offered to the buyer for comparison.
            quotes = quoteRepository.findByRfqIdOrderByPricePerUnitAsc(rfq.getId()).stream()
                    .filter(q -> view == View.ADMIN || q.getStatus() != Quote.Status.WITHDRAWN)
                    .map(this::quoteDto)
                    .toList();
        }
        if (view == View.ADMIN) {
            invitedVendors = rfqVendorRepository.findByRfqId(rfq.getId()).stream()
                    .map(i -> vendorService.summary(i.getVendor())).toList();
        }
        User buyer = rfq.getBuyer();
        return new RfqDto(
                rfq.getId(), rfq.getTitle(), rfq.getCategory().getId(), rfq.getCategory().getName(),
                rfq.getProduct() != null ? rfq.getProduct().getId() : null,
                rfq.getProduct() != null ? rfq.getProduct().getName() : null,
                rfq.getCoffeeType(), rfq.getSpecification(), rfq.getQuantity(), rfq.getUnit(), rfq.getTargetPrice(),
                rfq.getDeliveryLocation(), rfq.getRequiredBy(), rfq.isSampleRequired(), rfq.isPrivateLabelRequired(),
                rfq.getAdditionalRequirements(), rfq.getStatus(), rfq.getAdminNote(), rfq.getSelectedQuoteId(),
                view == View.VENDOR ? MessagingService.buyerDisplayName(buyer) : buyer.getName(),
                rfqVendorRepository.countByRfqId(rfq.getId()),
                quoteRepository.countByRfqId(rfq.getId()),
                rfq.getCreatedAt(), quotes, myQuote,
                invitation != null ? invitation.getStatus() : null,
                invitedVendors);
    }

    private QuoteDto quoteDto(Quote q) {
        Vendor v = q.getVendor();
        Rfq rfq = q.getRfq();
        BigDecimal goods = q.getPricePerUnit().multiply(rfq.getQuantity());
        BigDecimal tax = q.getTaxPercent() == null ? BigDecimal.ZERO
                : goods.multiply(q.getTaxPercent()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal total = goods.add(tax).add(q.getShippingCost() == null ? BigDecimal.ZERO : q.getShippingCost())
                .setScale(2, RoundingMode.HALF_UP);
        String location = v.getCity() == null ? v.getState() : (v.getState() == null ? v.getCity() : v.getCity() + ", " + v.getState());
        return new QuoteDto(q.getId(), rfq.getId(), rfq.getTitle(), v.getId(), v.getBusinessName(), v.getSlug(),
                v.isVerified(), v.getAvgRating(), v.getReviewCount(), location, q.getPricePerUnit(), q.getMoq(),
                q.getAvailableQuantity(), q.getTaxPercent(), q.getShippingCost(), q.getLeadTimeDays(), q.getValidUntil(),
                q.getSampleCost(), q.getNotes(), total, q.getStatus(), q.getCreatedAt());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
