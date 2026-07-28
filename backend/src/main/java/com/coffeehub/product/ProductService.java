package com.coffeehub.product;

import com.coffeehub.common.ApiException;
import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.product.dto.ProductRequest;
import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ProductService {

    private final ProductRepository productRepository;

    public List<ProductDto> listApproved(ProductType type) {
        List<Product> products = type == null
                ? productRepository.findByApprovedTrue()
                : productRepository.findByApprovedTrueAndType(type);
        return products.stream().map(ProductDto::from).toList();
    }

    public ProductDto get(Long id) {
        return ProductDto.from(findOrThrow(id));
    }

    public List<ProductDto> mine(User seller) {
        return productRepository.findBySeller(seller).stream().map(ProductDto::from).toList();
    }

    public ProductDto create(User seller, ProductRequest request) {
        Product product = Product.builder()
                .name(request.name())
                .description(request.description())
                .price(request.price())
                .type(request.type())
                .category(request.category())
                .stock(request.stock())
                .imageUrl(request.imageUrl())
                .approved(false)
                .seller(seller)
                .build();
        return ProductDto.from(productRepository.save(product));
    }

    public ProductDto update(User seller, Long id, ProductRequest request) {
        Product product = findOrThrow(id);
        assertOwner(product, seller);

        product.setName(request.name());
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setType(request.type());
        product.setCategory(request.category());
        product.setStock(request.stock());
        product.setImageUrl(request.imageUrl());
        product.setApproved(false); // edits require re-approval

        return ProductDto.from(productRepository.save(product));
    }

    public void delete(User requester, Long id) {
        Product product = findOrThrow(id);
        boolean isOwner = product.getSeller().getId().equals(requester.getId());
        boolean isAdmin = requester.getRole().name().equals("ADMIN");
        if (!isOwner && !isAdmin) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete your own products");
        }
        productRepository.delete(product);
    }

    public ProductDto setApproved(Long id, boolean approved) {
        Product product = findOrThrow(id);
        product.setApproved(approved);
        return ProductDto.from(productRepository.save(product));
    }

    private Product findOrThrow(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    private void assertOwner(Product product, User seller) {
        if (!product.getSeller().getId().equals(seller.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only modify your own products");
        }
    }
}
