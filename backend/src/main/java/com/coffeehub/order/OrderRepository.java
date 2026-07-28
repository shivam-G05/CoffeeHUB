package com.coffeehub.order;

import com.coffeehub.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerOrderByCreatedAtDesc(User customer);
    List<Order> findDistinctByItems_Product_SellerOrderByCreatedAtDesc(User seller);
    List<Order> findAllByOrderByCreatedAtDesc();
}
