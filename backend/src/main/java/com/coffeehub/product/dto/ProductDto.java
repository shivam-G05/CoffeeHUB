package com.coffeehub.product.dto;

import com.coffeehub.product.Product;
import com.coffeehub.product.ProductType;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductDto(
        Long id,
        String name,
        String description,
        BigDecimal price,
        ProductType type,
        String category,
        int stock,
        String imageUrl,
        boolean approved,
        double avgRating,
        int reviewCount,
        Long sellerId,
        String sellerName,
        Instant createdAt
) {
    public static ProductDto from(Product p) {
        return new ProductDto(
                p.getId(),
                p.getName(),
                p.getDescription(),
                p.getPrice(),
                p.getType(),
                p.getCategory(),
                p.getStock(),
                p.getImageUrl(),
                p.isApproved(),
                p.getAvgRating(),
                p.getReviewCount(),
                p.getSeller().getId(),
                p.getSeller().getName(),
                p.getCreatedAt()
        );
    }
}
