package com.coffeehub.review.dto;

import com.coffeehub.review.Review;

import java.time.Instant;

public record ReviewDto(
        Long id,
        Long productId,
        String productName,
        Long cafeId,
        Long vendorId,
        String vendorName,
        Long customerId,
        String customerName,
        int rating,
        Integer sellerRating,
        Integer qualityRating,
        Integer packagingRating,
        Integer deliveryRating,
        Integer communicationRating,
        String comment,
        boolean verifiedPurchase,
        boolean hidden,
        String moderationNote,
        Instant createdAt
) {
    public static ReviewDto from(Review r) {
        return new ReviewDto(
                r.getId(),
                r.getProduct() != null ? r.getProduct().getId() : null,
                r.getProduct() != null ? r.getProduct().getName() : null,
                r.getCafe() != null ? r.getCafe().getId() : null,
                r.getVendor() != null ? r.getVendor().getId() : null,
                r.getVendor() != null ? r.getVendor().getBusinessName() : null,
                r.getCustomer().getId(),
                r.getCustomer().getName(),
                r.getRating(),
                r.getSellerRating(),
                r.getQualityRating(),
                r.getPackagingRating(),
                r.getDeliveryRating(),
                r.getCommunicationRating(),
                r.getComment(),
                r.isVerifiedPurchase(),
                r.isHidden(),
                r.getModerationNote(),
                r.getCreatedAt()
        );
    }
}
