package com.coffeehub.product;

import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.product.dto.ProductRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public List<ProductDto> list(@RequestParam(required = false) ProductType type) {
        return productService.listApproved(type);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('SELLER')")
    public List<ProductDto> mine(@AuthenticationPrincipal User seller) {
        return productService.mine(seller);
    }

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable Long id, @AuthenticationPrincipal User viewer) {
        return productService.get(id, viewer);
    }

    @PostMapping
    @PreAuthorize("hasRole('SELLER')")
    public ProductDto create(@AuthenticationPrincipal User seller, @Valid @RequestBody ProductRequest request) {
        return productService.create(seller, request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SELLER')")
    public ProductDto update(@AuthenticationPrincipal User seller, @PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(seller, id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SELLER','ADMIN')")
    public void delete(@AuthenticationPrincipal User requester, @PathVariable Long id) {
        productService.delete(requester, id);
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ProductDto approve(@PathVariable Long id, @RequestParam boolean approved) {
        return productService.setApproved(id, approved);
    }
}
