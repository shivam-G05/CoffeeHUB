package com.coffeehub.review;

import com.coffeehub.cafe.Cafe;
import com.coffeehub.cafe.CafeRepository;
import com.coffeehub.common.ApiException;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.review.dto.CreateReviewRequest;
import com.coffeehub.review.dto.ReviewDto;
import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final CafeRepository cafeRepository;

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
            if (reviewRepository.existsByProductIdAndCustomerId(request.productId(), customer.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "You've already reviewed this product");
            }
            Product product = productRepository.findById(request.productId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
            review.product(product);
            Review saved = reviewRepository.save(review.build());
            recalcProductRating(product);
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

    public List<ReviewDto> forProduct(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        return reviewRepository.findByProductOrderByCreatedAtDesc(product).stream().map(ReviewDto::from).toList();
    }

    public List<ReviewDto> forCafe(Long cafeId) {
        Cafe cafe = cafeRepository.findById(cafeId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cafe not found"));
        return reviewRepository.findByCafeOrderByCreatedAtDesc(cafe).stream().map(ReviewDto::from).toList();
    }

    private void recalcProductRating(Product product) {
        List<Review> reviews = reviewRepository.findByProductOrderByCreatedAtDesc(product);
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
        product.setAvgRating(Math.round(avg * 10.0) / 10.0);
        product.setReviewCount(reviews.size());
        productRepository.save(product);
    }

    private void recalcCafeRating(Cafe cafe) {
        List<Review> reviews = reviewRepository.findByCafeOrderByCreatedAtDesc(cafe);
        double avg = reviews.stream().mapToInt(Review::getRating).average().orElse(0);
        cafe.setAvgRating(Math.round(avg * 10.0) / 10.0);
        cafe.setReviewCount(reviews.size());
        cafeRepository.save(cafe);
    }
}
