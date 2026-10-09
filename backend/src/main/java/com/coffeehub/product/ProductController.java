package com.coffeehub.product;

import com.coffeehub.common.PageDto;
import com.coffeehub.product.ProductService.ModerationAction;
import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.product.dto.ProductRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class ProductController {

    private static final String ATTRIBUTE_PARAM_PREFIX = "attr_";

    private final ProductService productService;

    public record InventoryRequest(Integer stock, BigDecimal price) {
    }

    public record ModerationRequest(@NotNull ModerationAction action, @Size(max = 1000) String reason) {
    }

    /**
     * Paginated marketplace search. Category-specific attribute filters are passed
     * as attr_<key>=<value>, e.g. attr_origin=Chikmagalur&attr_roastLevel=Dark.
     */
    @GetMapping("/api/products")
    public PageDto<ProductDto> search(@RequestParam(required = false) String q,
                                      @RequestParam(required = false) ProductType type,
                                      @RequestParam(required = false) String category,
                                      @RequestParam(required = false) BigDecimal minPrice,
                                      @RequestParam(required = false) BigDecimal maxPrice,
                                      @RequestParam(required = false) String seller,
                                      @RequestParam(required = false) String location,
                                      @RequestParam(required = false) Double minRating,
                                      @RequestParam(required = false) Integer maxMoq,
                                      @RequestParam(defaultValue = "false") boolean inStock,
                                      @RequestParam(required = false) String sort,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "12") int size,
                                      @RequestParam Map<String, String> allParams) {
        Map<String, String> attributes = new LinkedHashMap<>();
        allParams.forEach((key, value) -> {
            if (key.startsWith(ATTRIBUTE_PARAM_PREFIX) && attributes.size() < 10) {
                attributes.put(key.substring(ATTRIBUTE_PARAM_PREFIX.length()), value);
            }
        });
        ProductFilter filter = new ProductFilter(q, type, category, minPrice, maxPrice, seller, location,
                minRating, maxMoq, inStock, attributes);
        return productService.search(filter, sort, page, Math.min(size, 48));
    }

    @GetMapping("/api/products/featured")
    public List<ProductDto> featured() {
        return productService.featured();
    }

    @GetMapping("/api/products/mine")
    @PreAuthorize("hasRole('SELLER')")
    public List<ProductDto> mine(@AuthenticationPrincipal User seller) {
        return productService.mine(seller);
    }

    @GetMapping("/api/products/{idOrSlug}")
    public ProductDto get(@PathVariable String idOrSlug, @AuthenticationPrincipal User viewer) {
        return productService.get(idOrSlug, viewer);
    }

    @PostMapping("/api/products")
    @PreAuthorize("hasRole('SELLER')")
    public ProductDto create(@AuthenticationPrincipal User seller, @Valid @RequestBody ProductRequest request) {
        return productService.create(seller, request);
    }

    @PutMapping("/api/products/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public ProductDto update(@AuthenticationPrincipal User seller, @PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(seller, id, request);
    }

    @PostMapping("/api/products/{id}/submit")
    @PreAuthorize("hasRole('SELLER')")
    public ProductDto submit(@AuthenticationPrincipal User seller, @PathVariable Long id) {
        return productService.submit(seller, id);
    }

    @PostMapping("/api/products/{id}/unpublish")
    @PreAuthorize("hasRole('SELLER')")
    public ProductDto unpublish(@AuthenticationPrincipal User seller, @PathVariable Long id) {
        return productService.unpublish(seller, id);
    }

    @PatchMapping("/api/products/{id}/inventory")
    @PreAuthorize("hasRole('SELLER')")
    public ProductDto updateInventory(@AuthenticationPrincipal User seller, @PathVariable Long id, @RequestBody InventoryRequest request) {
        return productService.updateInventory(seller, id, request.stock(), request.price());
    }

    @DeleteMapping("/api/products/{id}")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public void delete(@AuthenticationPrincipal User requester, @PathVariable Long id) {
        productService.delete(requester, id);
    }

    // ---- admin moderation (/api/admin/** is ADMIN-only in SecurityConfig)

    @GetMapping("/api/admin/products")
    public PageDto<ProductDto> adminList(@RequestParam(required = false) ProductStatus status,
                                         @RequestParam(required = false) String q,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return productService.adminList(status, q, page, size);
    }

    @PutMapping("/api/admin/products/{id}/moderate")
    public ProductDto moderate(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody ModerationRequest request) {
        return productService.moderate(admin, id, request.action(), request.reason());
    }

    @PutMapping("/api/admin/products/{id}/featured")
    public ProductDto setFeatured(@AuthenticationPrincipal User admin, @PathVariable Long id, @RequestParam boolean featured) {
        return productService.setFeatured(admin, id, featured);
    }
}
