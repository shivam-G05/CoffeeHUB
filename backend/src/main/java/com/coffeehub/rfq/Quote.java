package com.coffeehub.rfq;

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

@Entity
@Table(name = "quote",
        uniqueConstraints = @UniqueConstraint(columnNames = {"rfq_id", "vendor_id"}),
        indexes = @Index(name = "idx_quote_vendor", columnList = "vendor_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Quote {

    public enum Status {
        SUBMITTED, ACCEPTED, REJECTED, WITHDRAWN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rfq_id")
    private Rfq rfq;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Column(nullable = false)
    private BigDecimal pricePerUnit;

    private BigDecimal moq;
    private BigDecimal availableQuantity;
    /** GST percent charged on top of the quoted price. */
    private BigDecimal taxPercent;
    private BigDecimal shippingCost;
    private Integer leadTimeDays;
    private LocalDate validUntil;
    private BigDecimal sampleCost;

    @Column(length = 2000)
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.SUBMITTED;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
