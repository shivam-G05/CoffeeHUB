package com.coffeehub.product.dto;

import com.coffeehub.category.AttributeGroup;
import com.coffeehub.category.Category;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductStatus;
import com.coffeehub.product.ProductType;
import com.coffeehub.vendor.Vendor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public record ProductDto(
        Long id,
        String slug,
        String name,
        String description,
        BigDecimal price,
        String priceUnit,
        Integer moq,
        ProductType type,
        Long categoryId,
        String categoryName,
        String categorySlug,
        AttributeGroup attributeGroup,
        int stock,
        String imageUrl,
        List<String> imageUrls,
        Map<String, String> attributes,
        BigDecimal shippingCharge,
        Integer dispatchDays,
        String shipsFrom,
        ProductStatus status,
        String rejectionReason,
        boolean approved,
        boolean featured,
        double avgRating,
        int reviewCount,
        Long sellerId,
        String sellerName,
        Long vendorId,
        String vendorName,
        String vendorSlug,
        boolean vendorVerified,
        String vendorCity,
        String vendorState,
        Instant createdAt
) {
    public static ProductDto from(Product p) {
        Category c = p.getCategory();
        Vendor v = p.getVendor();
        return new ProductDto(
                p.getId(),
                p.getSlug(),
                p.getName(),
                p.getDescription(),
                p.getPrice(),
                p.getPriceUnit(),
                p.getMoq(),
                p.getType(),
                c != null ? c.getId() : null,
                c != null ? c.getName() : null,
                c != null ? c.getSlug() : null,
                c != null ? c.getAttributeGroup() : null,
                p.getStock(),
                p.getImageUrl(),
                List.copyOf(p.getImageUrls()),
                new LinkedHashMap<>(p.getAttributes()),
                p.getShippingCharge(),
                p.getDispatchDays(),
                p.getShipsFrom(),
                p.getStatus(),
                p.getRejectionReason(),
                p.isApproved(),
                p.isFeatured(),
                p.getAvgRating(),
                p.getReviewCount(),
                p.getSeller().getId(),
                v != null ? v.getBusinessName() : p.getSeller().getName(),
                v != null ? v.getId() : null,
                v != null ? v.getBusinessName() : null,
                v != null ? v.getSlug() : null,
                v != null && v.isVerified(),
                v != null ? v.getCity() : null,
                v != null ? v.getState() : null,
                p.getCreatedAt()
        );
    }
}
