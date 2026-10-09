package com.coffeehub.search;

import com.coffeehub.category.Category;
import com.coffeehub.category.CategoryRepository;
import com.coffeehub.product.ProductFilter;
import com.coffeehub.product.ProductService;
import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.vendor.VendorDtos.VendorSummary;
import com.coffeehub.vendor.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Global search: one query returns matching products, suppliers and categories. */
@RestController
@RequiredArgsConstructor
public class SearchController {

    private final ProductService productService;
    private final VendorService vendorService;
    private final CategoryRepository categoryRepository;

    public record CategoryHit(Long id, String name, String slug) {
    }

    public record SearchResults(List<ProductDto> products, long totalProducts, List<VendorSummary> suppliers,
                                List<CategoryHit> categories) {
    }

    @GetMapping("/api/search")
    @Transactional(readOnly = true)
    public SearchResults search(@RequestParam String q) {
        String term = q.trim();
        if (term.length() < 2) {
            return new SearchResults(List.of(), 0, List.of(), List.of());
        }
        var products = productService.search(
                new ProductFilter(term, null, null, null, null, null, null, null, null, false, null), null, 0, 6);
        List<VendorSummary> suppliers = vendorService.directory(term, null, null, 0, 4).content();
        String lower = term.toLowerCase();
        List<CategoryHit> categories = categoryRepository.findAllByOrderBySortOrderAscNameAsc().stream()
                .filter(Category::isActive)
                .filter(c -> c.getName().toLowerCase().contains(lower))
                .limit(5)
                .map(c -> new CategoryHit(c.getId(), c.getName(), c.getSlug()))
                .toList();
        return new SearchResults(products.content(), products.totalElements(), suppliers, categories);
    }
}
