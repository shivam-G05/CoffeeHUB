package com.coffeehub.cafe;

import com.coffeehub.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "cafe")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cafe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(length = 2000)
    private String description;

    private String address;

    private String city;

    private String imageUrl;

    @Builder.Default
    private boolean approved = false;

    @Builder.Default
    private double avgRating = 0;

    @Builder.Default
    private int reviewCount = 0;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id")
    private User owner;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
