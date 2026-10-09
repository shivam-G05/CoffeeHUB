package com.coffeehub.content;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** CMS content that business users manage without a developer: banners, FAQs, articles, policy pages, footer links. */
@Entity
@Table(name = "content_block", indexes = @Index(name = "idx_content_type_slug", columnList = "type,slug"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentBlock {

    public enum Type {
        BANNER, FAQ, ARTICLE, POLICY, FOOTER_LINK
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    /** URL slug for ARTICLE and POLICY pages. */
    private String slug;

    @Column(nullable = false)
    private String title;

    /** Plain text; rendered with paragraph breaks, never as HTML. */
    @Column(length = 20000)
    private String body;

    private String imageUrl;
    private String linkUrl;

    private int sortOrder;

    @Builder.Default
    private boolean active = true;

    @Builder.Default
    private Instant updatedAt = Instant.now();
}
