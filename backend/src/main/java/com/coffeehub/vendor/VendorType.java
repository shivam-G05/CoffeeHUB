package com.coffeehub.vendor;

public enum VendorType {
    COFFEE_ESTATE("Coffee Estate"),
    GREEN_COFFEE_SUPPLIER("Green Coffee Supplier"),
    COFFEE_ROASTER("Coffee Roaster"),
    COFFEE_BRAND("Coffee Brand"),
    INSTANT_COFFEE_MANUFACTURER("Instant Coffee Manufacturer"),
    EQUIPMENT_SUPPLIER("Equipment Supplier"),
    ACCESSORIES_SUPPLIER("Accessories Supplier"),
    PACKAGING_SUPPLIER("Packaging Supplier"),
    CONTRACT_MANUFACTURER("Contract Manufacturer"),
    DISTRIBUTOR("Distributor");

    private final String label;

    VendorType(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
