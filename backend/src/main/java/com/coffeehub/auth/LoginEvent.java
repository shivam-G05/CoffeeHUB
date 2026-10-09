package com.coffeehub.auth;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Login history, kept for security review (successful and failed attempts). */
@Entity
@Table(name = "login_event", indexes = @Index(name = "idx_login_event_user", columnList = "user_id,created_at"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    private String identifier;

    private boolean success;

    private String ip;

    @Column(length = 300)
    private String userAgent;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
