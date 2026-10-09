package com.coffeehub.vendor;

import com.coffeehub.common.PageDto;
import com.coffeehub.user.User;
import com.coffeehub.vendor.VendorDtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Admin vendor verification. /api/admin/** is restricted to ADMIN in SecurityConfig. */
@RestController
@RequestMapping("/api/admin/vendors")
@RequiredArgsConstructor
public class AdminVendorController {

    private final VendorService vendorService;

    @GetMapping
    public PageDto<VendorProfile> list(@RequestParam(required = false) VendorStatus status,
                                       @RequestParam(required = false) String q,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return vendorService.adminList(status, q, page, size);
    }

    @GetMapping("/{id}")
    public VendorProfile get(@PathVariable Long id) {
        return vendorService.adminGet(id);
    }

    @PutMapping("/{id}/status")
    public VendorProfile setStatus(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        return vendorService.setStatus(admin, id, request);
    }

    @PutMapping("/{id}/documents/{documentId}")
    public VendorProfile reviewDocument(@AuthenticationPrincipal User admin, @PathVariable Long id, @PathVariable Long documentId,
                                        @Valid @RequestBody DocumentReviewRequest request) {
        return vendorService.reviewDocument(admin, id, documentId, request);
    }

    @PutMapping("/{id}/bank")
    public VendorProfile reviewBank(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody BankReviewRequest request) {
        return vendorService.reviewBank(admin, id, request);
    }

    @PutMapping("/{id}/featured")
    public VendorProfile setFeatured(@AuthenticationPrincipal User admin, @PathVariable Long id, @RequestParam boolean featured) {
        return vendorService.setFeatured(admin, id, featured);
    }
}
