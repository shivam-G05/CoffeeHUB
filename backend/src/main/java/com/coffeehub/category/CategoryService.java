package com.coffeehub.category;

import com.coffeehub.audit.AuditService;
import com.coffeehub.category.AttributeSchema.AttributeDef;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.Slugs;
import com.coffeehub.content.SettingsService;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.user.User;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final SettingsService settingsService;
    private final AuditService auditService;

    public record CategoryDto(
            Long id,
            String name,
            String slug,
            Long parentId,
            String parentName,
            String parentSlug,
            AttributeGroup attributeGroup,
            BigDecimal commissionRate,
            BigDecimal effectiveCommissionRate,
            BigDecimal taxRate,
            BigDecimal effectiveTaxRate,
            String imageUrl,
            boolean active,
            boolean featured,
            int sortOrder,
            List<AttributeDef> attributes,
            List<CategoryDto> children
    ) {
    }

    public record CategoryRequest(
            @NotBlank @Size(max = 120) String name,
            Long parentId,
            @NotNull AttributeGroup attributeGroup,
            @DecimalMin("0") @DecimalMax("100") BigDecimal commissionRate,
            @DecimalMin("0") @DecimalMax("100") BigDecimal taxRate,
            @Size(max = 500) String imageUrl,
            boolean active,
            boolean featured,
            int sortOrder
    ) {
    }

    /** Top-level categories with their subcategories nested. Admin view includes inactive ones. */
    @Transactional(readOnly = true)
    public List<CategoryDto> tree(boolean includeInactive) {
        List<Category> all = categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .filter(c -> includeInactive || c.isActive())
                .toList();
        List<CategoryDto> roots = new ArrayList<>();
        for (Category root : all) {
            if (root.getParent() != null) {
                continue;
            }
            List<CategoryDto> children = all.stream()
                    .filter(c -> c.getParent() != null && c.getParent().getId().equals(root.getId()))
                    .map(c -> dto(c, List.of()))
                    .toList();
            roots.add(dto(root, children));
        }
        return roots;
    }

    @Transactional(readOnly = true)
    public CategoryDto bySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .filter(Category::isActive)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
        List<CategoryDto> children = categoryRepository.findByParentId(category.getId()).stream()
                .filter(Category::isActive)
                .map(c -> dto(c, List.of()))
                .toList();
        return dto(category, children);
    }

    public CategoryDto create(User admin, CategoryRequest req) {
        Category category = Category.builder()
                .slug(Slugs.unique(req.name(), categoryRepository::existsBySlug))
                .build();
        apply(category, req);
        Category saved = categoryRepository.save(category);
        auditService.log(admin, "CATEGORY_CREATED", "Category", saved.getId(), describe(saved));
        return dto(saved, List.of());
    }

    public CategoryDto update(User admin, Long id, CategoryRequest req) {
        Category category = findOrThrow(id);
        String before = describe(category);
        apply(category, req);
        auditService.log(admin, "CATEGORY_UPDATED", "Category", id, before + " -> " + describe(category));
        return dto(category, List.of());
    }

    public void delete(User admin, Long id) {
        Category category = findOrThrow(id);
        if (!categoryRepository.findByParentId(id).isEmpty() || productRepository.existsByCategoryId(id)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This category has subcategories or products; deactivate it instead");
        }
        categoryRepository.delete(category);
        auditService.log(admin, "CATEGORY_DELETED", "Category", id, category.getName());
    }

    public Category findOrThrow(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Category not found"));
    }

    /** Commission percent for a category: its own rate, else its parent's, else the platform default. Never hard-coded. */
    public BigDecimal commissionRate(Category category) {
        for (Category c = category; c != null; c = c.getParent()) {
            if (c.getCommissionRate() != null) {
                return c.getCommissionRate();
            }
        }
        return settingsService.decimal(SettingsService.DEFAULT_COMMISSION_PERCENT, "8");
    }

    public BigDecimal taxRate(Category category) {
        for (Category c = category; c != null; c = c.getParent()) {
            if (c.getTaxRate() != null) {
                return c.getTaxRate();
            }
        }
        return BigDecimal.ZERO;
    }

    /** Ids of a category and its direct subcategories, for "browse this category" queries. */
    public List<Long> selfAndChildIds(Category category) {
        List<Long> ids = new ArrayList<>();
        ids.add(category.getId());
        categoryRepository.findByParentId(category.getId()).forEach(c -> ids.add(c.getId()));
        return ids;
    }

    private void apply(Category category, CategoryRequest req) {
        Category parent = null;
        if (req.parentId() != null) {
            parent = findOrThrow(req.parentId());
            if (parent.getParent() != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Categories can only be nested one level deep");
            }
            if (parent.getId().equals(category.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "A category cannot be its own parent");
            }
        }
        category.setName(req.name().trim());
        category.setParent(parent);
        category.setAttributeGroup(req.attributeGroup());
        category.setCommissionRate(req.commissionRate());
        category.setTaxRate(req.taxRate());
        category.setImageUrl(req.imageUrl() == null || req.imageUrl().isBlank() ? null : req.imageUrl().trim());
        category.setActive(req.active());
        category.setFeatured(req.featured());
        category.setSortOrder(req.sortOrder());
    }

    private String describe(Category c) {
        return c.getName() + " [commission=" + c.getCommissionRate() + "%, tax=" + c.getTaxRate() + "%, active=" + c.isActive() + "]";
    }

    private CategoryDto dto(Category c, List<CategoryDto> children) {
        Category parent = c.getParent();
        return new CategoryDto(c.getId(), c.getName(), c.getSlug(),
                parent != null ? parent.getId() : null,
                parent != null ? parent.getName() : null,
                parent != null ? parent.getSlug() : null,
                c.getAttributeGroup(), c.getCommissionRate(), commissionRate(c), c.getTaxRate(), taxRate(c), c.getImageUrl(),
                c.isActive(), c.isFeatured(), c.getSortOrder(), AttributeSchema.forGroup(c.getAttributeGroup()), children);
    }
}
