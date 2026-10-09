package com.coffeehub.vendor;

import com.coffeehub.user.User;
import com.coffeehub.vendor.VendorDtos.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Seller self-service onboarding: business profile, verification documents, bank details. */
@RestController
@RequestMapping("/api/vendor/me")
@PreAuthorize("hasRole('SELLER')")
@RequiredArgsConstructor
public class VendorController {

    private final VendorService vendorService;

    @GetMapping
    public VendorProfile me(@AuthenticationPrincipal User user) {
        return vendorService.myProfile(user);
    }

    @PutMapping
    public VendorProfile update(@AuthenticationPrincipal User user, @Valid @RequestBody ProfileRequest request) {
        return vendorService.updateProfile(user, request);
    }

    @PostMapping("/documents")
    public VendorProfile addDocument(@AuthenticationPrincipal User user, @Valid @RequestBody DocumentRequest request) {
        return vendorService.addDocument(user, request);
    }

    @DeleteMapping("/documents/{id}")
    public VendorProfile removeDocument(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return vendorService.removeDocument(user, id);
    }

    @PutMapping("/bank")
    public VendorProfile saveBank(@AuthenticationPrincipal User user, @Valid @RequestBody BankRequest request) {
        return vendorService.saveBank(user, request);
    }

    @PostMapping("/submit")
    public VendorProfile submit(@AuthenticationPrincipal User user) {
        return vendorService.submit(user);
    }
}
