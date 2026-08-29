package com.coffeehub.cafe;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CafeRepository extends JpaRepository<Cafe, Long> {
    List<Cafe> findByApprovedTrue();
    List<Cafe> findByApprovedTrueAndCityIgnoreCase(String city);
}
