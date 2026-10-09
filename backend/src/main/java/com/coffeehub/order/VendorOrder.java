package com.coffeehub.order;

import com.coffeehub.vendor.Vendor;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * One vendor's share of a parent order (CH-100001-A). Carries its own status,
 * shipping details and the financial breakdown used for commission and settlement.
 */
@Entity
@Table(name = "vendor_order", indexes = {
        @Index(name = "idx_vendor_order_vendor", columnList = "vendor_id"),
        @Index(name = "idx_vendor_order_order", columnList = "order_id"),
        @Index(name = "idx_vendor_order_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorOrder {

    public enum SettlementStatus {
        /** Not yet delivered / paid. */
        PENDING,
        /** Delivered and paid: can be included in the next vendor payout. */
        ELIGIBLE,
        /** Under dispute or refund request. */
        ON_HOLD,
        SETTLED,
        /** Cancelled or fully refunded: nothing to pay out. */
        CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Column(nullable = false)
    private String subOrderNumber;

    @OneToMany(mappedBy = "vendorOrder")
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private OrderStatus status = OrderStatus.PLACED;

    /** Status to return to when a dispute is closed without a refund. */
    @Enumerated(EnumType.STRING)
    private OrderStatus previousStatus;

    // ---- financial ledger (all stored separately so they reconcile)
    @Builder.Default
    private BigDecimal itemsSubtotal = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal taxAmount = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal shippingAmount = BigDecimal.ZERO;
    /** itemsSubtotal + shippingAmount: what the buyer pays for this vendor's part. */
    @Builder.Default
    private BigDecimal totalAmount = BigDecimal.ZERO;
    /** Platform commission, from the per-category configured rates at the time of purchase. */
    @Builder.Default
    private BigDecimal platformFee = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal gatewayFee = BigDecimal.ZERO;
    /** totalAmount - platformFee - gatewayFee - refunds. */
    @Builder.Default
    private BigDecimal vendorPayable = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SettlementStatus settlementStatus = SettlementStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "settlement_id")
    private Settlement settlement;

    // ---- vendor-managed shipping
    private String courierName;
    private String trackingNumber;
    private String trackingUrl;
    private LocalDate dispatchDate;

    @Column(length = 500)
    private String cancelReason;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    private Instant deliveredAt;
}
