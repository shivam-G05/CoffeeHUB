package com.coffeehub.reservation.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateReservationRequest(
        @NotNull Long cafeId,
        @NotNull @Future LocalDate reservationDate,
        @NotNull LocalTime reservationTime,
        @Min(1) int partySize,
        String notes
) {
}
