package com.coffeehub.reservation;

import com.coffeehub.reservation.dto.CreateReservationRequest;
import com.coffeehub.reservation.dto.ReservationDto;
import com.coffeehub.reservation.dto.UpdateReservationStatusRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ReservationDto create(@AuthenticationPrincipal User customer, @Valid @RequestBody CreateReservationRequest request) {
        return reservationService.create(customer, request);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<ReservationDto> mine(@AuthenticationPrincipal User customer) {
        return reservationService.mine(customer);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ReservationDto updateStatus(@PathVariable Long id, @Valid @RequestBody UpdateReservationStatusRequest request) {
        return reservationService.updateStatus(id, request);
    }
}
