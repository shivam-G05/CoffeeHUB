package com.coffeehub.product;

import com.coffeehub.vendor.VendorStatus;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.MapJoin;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;

/** Public marketplace search criteria. All fields are optional. */
public record ProductFilter(
        String q,
        ProductType type,
        String categorySlug,
        BigDecimal minPrice,
        BigDecimal maxPrice,
        String vendorSlug,
        String location,
        Double minRating,
        Integer maxMoq,
        boolean inStockOnly,
        Map<String, String> attributes
) {

    /** Only live listings from approved vendors ever match, whatever else is asked for. */
    public Specification<Product> toSpecification(Collection<Long> categoryIds) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            Join<Object, Object> vendor = root.join("vendor", JoinType.INNER);
            predicates.add(root.get("status").in(ProductStatus.APPROVED, ProductStatus.OUT_OF_STOCK));
            predicates.add(cb.equal(vendor.get("status"), VendorStatus.APPROVED));

            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("description")), like),
                        cb.like(cb.lower(vendor.get("businessName")), like)));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            if (categoryIds != null) {
                predicates.add(root.get("category").get("id").in(categoryIds));
            }
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("price"), maxPrice));
            }
            if (vendorSlug != null && !vendorSlug.isBlank()) {
                predicates.add(cb.equal(vendor.get("slug"), vendorSlug));
            }
            if (location != null && !location.isBlank()) {
                String like = "%" + location.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(vendor.get("city")), like),
                        cb.like(cb.lower(vendor.get("state")), like)));
            }
            if (minRating != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("avgRating"), minRating));
            }
            if (maxMoq != null) {
                predicates.add(cb.or(cb.isNull(root.get("moq")), cb.lessThanOrEqualTo(root.get("moq"), maxMoq)));
            }
            if (inStockOnly) {
                predicates.add(cb.greaterThan(root.get("stock"), 0));
            }
            if (attributes != null) {
                attributes.forEach((key, value) -> {
                    if (value == null || value.isBlank()) {
                        return;
                    }
                    MapJoin<Product, String, String> attr = root.joinMap("attributes", JoinType.INNER);
                    predicates.add(cb.equal(attr.key(), key));
                    predicates.add(cb.like(cb.lower(attr.value()), "%" + value.trim().toLowerCase() + "%"));
                });
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
