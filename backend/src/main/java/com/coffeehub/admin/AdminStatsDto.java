package com.coffeehub.admin;

import java.math.BigDecimal;

public record AdminStatsDto(
        long totalCustomers,
        long totalSellers,
        long totalCafeOwners,
        long totalProducts,
        long pendingProductApprovals,
        long totalCafes,
        long pendingCafeApprovals,
        long totalOrders,
        BigDecimal totalRevenue
) {
}
