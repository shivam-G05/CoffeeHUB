package com.coffeehub.vendor;

/** Only APPROVED vendors may sell; uploading documents never grants approval on its own. */
public enum VendorStatus {
    DRAFT,
    PENDING_VERIFICATION,
    UNDER_REVIEW,
    APPROVED,
    REJECTED,
    SUSPENDED
}
