package com.coffeehub.auth.dto;

import com.coffeehub.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Email @Size(max = 255) String email,
        @NotBlank @Size(min = 8, message = "must be at least 8 characters") String password,
        @Size(max = 30) String phone,
        @NotNull Role role,
        @Size(max = 20) String referralCode
) {
}
