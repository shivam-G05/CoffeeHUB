package com.coffeehub.admin;

import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.user.Role;
import com.coffeehub.user.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return adminService.stats();
    }

    @GetMapping("/users")
    public List<UserDto> users(@RequestParam(required = false) Role role) {
        return adminService.users(role);
    }

    @PutMapping("/users/{id}/toggle")
    public UserDto toggleUser(@PathVariable Long id) {
        return adminService.toggleUser(id);
    }

    @GetMapping("/products")
    public List<ProductDto> allProducts() {
        return adminService.allProducts();
    }

    @GetMapping("/cafes")
    public List<CafeDto> allCafes() {
        return adminService.allCafes();
    }
}
