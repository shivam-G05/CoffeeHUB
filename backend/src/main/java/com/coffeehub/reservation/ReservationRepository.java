package com.coffeehub.reservation;

import com.coffeehub.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByCustomerOrderByReservationDateDescReservationTimeDesc(User customer);
    List<Reservation> findByCafe_OwnerOrderByReservationDateDescReservationTimeDesc(User owner);
}
