package com.coffeehub.review;

import com.coffeehub.audit.AuditService;
import com.coffeehub.cafe.Cafe;
import com.coffeehub.cafe.CafeRepository;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.order.OrderRepositories.OrderItemRepository;
import com.coffeehub.order.OrderStatus;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.review.dto.CreateReviewRequest;
import com.coffeehub.review.dto.ReviewDto;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private static final Set<OrderStatus> RECEIVED = EnumSet.of(OrderStatus.DELIVERED, OrderStatus.COMPLETED);

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final CafeRepository cafeRepository;
    private final OrderItemRepository orderItemRepository;
    private final VendorService vendorService;
    private final AuditService auditService;

    public record Eligibility(boolean canReview, String reason) {
    }

    public ReviewDto create(User customer, CreateReviewRequest request) {
        boolean hasProduct = request.productId() != null;
        boolean hasCafe = request.cafeId() != null;
        if (hasProduct == hasCafe) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Review must target exactly one product or cafe");
        }

        Review.ReviewBuilder review = Review.builder()
                .customer(customer)
                .rating(request.rating())
                .comment(request.comment());

        if (hasProduct) {
            Eligibility eligibility = productEligibility(customer, request.productId());
            if (!eligibility.canReview()) {
                throw new ApiException(HttpStatus.FORBIDDEN, eligibility.reason());
            }
            Product product = productRepository.findById(request.productId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
            Review saved = reviewRepository.save(review
                    .product(product)
                    .vendor(product.getVendor())
                    .verifiedPurchase(true)
                    .sellerRating(request.sellerRating())
                    .qualityRating(request.qualityRating())
                    .packagingRating(request.packagingRating())
                    .deliveryRating(request.deliveryRating())
                    .communicationRating(request.communicationRating())
                    .build());
            recalcProductRating(product);
            recalcVendorRating(product.getVendor());
            return ReviewDto.from(saved);
        } else {
            if (reviewRepository.existsByCafeIdAndCustomerId(request.cafeId(), customer.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "You've already reviewed this cafe");
            }
            Cafe cafe = cafeRepository.findById(request.cafeId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cafe not found"));
            review.cafe(cafe);
            Review saved = reviewRepository.save(review.build());
            recalcCafeRating(cafe);
            return ReviewDto.from(saved);
        }
    }

    /** Product reviews are restricted to buyers whose order of that product has been delivered. */
    @Transactional(readOnly = true)
    public Eligibility productEligibility(User customer, Long productId) {
        if (reviewRepository.existsByProductIdAndCustomerId(productId, customer.getId())) {
            return new Eligibility(false, "You've already reviewed this product");
        }
        if (!orderItemRepository.hasPurchased(productId, customer.getId(), RECEIVED)) {
            return new Eligibility(false, "Only buyers who have received this product can review it");
        }
        return new Eligibility(true, null);
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> forProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        return reviewRepository.findByProductAndHiddenFalseOrderByCreatedAtDesc(product).stream().map(ReviewDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> forCafe(Long cafeId) {
        Cafe cafe = cafeRepository.findById(cafeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cafe not found"));
        return reviewRepository.findByCafeAndHiddenFalseOrderByCreatedAtDesc(cafe).stream().map(ReviewDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> forVendor(Long vendorId) {
        return reviewRepository.findByVendorIdAndHiddenFalseOrderByCreatedAtDesc(vendorId).stream().map(ReviewDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<ReviewDto> forSeller(User seller) {
        return forVendor(vendorService.requireForUser(seller).getId());
    }

    // ---------------------------------------------------------------- admin moderation

    @Transactional(readOnly = true)
    public PageDto<ReviewDto> adminList(int page, int size) {
        return PageDto.from(reviewRepository.findAllByOrderByCreatedAtDesc(PageDto.request(page, size, Sort.unsorted())), ReviewDto::from);
    }

    public ReviewDto setHidden(User admin, Long id, boolean hidden, String note) {
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Review not found"));
        review.setHidden(hidden);
        review.setModerationNote(note == null || note.isBlank() ? null : note.trim());
        reviewRepository.flush();
        if (review.getProduct() != null) {
            recalcProductRating(review.getProduct());
        }
        if (review.getVendor() != null) {
            recalcVendorRating(review.getVendor());
        }
        if (review.getCafe() != null) {
            recalcCafeRating(review.getCafe());
        }
        auditService.log(admin, hidden ? "REVIEW_HIDDEN" : "REVIEW_RESTORED", "Review", id, note);
        return ReviewDto.from(review);
    }

    // ---------------------------------------------------------------- aggregates (hidden reviews never count)

    private void recalcProductRating(Product product) {
        List<Review> reviews = reviewRepository.findByProductAndHiddenFalseOrderByCreatedAtDesc(product);
        product.setAvgRating(round(reviews.stream().mapToInt(Review::getRating).average().orElse(0)));
        product.setReviewCount(reviews.size());
    }

    private void recalcVendorRating(Vendor vendor) {
        if (vendor == null) {
            return;
        }
        List<Review> reviews = reviewRepository.findByVendorIdAndHiddenFalseOrderByCreatedAtDesc(vendor.getId());
        vendor.setAvgRating(round(reviews.stream()
                .mapToInt(r -> r.getSellerRating() != null ? r.getSellerRating() : r.getRating())
                .average().orElse(0)));
        vendor.setReviewCount(reviews.size());
    }

    private void recalcCafeRating(Cafe cafe) {
        List<Review> reviews = reviewRepository.findByCafeAndHiddenFalseOrderByCreatedAtDesc(cafe);
        cafe.setAvgRating(round(reviews.stream().mapToInt(Review::getRating).average().orElse(0)));
        cafe.setReviewCount(reviews.size());
    }

    private static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}
