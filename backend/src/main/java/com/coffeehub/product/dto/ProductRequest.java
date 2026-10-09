package com.coffeehub.product.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record ProductRequest(
        @NotBlank @Size(max = 255) String name,
        @Size(max = 2000) String description,
        @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal price,
        @Size(max = 30) String priceUnit,
        @Min(1) Integer moq,
        @NotNull Long categoryId,
        @Min(0) int stock,
        @Size(max = 500) String imageUrl,
        @Size(max = 8) List<@Size(max = 500) String> imageUrls,
        Map<String, String> attributes,
        @DecimalMin("0.0") BigDecimal shippingCharge,
        @Min(0) Integer dispatchDays,
        @Size(max = 150) String shipsFrom
) {
}
