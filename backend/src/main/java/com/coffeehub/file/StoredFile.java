package com.coffeehub.file;

import com.coffeehub.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Uploaded file stored in the database. Kept in Postgres (rather than on local
 * disk) because the deployment target has an ephemeral filesystem; swap for
 * object storage behind FileService when volumes grow.
 */
@Entity
@Table(name = "stored_file")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoredFile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String contentType;

    private long size;

    /** Public files (product images, logos) are served to anyone; private ones (KYC documents) only to the owner and admins. */
    private boolean publicAccess;

    @Column(nullable = false)
    private byte[] data;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
