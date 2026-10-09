package com.coffeehub.order;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class OrderDtos {

    private OrderDtos() {
    }

    /** Who a DTO is being built for; decides which commercial fields are included. */
    public enum View {
        BUYER, VENDOR, ADMIN
    }

    public record AddressDto(String line1, String line2, String city, String state, String pin) {
    }

    public record ItemDto(Long id, Long productId, String productSlug, String productName, String imageUrl,
                          int quantity, BigDecimal unitPrice, BigDecimal lineTotal) {
        public static ItemDto from(OrderItem item) {
            return new ItemDto(
                    item.getId(),
                    item.getProduct().getId(),
                    item.getProduct().getSlug(),
                    item.getProductName() != null ? item.getProductName() : item.getProduct().getName(),
                    item.getProduct().getImageUrl(),
                    item.getQuantity(),
                    item.getUnitPrice(),
                    item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
        }
    }

    /**
     * Buyer view leaves the fee / payable / settlement fields null. Vendor and admin
     * views include them plus the delivery contact needed to ship.
     */
    public record VendorOrderDto(
            Long id,
            String subOrderNumber,
            Long orderId,
            String orderNumber,
            Long vendorId,
            String vendorName,
            String vendorSlug,
            /* Seller's GSTIN and registered address, as needed on an invoice */
            String vendorGstNumber,
            String vendorAddress,
            OrderStatus status,
            List<ItemDto> items,
            BigDecimal itemsSubtotal,
            BigDecimal taxAmount,
            BigDecimal shippingAmount,
            BigDecimal totalAmount,
            BigDecimal refundAmount,
            String courierName,
            String trackingNumber,
            String trackingUrl,
            LocalDate dispatchDate,
            String cancelReason,
            Payment.Method paymentMethod,
            Payment.Status paymentStatus,
            Instant createdAt,
            Instant updatedAt,
            Instant deliveredAt,
            String buyerName,
            String buyerPhone,
            AddressDto shippingAddress,
            String notes,
            BigDecimal platformFee,
            BigDecimal gatewayFee,
            BigDecimal vendorPayable,
            VendorOrder.SettlementStatus settlementStatus
    ) {
    }

    public record OrderDto(
            Long id,
            String orderNumber,
            Long customerId,
            String customerName,
            String contactName,
            String contactPhone,
            String contactEmail,
            AddressDto shippingAddress,
            AddressDto billingAddress,
            String gstNumber,
            String notes,
            BigDecimal itemsSubtotal,
            BigDecimal shippingTotal,
            BigDecimal taxTotal,
            BigDecimal totalAmount,
            OrderStatus status,
            Payment.Method paymentMethod,
            Payment.Status paymentStatus,
            String paymentReference,
            Instant createdAt,
            List<VendorOrderDto> vendorOrders,
            List<ItemDto> items
    ) {
    }

    public record PaymentOptions(List<Payment.Method> methods, boolean onlineIsTestMode, String bankTransferInstructions) {
    }

    // ---------------------------------------------------------------- requests

    public record AddressInput(
            @NotBlank @Size(max = 255) String line1,
            @Size(max = 255) String line2,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 100) String state,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "must be a 6-digit PIN code") String pin
    ) {
    }

    public record CheckoutRequest(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(min = 10, max = 30) String phone,
            @NotBlank @Email @Size(max = 255) String email,
            @NotNull @Valid AddressInput shippingAddress,
            /* null = same as shipping */
            @Valid AddressInput billingAddress,
            @Size(max = 20) String gstNumber,
            @Size(max = 1000) String notes,
            @NotNull Payment.Method paymentMethod
    ) {
    }

    public record CartItemRequest(@NotNull Long productId, @Min(1) int quantity) {
    }

    public record QuantityRequest(@Min(1) int quantity) {
    }

    public record VendorStatusRequest(
            @NotNull OrderStatus status,
            @Size(max = 100) String courierName,
            @Size(max = 100) String trackingNumber,
            @Size(max = 500) String trackingUrl,
            LocalDate dispatchDate,
            @Size(max = 500) String reason
    ) {
    }

    public record ReasonRequest(@Size(max = 500) String reason) {
    }

    public record RefundRequest(@NotNull @DecimalMin(value = "0.01") BigDecimal amount, @Size(max = 500) String reason) {
    }

    public record PaymentConfirmRequest(@Size(max = 100) String reference) {
    }

    public record SettlementRequest(@NotNull Long vendorId, @NotBlank @Size(max = 100) String reference, @Size(max = 500) String note) {
    }
}
