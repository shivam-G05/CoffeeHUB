package com.coffeehub.order;

import com.coffeehub.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Parent order: what the buyer placed and paid for. Fulfilment happens per vendor in {@link VendorOrder}. */
@Entity
@Table(name = "orders", indexes = {
        @Index(name = "idx_orders_customer", columnList = "customer_id"),
        @Index(name = "idx_orders_number", columnList = "order_number", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Buyer-facing reference, e.g. CH-100001. */
    @Column(name = "order_number")
    private String orderNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id")
    private User customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order")
    @OrderBy("id asc")
    @Builder.Default
    private List<VendorOrder> vendorOrders = new ArrayList<>();

    private BigDecimal itemsSubtotal;
    private BigDecimal shippingTotal;
    /** GST included in the listed prices, recorded separately for reconciliation. */
    private BigDecimal taxTotal;

    @Column(nullable = false)
    private BigDecimal totalAmount;

    /** Summary of the vendor orders' statuses (the least advanced one still in flow). */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private OrderStatus status = OrderStatus.PLACED;

    @Enumerated(EnumType.STRING)
    private Payment.Method paymentMethod;

    @Enumerated(EnumType.STRING)
    private Payment.Status paymentStatus;

    // Checkout contact and address snapshots (not links to the address book, so later edits don't rewrite history)
    private String contactName;
    private String contactPhone;
    private String contactEmail;

    private String shipLine1;
    private String shipLine2;
    private String shipCity;
    private String shipState;
    private String shipPin;

    private String billLine1;
    private String billLine2;
    private String billCity;
    private String billState;
    private String billPin;

    private String gstNumber;

    @Column(length = 1000)
    private String notes;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
