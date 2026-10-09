package com.coffeehub.category;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "category", indexes = @Index(name = "idx_category_slug", columnList = "slug", unique = true))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String slug;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AttributeGroup attributeGroup = AttributeGroup.GENERAL;

    /** Platform commission in percent. Null inherits from the parent category, then the platform default. */
    @Column(precision = 5, scale = 2)
    private BigDecimal commissionRate;

    /** GST percent included in listed prices for this category. Null inherits from the parent, then 0. */
    @Column(precision = 5, scale = 2)
    private BigDecimal taxRate;

    private String imageUrl;

    @Builder.Default
    private boolean active = true;

    private boolean featured;

    private int sortOrder;
}
