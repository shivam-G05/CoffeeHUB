package com.coffeehub.order;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;

/** One payment per parent order. The provider fields are where a real gateway integration plugs in. */
@Entity
@Table(name = "payment", indexes = @Index(name = "idx_payment_order", columnList = "order_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    public enum Method {
        COD, BANK_TRANSFER, ONLINE
    }

    public enum Status {
        PENDING, PAID, FAILED, PARTIALLY_REFUNDED, REFUNDED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", unique = true)
    private Order order;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Method method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(nullable = false)
    private BigDecimal amount;

    @Builder.Default
    private BigDecimal gatewayFee = BigDecimal.ZERO;

    @Builder.Default
    private BigDecimal refundedAmount = BigDecimal.ZERO;

    /** "manual", "mock", or the gateway name once one is integrated. */
    private String provider;

    /** Gateway payment id / bank reference (UTR). */
    private String providerReference;

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant paidAt;
}
