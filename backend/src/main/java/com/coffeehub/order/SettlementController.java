package com.coffeehub.order;

import com.coffeehub.common.PageDto;
import com.coffeehub.order.OrderDtos.SettlementRequest;
import com.coffeehub.order.SettlementService.Payable;
import com.coffeehub.order.SettlementService.SettlementDto;
import com.coffeehub.order.SettlementService.VendorPayments;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    @GetMapping("/api/vendor/payments")
    @PreAuthorize("hasRole('SELLER')")
    public VendorPayments vendorPayments(@AuthenticationPrincipal User seller) {
        return settlementService.forVendor(seller);
    }

    @GetMapping("/api/admin/settlements/payables")
    public List<Payable> payables() {
        return settlementService.payables();
    }

    @GetMapping("/api/admin/settlements")
    public PageDto<SettlementDto> settlements(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return settlementService.all(page, size);
    }

    @PostMapping("/api/admin/settlements")
    public SettlementDto settle(@AuthenticationPrincipal User admin, @Valid @RequestBody SettlementRequest request) {
        return settlementService.settle(admin, request);
    }
}
