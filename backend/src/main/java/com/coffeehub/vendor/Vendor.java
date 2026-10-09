package com.coffeehub.vendor;

import com.coffeehub.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A seller's business: onboarding/verification record and public storefront in one. */
@Entity
@Table(name = "vendor", indexes = {
        @Index(name = "idx_vendor_slug", columnList = "slug", unique = true),
        @Index(name = "idx_vendor_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Vendor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(nullable = false)
    private String businessName;

    @Column(nullable = false)
    private String slug;

    private String contactPerson;
    private String email;
    private String phone;

    @Enumerated(EnumType.STRING)
    private VendorType vendorType;

    private String website;
    private String addressLine;
    private String city;
    private String state;
    private String pin;
    private String gstNumber;
    private String panNumber;

    @Column(length = 3000)
    private String about;

    private String logoUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private VendorStatus status = VendorStatus.DRAFT;

    /** Reason given by admin for the latest rejection / suspension. */
    @Column(length = 1000)
    private String statusReason;

    private boolean featured;

    @Builder.Default
    private double avgRating = 0;

    @Builder.Default
    private int reviewCount = 0;

    /** Rolling average of how long this vendor takes to reply to buyer messages. */
    private Double avgResponseHours;

    private Instant submittedAt;
    private Instant approvedAt;

    @Builder.Default
    private Instant createdAt = Instant.now();

    public boolean isVerified() {
        return status == VendorStatus.APPROVED;
    }
}
