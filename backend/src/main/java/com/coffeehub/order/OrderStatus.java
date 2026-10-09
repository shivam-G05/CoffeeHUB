package com.coffeehub.order;

/**
 * PLACED -> PAYMENT_CONFIRMED -> ACCEPTED -> PROCESSING -> READY_TO_SHIP -> SHIPPED -> DELIVERED -> COMPLETED,
 * with exception states CANCELLED, REFUND_REQUESTED, REFUNDED and DISPUTED.
 * PENDING and CONFIRMED only exist on orders created before the multi-vendor order model.
 */
public enum OrderStatus {
    PLACED(0),
    PAYMENT_CONFIRMED(1),
    ACCEPTED(2),
    PROCESSING(3),
    READY_TO_SHIP(4),
    SHIPPED(5),
    DELIVERED(6),
    COMPLETED(7),
    CANCELLED(-1),
    REFUND_REQUESTED(-1),
    REFUNDED(-1),
    DISPUTED(-1),
    PENDING(0),
    CONFIRMED(2);

    private final int progress;

    OrderStatus(int progress) {
        this.progress = progress;
    }

    /** Position in the normal fulfilment flow, or -1 for exception states. */
    public int progress() {
        return progress;
    }

    public boolean isInFlow() {
        return progress >= 0;
    }
}
