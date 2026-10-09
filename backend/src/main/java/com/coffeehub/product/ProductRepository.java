package com.coffeehub.product;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByCategoryId(Long categoryId);

    List<Product> findBySellerIdOrderByCreatedAtDesc(Long sellerId);

    long countByVendorIdAndStatusIn(Long vendorId, Collection<ProductStatus> statuses);

    long countByStatus(ProductStatus status);

    /** Approved vendors with live listings in the given categories: candidates for RFQ routing. */
    @Query("""
            select distinct p.vendor from Product p
            where p.category.id in :categoryIds and p.status in :statuses and p.vendor.status = :vendorStatus
            """)
    List<com.coffeehub.vendor.Vendor> findVendorsSellingIn(@Param("categoryIds") Collection<Long> categoryIds,
                                                           @Param("statuses") Collection<ProductStatus> statuses,
                                                           @Param("vendorStatus") com.coffeehub.vendor.VendorStatus vendorStatus);

    /** Row lock used at checkout so concurrent orders cannot oversell stock. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Product p where p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);
}
