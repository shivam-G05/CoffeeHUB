package com.coffeehub.dispute;

import com.coffeehub.order.VendorOrder;
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

@Entity
@Table(name = "dispute", indexes = {
        @Index(name = "idx_dispute_vendor_order", columnList = "vendor_order_id"),
        @Index(name = "idx_dispute_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Dispute {

    public enum Reason {
        NOT_RECEIVED, DAMAGED, WRONG_ITEM, QUALITY_ISSUE, QUANTITY_ISSUE, LISTING_MISMATCH, SELLER_UNRESPONSIVE, OTHER
    }

    public enum Status {
        OPEN, VENDOR_RESPONDED, RESOLVED_REFUND, RESOLVED_NO_REFUND
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_order_id")
    private VendorOrder vendorOrder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id")
    private User buyer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Reason reason;

    @Column(nullable = false, length = 2000)
    private String description;

    /** URLs of evidence images uploaded by the buyer. */
    @ElementCollection
    @CollectionTable(name = "dispute_evidence", joinColumns = @JoinColumn(name = "dispute_id"))
    @Column(name = "url", length = 500)
    @Builder.Default
    private List<String> evidenceUrls = new ArrayList<>();

    @Column(length = 2000)
    private String vendorResponse;

    private Instant vendorRespondedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.OPEN;

    /** Admin's recorded resolution. */
    @Column(length = 2000)
    private String resolution;

    private BigDecimal refundAmount;

    @Builder.Default
    private Instant createdAt = Instant.now();

    private Instant resolvedAt;
}
