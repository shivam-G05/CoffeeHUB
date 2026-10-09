package com.coffeehub.vendor;

import com.coffeehub.common.PageDto;
import com.coffeehub.user.User;
import com.coffeehub.vendor.VendorDtos.Storefront;
import com.coffeehub.vendor.VendorDtos.VendorSummary;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Public supplier directory and storefronts, plus a buyer's saved suppliers. */
@RestController
@RequiredArgsConstructor
public class SupplierController {

    private final VendorService vendorService;

    @GetMapping("/api/suppliers")
    public PageDto<VendorSummary> directory(@RequestParam(required = false) String q,
                                            @RequestParam(required = false) VendorType type,
                                            @RequestParam(required = false) String state,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "12") int size) {
        return vendorService.directory(q, type, state, page, size);
    }

    @GetMapping("/api/suppliers/featured")
    public List<VendorSummary> featured() {
        return vendorService.featured();
    }

    @GetMapping("/api/suppliers/{slug}")
    public Storefront storefront(@PathVariable String slug) {
        return vendorService.storefront(slug);
    }

    @GetMapping("/api/saved-suppliers")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<VendorSummary> saved(@AuthenticationPrincipal User user) {
        return vendorService.saved(user);
    }

    @PostMapping("/api/saved-suppliers/{vendorId}/toggle")
    @PreAuthorize("hasRole('CUSTOMER')")
    public Map<String, Boolean> toggle(@AuthenticationPrincipal User user, @PathVariable Long vendorId) {
        return Map.of("saved", vendorService.toggleSaved(user, vendorId));
    }
}
