package com.coffeehub.product;

/**
 * Listing lifecycle: Vendor DRAFT -> submit -> PENDING -> admin review -> APPROVED / REJECTED.
 * OUT_OF_STOCK is an approved listing with no inventory; SUSPENDED is an admin takedown.
 */
public enum ProductStatus {
    DRAFT,
    PENDING,
    APPROVED,
    REJECTED,
    OUT_OF_STOCK,
    SUSPENDED;

    /** Publicly visible (still subject to the vendor being approved). */
    public boolean isLive() {
        return this == APPROVED || this == OUT_OF_STOCK;
    }
}
