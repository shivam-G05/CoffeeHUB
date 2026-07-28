package com.coffeehub.order.dto;

import com.coffeehub.order.OrderStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(@NotNull OrderStatus status) {
}
