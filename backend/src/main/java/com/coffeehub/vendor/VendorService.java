package com.coffeehub.vendor;

import com.coffeehub.audit.AuditService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.common.Slugs;
import com.coffeehub.file.StoredFile;
import com.coffeehub.file.StoredFileRepository;
import com.coffeehub.notification.NotificationService;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.product.ProductStatus;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.vendor.VendorDtos.*;
import com.coffeehub.vendor.VendorRepositories.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class VendorService {

    private static final Set<ProductStatus> LIVE = EnumSet.of(ProductStatus.APPROVED, ProductStatus.OUT_OF_STOCK);

    private final VendorRepository vendorRepository;
    private final VendorDocumentRepository documentRepository;
    private final VendorBankAccountRepository bankRepository;
    private final SavedSupplierRepository savedSupplierRepository;
    private final StoredFileRepository storedFileRepository;
    private final ProductRepository productRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    // ---------------------------------------------------------------- vendor self-service

    public Vendor createDraft(User user, String businessName) {
        return vendorRepository.save(Vendor.builder()
                .user(user)
                .businessName(businessName)
                .slug(Slugs.unique(businessName, vendorRepository::existsBySlug))
                .contactPerson(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .build());
    }

    /** Every SELLER account has exactly one vendor record; accounts created before onboarding existed get a DRAFT one. */
    public Vendor requireForUser(User user) {
        if (user.getRole() != Role.SELLER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Only seller accounts have a vendor profile");
        }
        return vendorRepository.findByUserId(user.getId()).orElseGet(() -> createDraft(user, user.getName()));
    }

    public VendorProfile myProfile(User user) {
        return profile(requireForUser(user), true);
    }

    public VendorProfile updateProfile(User user, ProfileRequest req) {
        Vendor vendor = requireForUser(user);
        vendor.setBusinessName(req.businessName().trim());
        vendor.setContactPerson(req.contactPerson().trim());
        vendor.setEmail(req.email().trim().toLowerCase());
        vendor.setPhone(req.phone().trim());
        vendor.setVendorType(req.vendorType());
        vendor.setWebsite(blankToNull(req.website()));
        vendor.setAddressLine(req.addressLine().trim());
        vendor.setCity(req.city().trim());
        vendor.setState(req.state().trim());
        vendor.setPin(req.pin());
        vendor.setGstNumber(blankToNull(req.gstNumber()));
        vendor.setPanNumber(blankToNull(req.panNumber()));
        vendor.setAbout(blankToNull(req.about()));
        vendor.setLogoUrl(blankToNull(req.logoUrl()));
        if (vendor.getStatus() == VendorStatus.APPROVED) {
            auditService.log(user, "VENDOR_PROFILE_EDITED", "Vendor", vendor.getId(), "Approved vendor edited business profile");
        }
        return profile(vendor, true);
    }

    public VendorProfile addDocument(User user, DocumentRequest req) {
        Vendor vendor = requireForUser(user);
        StoredFile file = storedFileRepository.findById(req.fileId())
                .filter(f -> f.getOwner().getId().equals(user.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Uploaded file not found"));
        if (file.isPublicAccess()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Verification documents must be uploaded as private files");
        }
        documentRepository.save(VendorDocument.builder()
                .vendor(vendor)
                .type(req.type())
                .label(blankToNull(req.label()))
                .file(file)
                .build());
        auditService.log(user, "VENDOR_DOCUMENT_UPLOADED", "Vendor", vendor.getId(), req.type().name());
        return profile(vendor, true);
    }

    public VendorProfile removeDocument(User user, Long documentId) {
        Vendor vendor = requireForUser(user);
        VendorDocument doc = documentRepository.findByIdAndVendorId(documentId, vendor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Document not found"));
        if (doc.getStatus() == VendorDocument.Status.APPROVED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Approved documents cannot be removed; upload a replacement instead");
        }
        documentRepository.delete(doc);
        documentRepository.flush();
        return profile(vendor, true);
    }

    public VendorProfile saveBank(User user, BankRequest req) {
        Vendor vendor = requireForUser(user);
        VendorBankAccount bank = bankRepository.findByVendorId(vendor.getId())
                .orElseGet(() -> VendorBankAccount.builder().vendor(vendor).build());
        boolean isChange = bank.getId() != null;
        bank.setAccountHolder(req.accountHolder().trim());
        bank.setAccountNumber(req.accountNumber());
        bank.setIfsc(req.ifsc().toUpperCase());
        bank.setBankName(blankToNull(req.bankName()));
        // Changed bank details must be re-verified before any further payout.
        bank.setStatus(VendorBankAccount.Status.PENDING_VERIFICATION);
        bank.setVerifiedAt(null);
        bank.setUpdatedAt(Instant.now());
        bankRepository.save(bank);
        auditService.log(user, isChange ? "VENDOR_BANK_CHANGED" : "VENDOR_BANK_ADDED", "Vendor", vendor.getId(),
                "Payouts on hold until bank details are verified");
        if (isChange) {
            notificationService.notifyAdmins("VENDOR_BANK_CHANGED", "Bank details changed: " + vendor.getBusinessName(),
                    "Payouts are on hold until the new account is verified.", "/admin/vendors/" + vendor.getId());
        }
        return profile(vendor, true);
    }

    public VendorProfile submit(User user) {
        Vendor vendor = requireForUser(user);
        if (vendor.getStatus() != VendorStatus.DRAFT && vendor.getStatus() != VendorStatus.REJECTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your application has already been submitted");
        }
        List<String> missing = missingRequirements(vendor);
        if (!missing.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Complete these before submitting: " + String.join(", ", missing));
        }
        vendor.setStatus(VendorStatus.PENDING_VERIFICATION);
        vendor.setStatusReason(null);
        vendor.setSubmittedAt(Instant.now());
        auditService.log(user, "VENDOR_SUBMITTED", "Vendor", vendor.getId(), null);
        notificationService.notifyAdmins("VENDOR_SUBMITTED", "New vendor awaiting verification",
                vendor.getBusinessName() + " submitted their documents for review.", "/admin/vendors/" + vendor.getId());
        return profile(vendor, true);
    }

    // ---------------------------------------------------------------- public directory

    @Transactional(readOnly = true)
    public PageDto<VendorSummary> directory(String q, VendorType type, String state, int page, int size) {
        Specification<Vendor> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("status"), VendorStatus.APPROVED));
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("businessName")), like),
                        cb.like(cb.lower(root.get("city")), like),
                        cb.like(cb.lower(root.get("state")), like)));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("vendorType"), type));
            }
            if (state != null && !state.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("state")), state.trim().toLowerCase()));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        Sort sort = Sort.by(Sort.Order.desc("featured"), Sort.Order.desc("avgRating"), Sort.Order.asc("businessName"));
        return PageDto.from(vendorRepository.findAll(spec, PageDto.request(page, size, sort)), this::summary);
    }

    @Transactional(readOnly = true)
    public List<VendorSummary> featured() {
        return vendorRepository.findByStatusAndFeaturedTrue(VendorStatus.APPROVED).stream().map(this::summary).toList();
    }

    @Transactional(readOnly = true)
    public Storefront storefront(String slug) {
        Vendor vendor = vendorRepository.findBySlug(slug)
                .filter(Vendor::isVerified)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Supplier not found"));
        List<String> certifications = documentRepository.findByVendorIdOrderByUploadedAtDesc(vendor.getId()).stream()
                .filter(d -> d.getStatus() == VendorDocument.Status.APPROVED)
                .map(this::certificationLabel)
                .filter(label -> label != null)
                .distinct()
                .toList();
        return new Storefront(summary(vendor), vendor.getAbout(), vendor.getWebsite(), certifications, vendor.getAvgResponseHours());
    }

    public VendorSummary summary(Vendor vendor) {
        return VendorSummary.from(vendor, productRepository.countByVendorIdAndStatusIn(vendor.getId(), LIVE));
    }

    private String certificationLabel(VendorDocument doc) {
        return switch (doc.getType()) {
            case CERTIFICATION -> doc.getLabel() != null ? doc.getLabel() : "Certified";
            case FSSAI -> "FSSAI licensed";
            case IEC -> "Import Export Code (IEC)";
            case GST -> "GST registered";
            default -> null;
        };
    }

    // ---------------------------------------------------------------- saved suppliers

    public boolean toggleSaved(User user, Long vendorId) {
        var existing = savedSupplierRepository.findByUserIdAndVendorId(user.getId(), vendorId);
        if (existing.isPresent()) {
            savedSupplierRepository.delete(existing.get());
            return false;
        }
        Vendor vendor = vendorRepository.findById(vendorId)
                .filter(Vendor::isVerified)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Supplier not found"));
        savedSupplierRepository.save(SavedSupplier.builder().user(user).vendor(vendor).build());
        return true;
    }

    @Transactional(readOnly = true)
    public List<VendorSummary> saved(User user) {
        return savedSupplierRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(SavedSupplier::getVendor)
                .filter(Vendor::isVerified)
                .map(this::summary)
                .toList();
    }

    // ---------------------------------------------------------------- admin

    @Transactional(readOnly = true)
    public PageDto<VendorProfile> adminList(VendorStatus status, String q, int page, int size) {
        Specification<Vendor> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (q != null && !q.isBlank()) {
                String like = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("businessName")), like),
                        cb.like(cb.lower(root.get("email")), like)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageDto.from(
                vendorRepository.findAll(spec, PageDto.request(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                v -> profile(v, false));
    }

    @Transactional(readOnly = true)
    public VendorProfile adminGet(Long id) {
        return profile(findOrThrow(id), false);
    }

    public VendorProfile setStatus(User admin, Long id, StatusRequest req) {
        Vendor vendor = findOrThrow(id);
        VendorStatus target = req.status();
        if (target == VendorStatus.DRAFT || target == VendorStatus.PENDING_VERIFICATION) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Admins can only move a vendor to under review, approved, rejected or suspended");
        }
        if (vendor.getStatus() == VendorStatus.DRAFT) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This vendor has not submitted their application yet");
        }
        boolean needsReason = target == VendorStatus.REJECTED || target == VendorStatus.SUSPENDED;
        if (needsReason && (req.reason() == null || req.reason().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A reason is required to reject or suspend a vendor");
        }
        VendorStatus previous = vendor.getStatus();
        vendor.setStatus(target);
        vendor.setStatusReason(needsReason ? req.reason().trim() : null);
        if (target == VendorStatus.APPROVED && vendor.getApprovedAt() == null) {
            vendor.setApprovedAt(Instant.now());
        }
        auditService.log(admin, "VENDOR_STATUS_CHANGED", "Vendor", vendor.getId(),
                previous + " -> " + target + (needsReason ? " (" + req.reason().trim() + ")" : ""));
        String body = switch (target) {
            case APPROVED -> "Your business is now CoffeeHub Verified. You can submit products for approval.";
            case REJECTED -> "Your application was not approved: " + req.reason().trim() + ". You can update your details and resubmit.";
            case SUSPENDED -> "Your seller account has been suspended: " + req.reason().trim();
            default -> "Your application is now under review.";
        };
        notificationService.notify(vendor.getUser(), "VENDOR_VERIFICATION", "Vendor verification update", body, "/seller/verification");
        return profile(vendor, false);
    }

    public VendorProfile reviewDocument(User admin, Long vendorId, Long documentId, DocumentReviewRequest req) {
        Vendor vendor = findOrThrow(vendorId);
        VendorDocument doc = documentRepository.findByIdAndVendorId(documentId, vendorId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Document not found"));
        doc.setStatus(req.status());
        doc.setReviewNote(blankToNull(req.note()));
        doc.setReviewedAt(Instant.now());
        auditService.log(admin, "VENDOR_DOCUMENT_REVIEWED", "Vendor", vendorId, doc.getType() + " -> " + req.status());
        return profile(vendor, false);
    }

    public VendorProfile reviewBank(User admin, Long vendorId, BankReviewRequest req) {
        Vendor vendor = findOrThrow(vendorId);
        VendorBankAccount bank = bankRepository.findByVendorId(vendorId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "This vendor has not added bank details"));
        bank.setStatus(req.status());
        bank.setVerifiedAt(req.status() == VendorBankAccount.Status.VERIFIED ? Instant.now() : null);
        auditService.log(admin, "VENDOR_BANK_REVIEWED", "Vendor", vendorId, req.status().name());
        notificationService.notify(vendor.getUser(), "VENDOR_VERIFICATION", "Bank account " + req.status().name().toLowerCase().replace('_', ' '),
                req.status() == VendorBankAccount.Status.VERIFIED
                        ? "Your bank account is verified and eligible for payouts."
                        : "Your bank account could not be verified. Please check the details.",
                "/seller/payments");
        return profile(vendor, false);
    }

    public VendorProfile setFeatured(User admin, Long id, boolean featured) {
        Vendor vendor = findOrThrow(id);
        vendor.setFeatured(featured);
        auditService.log(admin, "VENDOR_FEATURED", "Vendor", id, String.valueOf(featured));
        return profile(vendor, false);
    }

    // ---------------------------------------------------------------- helpers

    public Vendor findOrThrow(Long id) {
        return vendorRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Vendor not found"));
    }

    private List<String> missingRequirements(Vendor vendor) {
        List<String> missing = new ArrayList<>();
        if (vendor.getVendorType() == null) {
            missing.add("business type");
        }
        if (isBlank(vendor.getAddressLine()) || isBlank(vendor.getCity()) || isBlank(vendor.getState()) || isBlank(vendor.getPin())) {
            missing.add("business address");
        }
        Set<DocumentType> uploaded = EnumSet.noneOf(DocumentType.class);
        documentRepository.findByVendorIdOrderByUploadedAtDesc(vendor.getId()).stream()
                .filter(d -> d.getStatus() != VendorDocument.Status.REJECTED)
                .forEach(d -> uploaded.add(d.getType()));
        for (DocumentType type : DocumentType.values()) {
            if (type.required() && !uploaded.contains(type)) {
                missing.add(type.name().replace('_', ' ').toLowerCase() + " document");
            }
        }
        if (bankRepository.findByVendorId(vendor.getId()).isEmpty()) {
            missing.add("bank details");
        }
        return missing;
    }

    private VendorProfile profile(Vendor v, boolean maskBank) {
        List<DocumentDto> documents = documentRepository.findByVendorIdOrderByUploadedAtDesc(v.getId()).stream()
                .map(DocumentDto::from).toList();
        BankDto bank = bankRepository.findByVendorId(v.getId()).map(b -> BankDto.from(b, maskBank)).orElse(null);
        return new VendorProfile(v.getId(), v.getUser().getId(), v.getBusinessName(), v.getSlug(), v.getContactPerson(),
                v.getEmail(), v.getPhone(), v.getVendorType(), v.getWebsite(), v.getAddressLine(), v.getCity(),
                v.getState(), v.getPin(), v.getGstNumber(), v.getPanNumber(), v.getAbout(), v.getLogoUrl(),
                v.getStatus(), v.getStatusReason(), v.isFeatured(), v.getAvgRating(), v.getReviewCount(),
                v.getSubmittedAt(), v.getApprovedAt(), v.getCreatedAt(), documents, bank, missingRequirements(v));
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static String blankToNull(String s) {
        return isBlank(s) ? null : s.trim();
    }
}
