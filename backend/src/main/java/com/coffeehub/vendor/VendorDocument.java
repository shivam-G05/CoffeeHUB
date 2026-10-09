package com.coffeehub.vendor;

import com.coffeehub.file.StoredFile;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "vendor_document", indexes = @Index(name = "idx_vendor_document_vendor", columnList = "vendor_id"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VendorDocument {

    public enum Status {
        PENDING, APPROVED, REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocumentType type;

    /** Free-text name, used for CERTIFICATION documents (e.g. "Organic India", "Rainforest Alliance"). */
    private String label;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "file_id")
    private StoredFile file;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    private String reviewNote;

    @Builder.Default
    private Instant uploadedAt = Instant.now();

    private Instant reviewedAt;
}
