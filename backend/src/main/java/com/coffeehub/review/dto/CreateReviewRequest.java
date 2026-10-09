package com.coffeehub.review.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateReviewRequest(
        Long productId,
        Long cafeId,
        @NotNull @Min(1) @Max(5) Integer rating,
        @Min(1) @Max(5) Integer sellerRating,
        @Min(1) @Max(5) Integer qualityRating,
        @Min(1) @Max(5) Integer packagingRating,
        @Min(1) @Max(5) Integer deliveryRating,
        @Min(1) @Max(5) Integer communicationRating,
        @Size(max = 1000) String comment
) {
}
