package com.coffeehub.rfq;

import com.coffeehub.category.Category;
import com.coffeehub.product.Product;
import com.coffeehub.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/** A buyer's sourcing requirement. Flow: SUBMITTED -> admin review -> OPEN to invited vendors -> quotes -> AWARDED. */
@Entity
@Table(name = "rfq", indexes = {
        @Index(name = "idx_rfq_buyer", columnList = "buyer_id"),
        @Index(name = "idx_rfq_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Rfq {

    public enum Status {
        /** Waiting for admin review and routing. */
        SUBMITTED,
        /** Routed to vendors and accepting quotes. */
        OPEN,
        /** Buyer selected a supplier. */
        AWARDED,
        REJECTED,
        CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id")
    private User buyer;

    @Column(nullable = false)
    private String title;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id")
    private Category category;

    /** Set when the RFQ was raised from a product page ("Request Quote"). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    private String coffeeType;

    @Column(length = 1000)
    private String specification;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false)
    private String unit;

    private BigDecimal targetPrice;

    @Column(nullable = false)
    private String deliveryLocation;

    private LocalDate requiredBy;

    private boolean sampleRequired;
    private boolean privateLabelRequired;

    @Column(length = 2000)
    private String additionalRequirements;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.SUBMITTED;

    @Column(length = 500)
    private String adminNote;

    @Column(name = "selected_quote_id")
    private Long selectedQuoteId;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
