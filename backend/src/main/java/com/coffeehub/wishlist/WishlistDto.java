package com.coffeehub.wishlist;

import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.product.dto.ProductDto;

import java.util.List;

public record WishlistDto(List<ProductDto> products, List<CafeDto> cafes) {
}
