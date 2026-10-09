package com.coffeehub.category;

import com.coffeehub.product.ProductType;

/** Which structured attribute form a category uses. Definitions live in {@link AttributeSchema}. */
public enum AttributeGroup {
    GREEN_COFFEE(ProductType.BEAN),
    ROASTED_COFFEE(ProductType.BEAN),
    INSTANT_COFFEE(ProductType.BEAN),
    EQUIPMENT(ProductType.MACHINE),
    ACCESSORY(ProductType.ACCESSORY),
    BUSINESS_SUPPLY(ProductType.ACCESSORY),
    GENERAL(ProductType.ACCESSORY);

    private final ProductType productType;

    AttributeGroup(ProductType productType) {
        this.productType = productType;
    }

    public ProductType productType() {
        return productType;
    }
}
