package com.coffeehub.reservation.dto;

import com.coffeehub.reservation.ReservationStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateReservationStatusRequest(@NotNull ReservationStatus status) {
}
