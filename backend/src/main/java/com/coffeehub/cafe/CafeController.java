package com.coffeehub.cafe;

import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.cafe.dto.CafeRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cafes")
@RequiredArgsConstructor
public class CafeController {

    private final CafeService cafeService;

    @GetMapping
    public List<CafeDto> list(@RequestParam(required = false) String city) {
        return cafeService.listApproved(city);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CAFE_OWNER')")
    public List<CafeDto> mine(@AuthenticationPrincipal User owner) {
        return cafeService.mine(owner);
    }

    @GetMapping("/{id}")
    public CafeDto get(@PathVariable Long id) {
        return cafeService.get(id);
    }

    @PostMapping
    @PreAuthorize("hasRole('CAFE_OWNER')")
    public CafeDto create(@AuthenticationPrincipal User owner, @Valid @RequestBody CafeRequest request) {
        return cafeService.create(owner, request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('CAFE_OWNER')")
    public CafeDto update(@AuthenticationPrincipal User owner, @PathVariable Long id, @Valid @RequestBody CafeRequest request) {
        return cafeService.update(owner, id, request);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public CafeDto approve(@PathVariable Long id, @RequestParam boolean approved) {
        return cafeService.setApproved(id, approved);
    }
}
