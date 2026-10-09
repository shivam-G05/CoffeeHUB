package com.coffeehub.vendor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class VendorDtos {

    private VendorDtos() {
    }

    /** Public card shown in the supplier directory, search results and product pages. */
    public record VendorSummary(
            Long id,
            String businessName,
            String slug,
            VendorType vendorType,
            String vendorTypeLabel,
            String city,
            String state,
            String logoUrl,
            boolean verified,
            boolean featured,
            double avgRating,
            int reviewCount,
            long productCount,
            Instant memberSince
    ) {
        public static VendorSummary from(Vendor v, long productCount) {
            return new VendorSummary(v.getId(), v.getBusinessName(), v.getSlug(), v.getVendorType(),
                    v.getVendorType() != null ? v.getVendorType().label() : null,
                    v.getCity(), v.getState(), v.getLogoUrl(), v.isVerified(), v.isFeatured(),
                    v.getAvgRating(), v.getReviewCount(), productCount, v.getCreatedAt());
        }
    }

    /** Public storefront: summary plus company profile. Never includes contact details or documents. */
    public record Storefront(
            VendorSummary summary,
            String about,
            String website,
            List<String> certifications,
            Double avgResponseHours
    ) {
    }

    public record DocumentDto(Long id, DocumentType type, String label, String fileId, String fileName,
                              VendorDocument.Status status, String reviewNote, Instant uploadedAt) {
        public static DocumentDto from(VendorDocument d) {
            return new DocumentDto(d.getId(), d.getType(), d.getLabel(), d.getFile().getId().toString(),
                    d.getFile().getFileName(), d.getStatus(), d.getReviewNote(), d.getUploadedAt());
        }
    }

    public record BankDto(String accountHolder, String accountNumber, String ifsc, String bankName,
                          VendorBankAccount.Status status, Instant updatedAt) {
        public static BankDto from(VendorBankAccount b, boolean maskNumber) {
            String number = b.getAccountNumber();
            if (maskNumber && number.length() > 4) {
                number = "•".repeat(number.length() - 4) + number.substring(number.length() - 4);
            }
            return new BankDto(b.getAccountHolder(), number, b.getIfsc(), b.getBankName(), b.getStatus(), b.getUpdatedAt());
        }
    }

    /** Full onboarding record, for the vendor themself and for admins. */
    public record VendorProfile(
            Long id,
            Long userId,
            String businessName,
            String slug,
            String contactPerson,
            String email,
            String phone,
            VendorType vendorType,
            String website,
            String addressLine,
            String city,
            String state,
            String pin,
            String gstNumber,
            String panNumber,
            String about,
            String logoUrl,
            VendorStatus status,
            String statusReason,
            boolean featured,
            double avgRating,
            int reviewCount,
            Instant submittedAt,
            Instant approvedAt,
            Instant createdAt,
            List<DocumentDto> documents,
            BankDto bank,
            List<String> missingRequirements
    ) {
    }

    public record ProfileRequest(
            @NotBlank @Size(max = 255) String businessName,
            @NotBlank @Size(max = 255) String contactPerson,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 30) String phone,
            @NotNull VendorType vendorType,
            @Size(max = 255) String website,
            @NotBlank @Size(max = 500) String addressLine,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 100) String state,
            @NotBlank @Pattern(regexp = "\\d{6}", message = "must be a 6-digit PIN code") String pin,
            @Size(max = 20) String gstNumber,
            @Size(max = 20) String panNumber,
            @Size(max = 3000) String about,
            @Size(max = 500) String logoUrl
    ) {
    }

    public record DocumentRequest(@NotNull DocumentType type, @Size(max = 100) String label, @NotNull UUID fileId) {
    }

    public record BankRequest(
            @NotBlank @Size(max = 255) String accountHolder,
            @NotBlank @Pattern(regexp = "\\d{6,20}", message = "must be 6-20 digits") String accountNumber,
            @NotBlank @Pattern(regexp = "[A-Za-z]{4}0[A-Za-z0-9]{6}", message = "must be a valid IFSC code") String ifsc,
            @Size(max = 255) String bankName
    ) {
    }

    public record StatusRequest(@NotNull VendorStatus status, @Size(max = 1000) String reason) {
    }

    public record DocumentReviewRequest(@NotNull VendorDocument.Status status, @Size(max = 255) String note) {
    }

    public record BankReviewRequest(@NotNull VendorBankAccount.Status status) {
    }
}
