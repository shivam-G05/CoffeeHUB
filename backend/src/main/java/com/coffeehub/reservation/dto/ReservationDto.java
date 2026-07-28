package com.coffeehub.reservation.dto;

import com.coffeehub.reservation.Reservation;
import com.coffeehub.reservation.ReservationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record ReservationDto(
        Long id,
        Long cafeId,
        String cafeName,
        Long customerId,
        String customerName,
        String customerPhone,
        LocalDate reservationDate,
        LocalTime reservationTime,
        int partySize,
        String notes,
        ReservationStatus status,
        Instant createdAt
) {
    public static ReservationDto from(Reservation r) {
        return new ReservationDto(
                r.getId(),
                r.getCafe().getId(),
                r.getCafe().getName(),
                r.getCustomer().getId(),
                r.getCustomer().getName(),
                r.getCustomer().getPhone(),
                r.getReservationDate(),
                r.getReservationTime(),
                r.getPartySize(),
                r.getNotes(),
                r.getStatus(),
                r.getCreatedAt()
        );
    }
}
