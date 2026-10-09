package com.coffeehub.rfq;

import com.coffeehub.vendor.VendorDtos.VendorSummary;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class RfqDtos {

    private RfqDtos() {
    }

    public record QuoteDto(
            Long id,
            Long rfqId,
            String rfqTitle,
            Long vendorId,
            String vendorName,
            String vendorSlug,
            boolean vendorVerified,
            double vendorRating,
            int vendorReviewCount,
            String vendorLocation,
            BigDecimal pricePerUnit,
            BigDecimal moq,
            BigDecimal availableQuantity,
            BigDecimal taxPercent,
            BigDecimal shippingCost,
            Integer leadTimeDays,
            LocalDate validUntil,
            BigDecimal sampleCost,
            String notes,
            /* pricePerUnit x RFQ quantity, plus tax and shipping: a like-for-like figure for comparison */
            BigDecimal estimatedTotal,
            Quote.Status status,
            Instant createdAt
    ) {
    }

    public record RfqDto(
            Long id,
            String title,
            Long categoryId,
            String categoryName,
            Long productId,
            String productName,
            String coffeeType,
            String specification,
            BigDecimal quantity,
            String unit,
            BigDecimal targetPrice,
            String deliveryLocation,
            LocalDate requiredBy,
            boolean sampleRequired,
            boolean privateLabelRequired,
            String additionalRequirements,
            Rfq.Status status,
            String adminNote,
            Long selectedQuoteId,
            /* Buyer identity: full for the buyer and admin; company / first name only for vendors */
            String buyerName,
            long invitedCount,
            long quoteCount,
            Instant createdAt,
            /* Buyer and admin: all quotes. Vendor: empty. */
            List<QuoteDto> quotes,
            /* Vendor view only: this vendor's own quote and invitation status. */
            QuoteDto myQuote,
            RfqVendor.Status invitationStatus,
            /* Admin view only */
            List<VendorSummary> invitedVendors
    ) {
    }

    public record RfqRequest(
            @NotBlank @Size(max = 200) String title,
            @NotNull Long categoryId,
            Long productId,
            @Size(max = 100) String coffeeType,
            @Size(max = 1000) String specification,
            @NotNull @DecimalMin(value = "0.01") BigDecimal quantity,
            @NotBlank @Size(max = 30) String unit,
            @DecimalMin(value = "0.0") BigDecimal targetPrice,
            @NotBlank @Size(max = 200) String deliveryLocation,
            @FutureOrPresent LocalDate requiredBy,
            boolean sampleRequired,
            boolean privateLabelRequired,
            @Size(max = 2000) String additionalRequirements
    ) {
    }

    public record QuoteRequest(
            @NotNull @DecimalMin(value = "0.01") BigDecimal pricePerUnit,
            @DecimalMin(value = "0.0") BigDecimal moq,
            @DecimalMin(value = "0.0") BigDecimal availableQuantity,
            @DecimalMin(value = "0.0") BigDecimal taxPercent,
            @DecimalMin(value = "0.0") BigDecimal shippingCost,
            @Min(0) Integer leadTimeDays,
            @FutureOrPresent LocalDate validUntil,
            @DecimalMin(value = "0.0") BigDecimal sampleCost,
            @Size(max = 2000) String notes
    ) {
    }

    public record RouteRequest(@NotEmpty @Size(max = 50) List<Long> vendorIds, @Size(max = 500) String note) {
    }

    public record RejectRequest(@NotBlank @Size(max = 500) String reason) {
    }
}
