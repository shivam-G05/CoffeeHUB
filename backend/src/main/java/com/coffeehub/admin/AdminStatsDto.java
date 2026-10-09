package com.coffeehub.admin;

import java.math.BigDecimal;

/** Admin KPIs. GMV and revenue exclude cancelled and fully refunded vendor orders. */
public record AdminStatsDto(
        BigDecimal gmv,
        BigDecimal platformRevenue,
        long totalOrders,
        BigDecimal averageOrderValue,
        long activeVendors,
        long pendingVendors,
        long totalProducts,
        long pendingProducts,
        long totalRfqs,
        long totalQuotes,
        /* Percentage of submitted quotes that a buyer accepted */
        double quoteAcceptanceRate,
        long openDisputes,
        BigDecimal refundTotal,
        long totalCustomers,
        long totalSellers,
        long totalCafes,
        long pendingCafeApprovals
) {
}
