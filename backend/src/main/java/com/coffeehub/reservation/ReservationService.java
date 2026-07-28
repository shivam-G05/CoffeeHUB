package com.coffeehub.reservation;

import com.coffeehub.cafe.Cafe;
import com.coffeehub.cafe.CafeRepository;
import com.coffeehub.common.ApiException;
import com.coffeehub.reservation.dto.CreateReservationRequest;
import com.coffeehub.reservation.dto.ReservationDto;
import com.coffeehub.reservation.dto.UpdateReservationStatusRequest;
import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final CafeRepository cafeRepository;

    public ReservationDto create(User customer, CreateReservationRequest request) {
        Cafe cafe = cafeRepository.findById(request.cafeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cafe not found"));
        if (!cafe.isApproved()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This cafe isn't accepting reservations yet");
        }

        Reservation reservation = Reservation.builder()
                .cafe(cafe)
                .customer(customer)
                .reservationDate(request.reservationDate())
                .reservationTime(request.reservationTime())
                .partySize(request.partySize())
                .notes(request.notes())
                .build();

        return ReservationDto.from(reservationRepository.save(reservation));
    }

    public List<ReservationDto> mine(User customer) {
        return reservationRepository.findByCustomerOrderByReservationDateDescReservationTimeDesc(customer)
                .stream().map(ReservationDto::from).toList();
    }

    public List<ReservationDto> forCafeOwner(User owner) {
        return reservationRepository.findByCafe_OwnerOrderByReservationDateDescReservationTimeDesc(owner)
                .stream().map(ReservationDto::from).toList();
    }

    public ReservationDto updateStatus(User requester, Long id, UpdateReservationStatusRequest request) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Reservation not found"));

        boolean isAdmin = requester.getRole().name().equals("ADMIN");
        boolean isCafeOwner = reservation.getCafe().getOwner().getId().equals(requester.getId());
        if (!isAdmin && !isCafeOwner) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot update this reservation");
        }

        reservation.setStatus(request.status());
        return ReservationDto.from(reservationRepository.save(reservation));
    }
}
