package com.coffeehub.review;

import com.coffeehub.cafe.Cafe;
import com.coffeehub.product.Product;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Entity
@Table(name = "review")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cafe_id")
    private Cafe cafe;

    /** Seller of the reviewed product; lets seller ratings be aggregated separately from product ratings. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    /** Product (or cafe) rating, 1-5. */
    @Column(nullable = false)
    private int rating;

    /** Separate rating for the seller, 1-5. */
    private Integer sellerRating;

    // Optional dimensions
    private Integer qualityRating;
    private Integer packagingRating;
    private Integer deliveryRating;
    private Integer communicationRating;

    @Column(length = 1000)
    private String comment;

    @Column(nullable = false)
    @ColumnDefault("false")
    @Builder.Default
    private boolean verifiedPurchase = false;

    /** Hidden by an admin for abuse, fraud or policy violation; excluded from listings and averages. */
    @Column(nullable = false)
    @ColumnDefault("false")
    @Builder.Default
    private boolean hidden = false;

    private String moderationNote;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
