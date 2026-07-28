package com.coffeehub.wishlist;

import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping("/mine")
    public WishlistDto mine(@AuthenticationPrincipal User customer) {
        return wishlistService.mine(customer);
    }

    @PostMapping("/products/{id}/toggle")
    public Map<String, Boolean> toggleProduct(@AuthenticationPrincipal User customer, @PathVariable Long id) {
        return Map.of("wishlisted", wishlistService.toggleProduct(customer, id));
    }

    @PostMapping("/cafes/{id}/toggle")
    public Map<String, Boolean> toggleCafe(@AuthenticationPrincipal User customer, @PathVariable Long id) {
        return Map.of("wishlisted", wishlistService.toggleCafe(customer, id));
    }
}
