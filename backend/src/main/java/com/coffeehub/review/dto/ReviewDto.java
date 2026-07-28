package com.coffeehub.review.dto;

import com.coffeehub.review.Review;

import java.time.Instant;

public record ReviewDto(
        Long id,
        Long productId,
        Long cafeId,
        Long customerId,
        String customerName,
        int rating,
        String comment,
        Instant createdAt
) {
    public static ReviewDto from(Review r) {
        return new ReviewDto(
                r.getId(),
                r.getProduct() != null ? r.getProduct().getId() : null,
                r.getCafe() != null ? r.getCafe().getId() : null,
                r.getCustomer().getId(),
                r.getCustomer().getName(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt()
        );
    }
}
