package com.coffeehub.review;

import com.coffeehub.cafe.Cafe;
import com.coffeehub.product.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProductOrderByCreatedAtDesc(Product product);
    List<Review> findByCafeOrderByCreatedAtDesc(Cafe cafe);
    boolean existsByProductIdAndCustomerId(Long productId, Long customerId);
    boolean existsByCafeIdAndCustomerId(Long cafeId, Long customerId);
}
