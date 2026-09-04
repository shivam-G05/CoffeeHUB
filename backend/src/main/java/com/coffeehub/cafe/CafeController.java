package com.coffeehub.cafe;

import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.user.User;
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

    @GetMapping("/{id}")
    public CafeDto get(@PathVariable Long id, @AuthenticationPrincipal User viewer) {
        return cafeService.get(id, viewer);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public CafeDto approve(@PathVariable Long id, @RequestParam boolean approved) {
        return cafeService.setApproved(id, approved);
    }
}
