package com.coffeehub.review;

import com.coffeehub.cafe.Cafe;
import com.coffeehub.product.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByProductAndHiddenFalseOrderByCreatedAtDesc(Product product);

    List<Review> findByCafeAndHiddenFalseOrderByCreatedAtDesc(Cafe cafe);

    List<Review> findByVendorIdAndHiddenFalseOrderByCreatedAtDesc(Long vendorId);

    Page<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);

    boolean existsByProductIdAndCustomerId(Long productId, Long customerId);

    boolean existsByCafeIdAndCustomerId(Long cafeId, Long customerId);
}
