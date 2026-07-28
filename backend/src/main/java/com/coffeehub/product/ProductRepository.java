package com.coffeehub.product;

import com.coffeehub.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {
    List<Product> findByApprovedTrue();
    List<Product> findByApprovedTrueAndType(ProductType type);
    List<Product> findBySeller(User seller);
}
