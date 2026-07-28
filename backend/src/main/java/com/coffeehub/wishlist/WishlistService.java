package com.coffeehub.wishlist;

import com.coffeehub.cafe.Cafe;
import com.coffeehub.cafe.CafeRepository;
import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.common.ApiException;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class WishlistService {

    private final WishlistRepository wishlistRepository;
    private final ProductRepository productRepository;
    private final CafeRepository cafeRepository;

    public boolean toggleProduct(User customer, Long productId) {
        var existing = wishlistRepository.findByCustomerIdAndProductId(customer.getId(), productId);
        if (existing.isPresent()) {
            wishlistRepository.delete(existing.get());
            return false;
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        wishlistRepository.save(WishlistItem.builder().customer(customer).product(product).build());
        return true;
    }

    public boolean toggleCafe(User customer, Long cafeId) {
        var existing = wishlistRepository.findByCustomerIdAndCafeId(customer.getId(), cafeId);
        if (existing.isPresent()) {
            wishlistRepository.delete(existing.get());
            return false;
        }
        Cafe cafe = cafeRepository.findById(cafeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cafe not found"));
        wishlistRepository.save(WishlistItem.builder().customer(customer).cafe(cafe).build());
        return true;
    }

    public WishlistDto mine(User customer) {
        var products = wishlistRepository.findByCustomerAndProductIsNotNull(customer).stream()
                .map(w -> ProductDto.from(w.getProduct()))
                .toList();
        var cafes = wishlistRepository.findByCustomerAndCafeIsNotNull(customer).stream()
                .map(w -> CafeDto.from(w.getCafe()))
                .toList();
        return new WishlistDto(products, cafes);
    }
}
