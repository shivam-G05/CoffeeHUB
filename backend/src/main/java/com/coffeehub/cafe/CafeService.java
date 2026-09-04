package com.coffeehub.cafe;

import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.common.ApiException;
import com.coffeehub.user.Role;
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

    public CafeDto get(Long id, User viewer) {
        Cafe cafe = findOrThrow(id);
        if (!cafe.isApproved() && !canView(cafe, viewer)) {
            // 404 rather than 403 so an unapproved listing's existence isn't revealed to strangers.
            throw new ApiException(HttpStatus.NOT_FOUND, "Cafe not found");
        }
        return CafeDto.from(cafe);
    }

    private boolean canView(Cafe cafe, User viewer) {
        if (viewer == null) {
            return false;
        }
        boolean isOwner = cafe.getOwner().getId().equals(viewer.getId());
        boolean isAdmin = viewer.getRole() == Role.ADMIN;
        return isOwner || isAdmin;
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
}
