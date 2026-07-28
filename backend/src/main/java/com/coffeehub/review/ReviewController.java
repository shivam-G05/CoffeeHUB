package com.coffeehub.review;

import com.coffeehub.review.dto.CreateReviewRequest;
import com.coffeehub.review.dto.ReviewDto;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ReviewDto create(@AuthenticationPrincipal User customer, @Valid @RequestBody CreateReviewRequest request) {
        return reviewService.create(customer, request);
    }

    @GetMapping
    public List<ReviewDto> list(@RequestParam(required = false) Long productId, @RequestParam(required = false) Long cafeId) {
        if (productId != null) {
            return reviewService.forProduct(productId);
        }
        if (cafeId != null) {
            return reviewService.forCafe(cafeId);
        }
        return List.of();
    }
}
