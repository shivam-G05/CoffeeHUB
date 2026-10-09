package com.coffeehub.analytics;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "analytics_event", indexes = @Index(name = "idx_analytics_name_time", columnList = "name,created_at"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String name;

    private Long userId;

    @Column(length = 64)
    private String sessionId;

    /** Small free-form context, e.g. a product id or search term. */
    @Column(length = 500)
    private String detail;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
