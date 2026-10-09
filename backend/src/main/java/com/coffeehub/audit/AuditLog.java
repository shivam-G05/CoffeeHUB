package com.coffeehub.audit;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "idx_audit_created", columnList = "created_at"),
        @Index(name = "idx_audit_entity", columnList = "entity_type,entity_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long actorId;
    private String actorEmail;
    private String actorRole;

    @Column(nullable = false)
    private String action;

    private String entityType;
    private String entityId;

    @Column(length = 2000)
    private String details;

    private String ip;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
