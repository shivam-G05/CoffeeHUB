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

/** A payout to one vendor covering a batch of eligible vendor orders. */
@Entity
@Table(name = "settlement", indexes = @Index(name = "idx_settlement_vendor", columnList = "vendor_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Column(nullable = false)
    private BigDecimal amount;

    private int orderCount;

    /** Bank transfer reference (UTR) for the payout. */
    private String reference;

    @Column(length = 500)
    private String note;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
