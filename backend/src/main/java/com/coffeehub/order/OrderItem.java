package com.coffeehub.order;

import com.coffeehub.product.Product;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "order_item", indexes = @Index(name = "idx_order_item_vendor_order", columnList = "vendor_order_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    /** Null only on orders placed before vendor sub-orders existed. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vendor_order_id")
    private VendorOrder vendorOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    /** Name at the time of purchase, so later listing edits don't change order history. */
    private String productName;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private BigDecimal unitPrice;

    // Rates are snapshotted per line so changing a category's configuration never rewrites past orders.
    private BigDecimal commissionRate;
    private BigDecimal commissionAmount;
    private BigDecimal taxRate;
    private BigDecimal taxAmount;
}
