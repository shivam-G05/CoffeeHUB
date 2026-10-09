package com.coffeehub.product;

import com.coffeehub.audit.AuditService;
import com.coffeehub.category.AttributeSchema;
import com.coffeehub.category.AttributeSchema.AttributeDef;
import com.coffeehub.category.Category;
import com.coffeehub.category.CategoryRepository;
import com.coffeehub.category.CategoryService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.common.Slugs;
import com.coffeehub.notification.NotificationService;
import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.product.dto.ProductRequest;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorService;
import com.coffeehub.vendor.VendorStatus;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    public enum ModerationAction {
        APPROVE, REJECT, SUSPEND
    }

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final CategoryService categoryService;
    private final VendorService vendorService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    // ---------------------------------------------------------------- public catalogue

    @Transactional(readOnly = true)
    public PageDto<ProductDto> search(ProductFilter filter, String sort, int page, int size) {
        Collection<Long> categoryIds = null;
        if (filter.categorySlug() != null && !filter.categorySlug().isBlank()) {
            Category category = categoryRepository.findBySlug(filter.categorySlug())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
            categoryIds = categoryService.selfAndChildIds(category);
        }
        return PageDto.from(
                productRepository.findAll(filter.toSpecification(categoryIds), PageDto.request(page, size, sortOf(sort))),
                ProductDto::from);
    }

    @Transactional(readOnly = true)
    public List<ProductDto> featured() {
        ProductFilter none = new ProductFilter(null, null, null, null, null, null, null, null, null, false, null);
        Sort sort = Sort.by(Sort.Order.desc("featured"), Sort.Order.desc("avgRating"), Sort.Order.desc("createdAt"));
        return productRepository.findAll(none.toSpecification(null), PageDto.request(0, 8, sort))
                .map(ProductDto::from).getContent();
    }

    @Transactional(readOnly = true)
    public ProductDto get(String idOrSlug, User viewer) {
        Product product = (idOrSlug.matches("\\d+")
                ? productRepository.findById(Long.parseLong(idOrSlug))
                : productRepository.findBySlug(idOrSlug))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!product.isPubliclyVisible() && !canView(product, viewer)) {
            // 404 rather than 403 so an unapproved listing's existence isn't revealed to strangers.
            throw new ApiException(HttpStatus.NOT_FOUND, "Product not found");
        }
        return ProductDto.from(product);
    }

    private boolean canView(Product product, User viewer) {
        if (viewer == null) {
            return false;
        }
        return viewer.getRole() == Role.ADMIN || product.getSeller().getId().equals(viewer.getId());
    }

    // ---------------------------------------------------------------- vendor

    @Transactional(readOnly = true)
    public List<ProductDto> mine(User seller) {
        return productRepository.findBySellerIdOrderByCreatedAtDesc(seller.getId()).stream().map(ProductDto::from).toList();
    }

    public ProductDto create(User seller, ProductRequest request) {
        Vendor vendor = vendorService.requireForUser(seller);
        Product product = Product.builder()
                .seller(seller)
                .vendor(vendor)
                .slug(Slugs.unique(request.name(), productRepository::existsBySlug))
                .name(request.name())
                .price(request.price())
                .type(ProductType.ACCESSORY)
                .build();
        product.setStatus(ProductStatus.DRAFT);
        apply(product, request);
        return ProductDto.from(productRepository.save(product));
    }

    public ProductDto update(User seller, Long id, ProductRequest request) {
        Product product = findOwned(seller, id);
        boolean wasLive = product.getStatus().isLive() || product.getStatus() == ProductStatus.PENDING;
        apply(product, request);
        if (product.getStatus() == ProductStatus.SUSPENDED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This listing was suspended by CoffeeHub. Contact support to restore it.");
        }
        // Content edits to a live listing go back through moderation; drafts and rejected listings stay editable drafts.
        product.setStatus(wasLive ? ProductStatus.PENDING : ProductStatus.DRAFT);
        if (wasLive) {
            assertReadyForReview(product);
        }
        return ProductDto.from(product);
    }

    public ProductDto submit(User seller, Long id) {
        Product product = findOwned(seller, id);
        if (product.getStatus() != ProductStatus.DRAFT && product.getStatus() != ProductStatus.REJECTED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only draft or rejected products can be submitted");
        }
        Vendor vendor = product.getVendor() != null ? product.getVendor() : vendorService.requireForUser(seller);
        if (vendor.getStatus() != VendorStatus.APPROVED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your business must be verified by CoffeeHub before you can submit products");
        }
        product.setVendor(vendor);
        assertReadyForReview(product);
        product.setStatus(ProductStatus.PENDING);
        product.setRejectionReason(null);
        notificationService.notifyAdmins("PRODUCT_SUBMITTED", "Product awaiting approval",
                vendor.getBusinessName() + " submitted \"" + product.getName() + "\".", "/admin/products");
        return ProductDto.from(product);
    }

    public ProductDto unpublish(User seller, Long id) {
        Product product = findOwned(seller, id);
        if (product.getStatus() == ProductStatus.SUSPENDED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Suspended listings cannot be changed");
        }
        product.setStatus(ProductStatus.DRAFT);
        return ProductDto.from(product);
    }

    /** Stock and price are vendor-managed and do not need re-moderation. */
    public ProductDto updateInventory(User seller, Long id, Integer stock, BigDecimal price) {
        Product product = findOwned(seller, id);
        if (stock != null) {
            if (stock < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Stock cannot be negative");
            }
            product.setStock(stock);
        }
        if (price != null) {
            if (price.signum() <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Price must be greater than zero");
            }
            product.setPrice(price);
        }
        syncStockStatus(product);
        return ProductDto.from(product);
    }

    public void delete(User requester, Long id) {
        Product product = findOrThrow(id);
        boolean isOwner = product.getSeller().getId().equals(requester.getId());
        if (!isOwner && requester.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete your own products");
        }
        try {
            productRepository.delete(product);
            productRepository.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "This product has orders, reviews or is saved by buyers, so it cannot be deleted. Unpublish it instead.");
        }
        if (!isOwner) {
            auditService.log(requester, "PRODUCT_DELETED", "Product", id, product.getName());
        }
    }

    // ---------------------------------------------------------------- admin moderation

    @Transactional(readOnly = true)
    public PageDto<ProductDto> adminList(ProductStatus status, String q, int page, int size) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (q != null && !q.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + q.trim().toLowerCase() + "%"));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        return PageDto.from(
                productRepository.findAll(spec, PageDto.request(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))),
                ProductDto::from);
    }

    public ProductDto moderate(User admin, Long id, ModerationAction action, String reason) {
        Product product = findOrThrow(id);
        String cleanReason = reason == null ? "" : reason.trim();
        if (action != ModerationAction.APPROVE && cleanReason.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "A reason is required to reject or suspend a product");
        }
        ProductStatus previous = product.getStatus();
        switch (action) {
            case APPROVE -> {
                if (product.getVendor() == null || !product.getVendor().isVerified()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "The vendor must be approved before their products can go live");
                }
                product.setStatus(ProductStatus.APPROVED);
                product.setRejectionReason(null);
                syncStockStatus(product);
            }
            case REJECT -> {
                product.setStatus(ProductStatus.REJECTED);
                product.setRejectionReason(cleanReason);
            }
            case SUSPEND -> {
                product.setStatus(ProductStatus.SUSPENDED);
                product.setRejectionReason(cleanReason);
            }
        }
        auditService.log(admin, "PRODUCT_MODERATED", "Product", id,
                previous + " -> " + product.getStatus() + (cleanReason.isEmpty() ? "" : " (" + cleanReason + ")"));
        String body = switch (action) {
            case APPROVE -> "\"" + product.getName() + "\" is approved and live on the marketplace.";
            case REJECT -> "\"" + product.getName() + "\" was not approved: " + cleanReason + ". Edit and resubmit it.";
            case SUSPEND -> "\"" + product.getName() + "\" has been suspended: " + cleanReason;
        };
        notificationService.notify(product.getSeller(), "PRODUCT_MODERATION", "Product review update", body, "/seller/products");
        return ProductDto.from(product);
    }

    public ProductDto setFeatured(User admin, Long id, boolean featured) {
        Product product = findOrThrow(id);
        product.setFeatured(featured);
        auditService.log(admin, "PRODUCT_FEATURED", "Product", id, String.valueOf(featured));
        return ProductDto.from(product);
    }

    // ---------------------------------------------------------------- helpers

    /** Keeps APPROVED / OUT_OF_STOCK in step with inventory. Other statuses are untouched. */
    public void syncStockStatus(Product product) {
        if (product.getStatus() == ProductStatus.APPROVED && product.getStock() <= 0) {
            product.setStatus(ProductStatus.OUT_OF_STOCK);
        } else if (product.getStatus() == ProductStatus.OUT_OF_STOCK && product.getStock() > 0) {
            product.setStatus(ProductStatus.APPROVED);
        }
    }

    private void apply(Product product, ProductRequest request) {
        Category category = categoryRepository.findById(request.categoryId())
                .filter(Category::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Choose a valid category"));
        product.setName(request.name().trim());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setPriceUnit(blankToNull(request.priceUnit()));
        product.setMoq(request.moq());
        product.setCategory(category);
        product.setType(category.getAttributeGroup().productType());
        product.setStock(request.stock());
        product.setShippingCharge(request.shippingCharge());
        product.setDispatchDays(request.dispatchDays());
        product.setShipsFrom(blankToNull(request.shipsFrom()));

        List<String> images = new ArrayList<>();
        if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
            images.add(request.imageUrl().trim());
        }
        if (request.imageUrls() != null) {
            request.imageUrls().stream()
                    .filter(u -> u != null && !u.isBlank())
                    .map(String::trim)
                    .filter(u -> !images.contains(u))
                    .forEach(images::add);
        }
        product.setImageUrl(images.isEmpty() ? null : images.get(0));
        product.getImageUrls().clear();
        product.getImageUrls().addAll(images);

        product.getAttributes().clear();
        product.getAttributes().putAll(cleanAttributes(category, request.attributes()));
    }

    /** Keeps only the attributes defined for the category's group and validates each value against its type. */
    private Map<String, String> cleanAttributes(Category category, Map<String, String> raw) {
        Map<String, String> clean = new LinkedHashMap<>();
        if (raw == null) {
            return clean;
        }
        for (AttributeDef def : AttributeSchema.forGroup(category.getAttributeGroup())) {
            String value = raw.get(def.key());
            if (value == null || value.isBlank()) {
                continue;
            }
            value = value.trim();
            switch (def.type()) {
                case SELECT -> {
                    if (!def.options().contains(value)) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, def.label() + " must be one of: " + String.join(", ", def.options()));
                    }
                }
                case NUMBER -> {
                    try {
                        new BigDecimal(value);
                    } catch (NumberFormatException e) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, def.label() + " must be a number");
                    }
                }
                case BOOLEAN -> value = String.valueOf(Boolean.parseBoolean(value));
                case TEXT -> {
                    if (value.length() > 500) {
                        throw new ApiException(HttpStatus.BAD_REQUEST, def.label() + " is too long");
                    }
                }
            }
            clean.put(def.key(), value);
        }
        return clean;
    }

    /** Images, pricing, inventory, shipping and the category's required attributes must be present before review. */
    private void assertReadyForReview(Product product) {
        List<String> missing = new ArrayList<>();
        if (product.getImageUrl() == null) {
            missing.add("at least one image");
        }
        if (product.getPrice() == null || product.getPrice().signum() <= 0) {
            missing.add("a price");
        }
        if (product.getDescription() == null || product.getDescription().isBlank()) {
            missing.add("a description");
        }
        if (product.getShippingCharge() == null || product.getDispatchDays() == null || product.getShipsFrom() == null) {
            missing.add("shipping details");
        }
        if (product.getCategory() == null) {
            missing.add("a category");
        } else {
            for (AttributeDef def : AttributeSchema.forGroup(product.getCategory().getAttributeGroup())) {
                if (def.required() && !product.getAttributes().containsKey(def.key())) {
                    missing.add(def.label().toLowerCase());
                }
            }
        }
        if (!missing.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Add these before submitting for review: " + String.join(", ", missing));
        }
    }

    private Sort sortOf(String sort) {
        return switch (sort == null ? "" : sort) {
            case "price_asc" -> Sort.by(Sort.Direction.ASC, "price");
            case "price_desc" -> Sort.by(Sort.Direction.DESC, "price");
            case "rating" -> Sort.by(Sort.Order.desc("avgRating"), Sort.Order.desc("reviewCount"));
            default -> Sort.by(Sort.Order.desc("featured"), Sort.Order.desc("createdAt"));
        };
    }

    public Product findOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private Product findOwned(User seller, Long id) {
        Product product = findOrThrow(id);
        if (!product.getSeller().getId().equals(seller.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only modify your own products");
        }
        return product;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
