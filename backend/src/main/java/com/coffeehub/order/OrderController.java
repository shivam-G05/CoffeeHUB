package com.coffeehub.order;

import com.coffeehub.common.PageDto;
import com.coffeehub.order.CartService.CartDto;
import com.coffeehub.order.OrderDtos.*;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final CartService cartService;

    public record AdminStatusRequest(@NotNull OrderStatus status, @Size(max = 500) String reason) {
    }

    // ---- cart

    @GetMapping("/api/cart")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto cart(@AuthenticationPrincipal User user) {
        return cartService.get(user);
    }

    @PostMapping("/api/cart/items")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto addToCart(@AuthenticationPrincipal User user, @Valid @RequestBody CartItemRequest request) {
        return cartService.add(user, request.productId(), request.quantity());
    }

    @PutMapping("/api/cart/items/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto setQuantity(@AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody QuantityRequest request) {
        return cartService.setQuantity(user, id, request.quantity());
    }

    @DeleteMapping("/api/cart/items/{id}")
    @PreAuthorize("hasRole('CUSTOMER')")
    public CartDto removeFromCart(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return cartService.remove(user, id);
    }

    // ---- checkout & payment

    @GetMapping("/api/checkout/payment-options")
    public PaymentOptions paymentOptions() {
        return orderService.paymentOptions();
    }

    @PostMapping("/api/checkout")
    @PreAuthorize("hasRole('CUSTOMER')")
    public OrderDto checkout(@AuthenticationPrincipal User buyer, @Valid @RequestBody CheckoutRequest request) {
        return orderService.checkout(buyer, request);
    }

    @PostMapping("/api/orders/{id}/pay")
    @PreAuthorize("hasRole('CUSTOMER')")
    public OrderDto pay(@AuthenticationPrincipal User buyer, @PathVariable Long id) {
        return orderService.payOnlineMock(buyer, id);
    }

    // ---- buyer

    @GetMapping("/api/orders/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PageDto<OrderDto> mine(@AuthenticationPrincipal User buyer,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "10") int size) {
        return orderService.myOrders(buyer, page, size);
    }

    @GetMapping("/api/orders/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN')")
    public OrderDto get(@AuthenticationPrincipal User viewer, @PathVariable Long id) {
        return orderService.get(viewer, id);
    }

    @PostMapping("/api/orders/vendor-orders/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public OrderDto cancel(@AuthenticationPrincipal User buyer, @PathVariable Long id, @Valid @RequestBody(required = false) ReasonRequest request) {
        return orderService.cancelByBuyer(buyer, id, request == null ? null : request.reason());
    }

    @PostMapping("/api/orders/vendor-orders/{id}/confirm-delivery")
    @PreAuthorize("hasRole('CUSTOMER')")
    public OrderDto confirmDelivery(@AuthenticationPrincipal User buyer, @PathVariable Long id) {
        return orderService.confirmDelivery(buyer, id);
    }

    // ---- vendor: only ever their own sub-orders

    @GetMapping("/api/vendor/orders")
    @PreAuthorize("hasRole('SELLER')")
    public PageDto<VendorOrderDto> vendorOrders(@AuthenticationPrincipal User seller,
                                                @RequestParam(required = false) OrderStatus status,
                                                @RequestParam(defaultValue = "0") int page,
                                                @RequestParam(defaultValue = "10") int size) {
        return orderService.vendorOrders(seller, status, page, size);
    }

    @GetMapping("/api/vendor/orders/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public VendorOrderDto vendorOrder(@AuthenticationPrincipal User seller, @PathVariable Long id) {
        return orderService.vendorOrder(seller, id);
    }

    @PutMapping("/api/vendor/orders/{id}/status")
    @PreAuthorize("hasRole('SELLER')")
    public VendorOrderDto vendorUpdate(@AuthenticationPrincipal User seller, @PathVariable Long id, @Valid @RequestBody VendorStatusRequest request) {
        return orderService.vendorUpdate(seller, id, request);
    }

    // ---- admin (/api/admin/** is ADMIN-only in SecurityConfig)

    @GetMapping("/api/admin/orders")
    public PageDto<OrderDto> adminOrders(@RequestParam(required = false) String q,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return orderService.adminOrders(q, page, size);
    }

    @PutMapping("/api/admin/vendor-orders/{id}/status")
    public OrderDto adminSetStatus(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody AdminStatusRequest request) {
        return orderService.adminSetStatus(admin, id, request.status(), request.reason());
    }

    @PostMapping("/api/admin/vendor-orders/{id}/refund")
    public OrderDto adminRefund(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody RefundRequest request) {
        return orderService.adminRefund(admin, id, request.amount(), request.reason());
    }

    @PostMapping("/api/admin/orders/{id}/confirm-payment")
    public OrderDto adminConfirmPayment(@AuthenticationPrincipal User admin, @PathVariable Long id,
                                        @Valid @RequestBody(required = false) PaymentConfirmRequest request) {
        return orderService.adminConfirmPayment(admin, id, request == null ? null : request.reference());
    }
}
