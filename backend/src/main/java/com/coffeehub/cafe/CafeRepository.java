package com.coffeehub.cafe;

import com.coffeehub.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CafeRepository extends JpaRepository<Cafe, Long> {
    List<Cafe> findByApprovedTrue();
    List<Cafe> findByApprovedTrueAndCityIgnoreCase(String city);
    List<Cafe> findByOwner(User owner);
}
