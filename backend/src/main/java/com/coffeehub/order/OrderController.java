package com.coffeehub.order;

import com.coffeehub.order.dto.CreateOrderRequest;
import com.coffeehub.order.dto.OrderDto;
import com.coffeehub.order.dto.UpdateStatusRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public OrderDto create(@AuthenticationPrincipal User customer, @Valid @RequestBody CreateOrderRequest request) {
        return orderService.create(customer, request);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<OrderDto> mine(@AuthenticationPrincipal User customer) {
        return orderService.mine(customer);
    }

    @GetMapping("/seller")
    @PreAuthorize("hasRole('SELLER')")
    public List<OrderDto> forSeller(@AuthenticationPrincipal User seller) {
        return orderService.forSeller(seller);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<OrderDto> all() {
        return orderService.all();
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public OrderDto updateStatus(@AuthenticationPrincipal User requester, @PathVariable Long id, @Valid @RequestBody UpdateStatusRequest request) {
        return orderService.updateStatus(requester, id, request);
    }
}
