package com.coffeehub.product;

import com.coffeehub.category.Category;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "product", indexes = {
        @Index(name = "idx_product_slug", columnList = "slug", unique = true),
        @Index(name = "idx_product_status", columnList = "status"),
        @Index(name = "idx_product_category", columnList = "category_id"),
        @Index(name = "idx_product_vendor", columnList = "vendor_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String slug;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false)
    private BigDecimal price;

    /** What the price is per: "kg", "pack", "unit"... */
    private String priceUnit;

    /** Minimum order quantity, for B2B listings. Null means no minimum. */
    private Integer moq;

    /** Coarse legacy grouping, derived from the category's attribute group. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProductType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Builder.Default
    private int stock = 0;

    /** Primary image. Further gallery images are in imageUrls. */
    private String imageUrl;

    @ElementCollection
    @CollectionTable(name = "product_image", joinColumns = @JoinColumn(name = "product_id"))
    @OrderColumn(name = "position")
    @Column(name = "url", length = 500)
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    /** Category-specific structured attributes; keys are defined by AttributeSchema. */
    @ElementCollection
    @CollectionTable(name = "product_attribute", joinColumns = @JoinColumn(name = "product_id"))
    @MapKeyColumn(name = "attr_key", length = 60)
    @Column(name = "attr_value", length = 500)
    @Builder.Default
    private Map<String, String> attributes = new HashMap<>();

    // Vendor-managed shipping
    private BigDecimal shippingCharge;
    private Integer dispatchDays;
    private String shipsFrom;

    @Enumerated(EnumType.STRING)
    private ProductStatus status;

    @Column(length = 1000)
    private String rejectionReason;

    /** Mirrors status.isLive(); kept because older rows and queries rely on it. */
    @Builder.Default
    private boolean approved = false;

    @Column(nullable = false)
    @ColumnDefault("false")
    @Builder.Default
    private boolean featured = false;

    @Builder.Default
    private double avgRating = 0;

    @Builder.Default
    private int reviewCount = 0;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_id")
    private User seller;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Builder.Default
    private Instant createdAt = Instant.now();

    public void setStatus(ProductStatus status) {
        this.status = status;
        this.approved = status != null && status.isLive();
    }

    public ProductStatus getStatus() {
        // Rows created before the moderation workflow only have the boolean.
        return status != null ? status : (approved ? ProductStatus.APPROVED : ProductStatus.PENDING);
    }

    /** Live listing from an approved vendor: visible to the public and purchasable (stock permitting). */
    public boolean isPubliclyVisible() {
        return getStatus().isLive() && vendor != null && vendor.isVerified();
    }
}
