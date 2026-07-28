package com.coffeehub.cafe.dto;

import com.coffeehub.cafe.Cafe;

import java.time.Instant;

public record CafeDto(
        Long id,
        String name,
        String description,
        String address,
        String city,
        String imageUrl,
        boolean approved,
        double avgRating,
        int reviewCount,
        Long ownerId,
        String ownerName,
        Instant createdAt
) {
    public static CafeDto from(Cafe c) {
        return new CafeDto(
                c.getId(),
                c.getName(),
                c.getDescription(),
                c.getAddress(),
                c.getCity(),
                c.getImageUrl(),
                c.isApproved(),
                c.getAvgRating(),
                c.getReviewCount(),
                c.getOwner().getId(),
                c.getOwner().getName(),
                c.getCreatedAt()
        );
    }
}
