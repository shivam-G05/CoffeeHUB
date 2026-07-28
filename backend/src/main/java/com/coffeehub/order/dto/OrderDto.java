package com.coffeehub.order.dto;

import com.coffeehub.order.Order;
import com.coffeehub.order.OrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record OrderDto(
        Long id,
        Long customerId,
        String customerName,
        List<OrderItemDto> items,
        BigDecimal totalAmount,
        OrderStatus status,
        Instant createdAt
) {
    public static OrderDto from(Order order) {
        return new OrderDto(
                order.getId(),
                order.getCustomer().getId(),
                order.getCustomer().getName(),
                order.getItems().stream().map(OrderItemDto::from).toList(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getCreatedAt()
        );
    }
}
