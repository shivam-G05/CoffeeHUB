package com.coffeehub.category;

import com.coffeehub.category.CategoryService.CategoryDto;
import com.coffeehub.category.CategoryService.CategoryRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/api/categories")
    public List<CategoryDto> tree() {
        return categoryService.tree(false);
    }

    @GetMapping("/api/categories/{slug}")
    public CategoryDto bySlug(@PathVariable String slug) {
        return categoryService.bySlug(slug);
    }

    @GetMapping("/api/admin/categories")
    public List<CategoryDto> adminTree() {
        return categoryService.tree(true);
    }

    @PostMapping("/api/admin/categories")
    public CategoryDto create(@AuthenticationPrincipal User admin, @Valid @RequestBody CategoryRequest request) {
        return categoryService.create(admin, request);
    }

    @PutMapping("/api/admin/categories/{id}")
    public CategoryDto update(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return categoryService.update(admin, id, request);
    }

    @DeleteMapping("/api/admin/categories/{id}")
    public void delete(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        categoryService.delete(admin, id);
    }
}
