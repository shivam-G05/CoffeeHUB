package com.coffeehub.cafe.dto;

import jakarta.validation.constraints.NotBlank;

public record CafeRequest(
        @NotBlank String name,
        String description,
        String address,
        String city,
        String imageUrl
) {
}
