package com.coffeehub.cafe;

import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.cafe.dto.CafeRequest;
import com.coffeehub.common.ApiException;
import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CafeService {

    private final CafeRepository cafeRepository;

    public List<CafeDto> listApproved(String city) {
        List<Cafe> cafes = StringUtils.hasText(city)
                ? cafeRepository.findByApprovedTrueAndCityIgnoreCase(city)
                : cafeRepository.findByApprovedTrue();
        return cafes.stream().map(CafeDto::from).toList();
    }

    public CafeDto get(Long id) {
        return CafeDto.from(findOrThrow(id));
    }

    public List<CafeDto> mine(User owner) {
        return cafeRepository.findByOwner(owner).stream().map(CafeDto::from).toList();
    }

    public CafeDto create(User owner, CafeRequest request) {
        Cafe cafe = Cafe.builder()
                .name(request.name())
                .description(request.description())
                .address(request.address())
                .city(request.city())
                .imageUrl(request.imageUrl())
                .approved(false)
                .owner(owner)
                .build();
        return CafeDto.from(cafeRepository.save(cafe));
    }

    public CafeDto update(User owner, Long id, CafeRequest request) {
        Cafe cafe = findOrThrow(id);
        assertOwner(cafe, owner);

        cafe.setName(request.name());
        cafe.setDescription(request.description());
        cafe.setAddress(request.address());
        cafe.setCity(request.city());
        cafe.setImageUrl(request.imageUrl());
        cafe.setApproved(false);

        return CafeDto.from(cafeRepository.save(cafe));
    }

    public CafeDto setApproved(Long id, boolean approved) {
        Cafe cafe = findOrThrow(id);
        cafe.setApproved(approved);
        return CafeDto.from(cafeRepository.save(cafe));
    }

    private Cafe findOrThrow(Long id) {
        return cafeRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cafe not found"));
    }

    private void assertOwner(Cafe cafe, User owner) {
        if (!cafe.getOwner().getId().equals(owner.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only modify your own cafe");
        }
    }
}
