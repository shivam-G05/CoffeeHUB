package com.coffeehub.rfq;

import com.coffeehub.vendor.Vendor;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** An invitation for one vendor to quote on an RFQ (admin-assisted matching). */
@Entity
@Table(name = "rfq_vendor", uniqueConstraints = @UniqueConstraint(columnNames = {"rfq_id", "vendor_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RfqVendor {

    public enum Status {
        INVITED, QUOTED, DECLINED
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.INVITED;

    @Builder.Default
    private Instant invitedAt = Instant.now();
}
