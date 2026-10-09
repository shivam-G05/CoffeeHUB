package com.coffeehub.messaging;

import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** A buyer-seller thread, optionally attached to an RFQ, a vendor order or a product inquiry. */
@Entity
@Table(name = "conversation", indexes = {
        @Index(name = "idx_conversation_buyer", columnList = "buyer_id"),
        @Index(name = "idx_conversation_vendor", columnList = "vendor_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {

    public enum ContextType {
        GENERAL, PRODUCT, RFQ, ORDER
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "buyer_id")
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendor_id")
    private Vendor vendor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ContextType contextType = ContextType.GENERAL;

    /** Id of the product / RFQ / vendor order this thread is about. */
    private Long contextId;

    @Column(nullable = false)
    private String subject;

    @Column(length = 300)
    private String lastMessagePreview;

    @Builder.Default
    private Instant lastMessageAt = Instant.now();

    private Instant buyerLastReadAt;
    private Instant vendorLastReadAt;

    /** True once any message in the thread tripped the contact-sharing filter. */
    private boolean flagged;

    @Builder.Default
    private Instant createdAt = Instant.now();
}
