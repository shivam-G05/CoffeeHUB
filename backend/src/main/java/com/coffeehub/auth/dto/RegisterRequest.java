package com.coffeehub.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Buyer registration. Company / GST / business type are optional B2B details. */
public record RegisterRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @NotBlank @Size(min = 10, max = 30) String phone,
        @Size(max = 255) String companyName,
        @Size(max = 20) String gstNumber,
        @Size(max = 100) String businessType,
        @Size(max = 20) String referralCode
) {
}
