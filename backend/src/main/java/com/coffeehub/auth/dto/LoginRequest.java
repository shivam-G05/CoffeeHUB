package com.coffeehub.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;

/** identifier is an email address or a mobile number; "email" is accepted as an alias for older clients. */
public record LoginRequest(
        @NotBlank @JsonAlias("email") String identifier,
        @NotBlank String password
) {
}
