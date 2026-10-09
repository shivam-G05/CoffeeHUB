package com.coffeehub.review;

import com.coffeehub.common.PageDto;
import com.coffeehub.review.ReviewService.Eligibility;
import com.coffeehub.review.dto.CreateReviewRequest;
import com.coffeehub.review.dto.ReviewDto;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    public record ModerateRequest(boolean hidden, @Size(max = 255) String note) {
    }

    @PostMapping("/api/reviews")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ReviewDto create(@AuthenticationPrincipal User customer, @Valid @RequestBody CreateReviewRequest request) {
        return reviewService.create(customer, request);
    }

    @GetMapping("/api/reviews")
    public List<ReviewDto> list(@RequestParam(required = false) Long productId,
                                @RequestParam(required = false) Long cafeId,
                                @RequestParam(required = false) Long vendorId) {
        if (productId != null) {
            return reviewService.forProduct(productId);
        }
        if (cafeId != null) {
            return reviewService.forCafe(cafeId);
        }
        if (vendorId != null) {
            return reviewService.forVendor(vendorId);
        }
        return List.of();
    }

    /** Whether the signed-in buyer may review this product (verified purchase, not already reviewed). */
    @GetMapping("/api/reviews/eligibility")
    public Eligibility eligibility(@AuthenticationPrincipal User user, @RequestParam Long productId) {
        if (user == null || user.getRole() != Role.CUSTOMER) {
            return new Eligibility(false, "Sign in as a buyer to review products you've received");
        }
        return reviewService.productEligibility(user, productId);
    }

    @GetMapping("/api/vendor/reviews")
    @PreAuthorize("hasRole('SELLER')")
    public List<ReviewDto> forSeller(@AuthenticationPrincipal User seller) {
        return reviewService.forSeller(seller);
    }

    @GetMapping("/api/admin/reviews")
    public PageDto<ReviewDto> adminList(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return reviewService.adminList(page, size);
    }

    @PutMapping("/api/admin/reviews/{id}")
    public ReviewDto moderate(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody ModerateRequest request) {
        return reviewService.setHidden(admin, id, request.hidden(), request.note());
    }
}
