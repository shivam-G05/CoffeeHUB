package com.coffeehub.auth.dto;

import com.coffeehub.vendor.VendorType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Vendor registration: account credentials plus the business details from the onboarding form. */
public record RegisterSellerRequest(
        @NotBlank @Size(max = 255) String businessName,
        @NotBlank @Size(max = 255) String contactPerson,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 10, max = 30) String phone,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotNull VendorType vendorType,
        @Size(max = 255) String website,
        @NotBlank @Size(max = 500) String addressLine,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String state,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "must be a 6-digit PIN code") String pin
) {
}
