package com.coffeehub.rfq;

import com.coffeehub.common.PageDto;
import com.coffeehub.rfq.RfqDtos.*;
import com.coffeehub.user.User;
import com.coffeehub.vendor.VendorDtos.VendorSummary;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class RfqController {

    private final RfqService rfqService;

    // ---- buyer

    @PostMapping("/api/rfqs")
    @PreAuthorize("hasRole('CUSTOMER')")
    public RfqDto create(@AuthenticationPrincipal User buyer, @Valid @RequestBody RfqRequest request) {
        return rfqService.create(buyer, request);
    }

    @GetMapping("/api/rfqs/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PageDto<RfqDto> mine(@AuthenticationPrincipal User buyer,
                                @RequestParam(defaultValue = "0") int page,
                                @RequestParam(defaultValue = "10") int size) {
        return rfqService.mine(buyer, page, size);
    }

    @GetMapping("/api/rfqs/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public RfqDto get(@AuthenticationPrincipal User buyer, @PathVariable Long id) {
        return rfqService.getForBuyer(buyer, id);
    }

    @PostMapping("/api/rfqs/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public RfqDto cancel(@AuthenticationPrincipal User buyer, @PathVariable Long id) {
        return rfqService.cancel(buyer, id);
    }

    @PostMapping("/api/rfqs/{id}/quotes/{quoteId}/select")
    @PreAuthorize("hasRole('CUSTOMER')")
    public RfqDto select(@AuthenticationPrincipal User buyer, @PathVariable Long id, @PathVariable Long quoteId) {
        return rfqService.selectSupplier(buyer, id, quoteId);
    }

    // ---- vendor: invited RFQs only

    @GetMapping("/api/vendor/rfqs")
    @PreAuthorize("hasRole('SELLER')")
    public PageDto<RfqDto> vendorRfqs(@AuthenticationPrincipal User seller,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "10") int size) {
        return rfqService.vendorRfqs(seller, page, size);
    }

    @GetMapping("/api/vendor/rfqs/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public RfqDto vendorRfq(@AuthenticationPrincipal User seller, @PathVariable Long id) {
        return rfqService.vendorRfq(seller, id);
    }

    @PostMapping("/api/vendor/rfqs/{id}/quote")
    @PreAuthorize("hasRole('SELLER')")
    public RfqDto quote(@AuthenticationPrincipal User seller, @PathVariable Long id, @Valid @RequestBody QuoteRequest request) {
        return rfqService.submitQuote(seller, id, request);
    }

    @PostMapping("/api/vendor/rfqs/{id}/decline")
    @PreAuthorize("hasRole('SELLER')")
    public RfqDto decline(@AuthenticationPrincipal User seller, @PathVariable Long id) {
        return rfqService.decline(seller, id);
    }

    @GetMapping("/api/vendor/quotes")
    @PreAuthorize("hasRole('SELLER')")
    public PageDto<QuoteDto> vendorQuotes(@AuthenticationPrincipal User seller,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "10") int size) {
        return rfqService.vendorQuotes(seller, page, size);
    }

    // ---- admin (/api/admin/** is ADMIN-only in SecurityConfig)

    @GetMapping("/api/admin/rfqs")
    public PageDto<RfqDto> adminList(@RequestParam(required = false) Rfq.Status status,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size) {
        return rfqService.adminList(status, page, size);
    }

    @GetMapping("/api/admin/rfqs/{id}")
    public RfqDto adminGet(@PathVariable Long id) {
        return rfqService.adminGet(id);
    }

    @GetMapping("/api/admin/rfqs/{id}/suggested-vendors")
    public List<VendorSummary> suggestedVendors(@PathVariable Long id) {
        return rfqService.suggestedVendors(id);
    }

    @PostMapping("/api/admin/rfqs/{id}/route")
    public RfqDto route(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody RouteRequest request) {
        return rfqService.route(admin, id, request);
    }

    @PostMapping("/api/admin/rfqs/{id}/reject")
    public RfqDto reject(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody RejectRequest request) {
        return rfqService.reject(admin, id, request.reason());
    }

    @GetMapping("/api/admin/quotes")
    public PageDto<QuoteDto> adminQuotes(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return rfqService.adminQuotes(page, size);
    }
}
