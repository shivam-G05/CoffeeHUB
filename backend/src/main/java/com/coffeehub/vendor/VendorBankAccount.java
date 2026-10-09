package com.coffeehub.vendor;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "vendor_bank_account")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorBankAccount {

    /** Any change to bank details drops the account back to PENDING_VERIFICATION, which holds payouts. */
    public enum Status {
        PENDING_VERIFICATION, VERIFIED, REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id", unique = true)
    private Vendor vendor;

    @Column(nullable = false)
    private String accountHolder;

    @Column(nullable = false)
    private String accountNumber;

    @Column(nullable = false)
    private String ifsc;

    private String bankName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING_VERIFICATION;

    @Builder.Default
    private Instant updatedAt = Instant.now();

    private Instant verifiedAt;
}
