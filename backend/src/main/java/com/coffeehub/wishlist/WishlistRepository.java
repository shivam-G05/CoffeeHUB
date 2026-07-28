package com.coffeehub.wishlist;

import com.coffeehub.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {
    List<WishlistItem> findByCustomerAndProductIsNotNull(User customer);
    List<WishlistItem> findByCustomerAndCafeIsNotNull(User customer);
    Optional<WishlistItem> findByCustomerIdAndProductId(Long customerId, Long productId);
    Optional<WishlistItem> findByCustomerIdAndCafeId(Long customerId, Long cafeId);
}
