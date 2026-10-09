package com.coffeehub.category;

import java.util.List;
import java.util.Map;

/**
 * Category-specific structured product attributes. Each group has its own
 * typed fields instead of one generic free-text form, so the same data can
 * drive filters, comparison and sourcing analysis.
 */
public final class AttributeSchema {

    public enum FieldType {
        TEXT, NUMBER, SELECT, BOOLEAN
    }

    public record AttributeDef(String key, String label, FieldType type, List<String> options,
                               boolean required, boolean filterable, String unit) {
    }

    private static final List<String> COFFEE_TYPES = List.of("Arabica", "Robusta", "Blend");
    private static final List<String> PROCESSES = List.of("Washed", "Natural", "Honey", "Monsooned", "Pulped Natural", "Other");

    private static final Map<AttributeGroup, List<AttributeDef>> SCHEMA = Map.of(
            AttributeGroup.GREEN_COFFEE, List.of(
                    select("coffeeType", "Coffee type", COFFEE_TYPES, true),
                    text("grade", "Grade", true, true),
                    text("origin", "Origin", true, true),
                    text("estate", "Estate", false, false),
                    select("process", "Process", PROCESSES, true),
                    text("cropYear", "Crop year", false, true),
                    number("moisture", "Moisture", "%"),
                    text("screenSize", "Screen size", false, false),
                    bool("sampleAvailable", "Sample available")),
            AttributeGroup.ROASTED_COFFEE, List.of(
                    select("coffeeType", "Coffee type", COFFEE_TYPES, true),
                    text("origin", "Origin", true, true),
                    select("process", "Process", PROCESSES, false),
                    select("roastLevel", "Roast level", List.of("Light", "Medium", "Medium-Dark", "Dark"), true),
                    text("packSize", "Pack size", true, true),
                    select("grind", "Grind", List.of("Whole Bean", "Espresso", "Filter", "French Press", "Moka Pot"), false),
                    text("tastingNotes", "Tasting notes", false, false)),
            AttributeGroup.INSTANT_COFFEE, List.of(
                    select("coffeeType", "Coffee type", COFFEE_TYPES, true),
                    select("instantType", "Instant type", List.of("Spray Dried", "Freeze Dried", "Agglomerated"), true),
                    text("packSize", "Pack size", true, true),
                    number("chicoryPercent", "Chicory content", "%")),
            AttributeGroup.EQUIPMENT, List.of(
                    text("brand", "Brand", true, true),
                    text("model", "Model", false, false),
                    select("condition", "Condition", List.of("New", "Refurbished", "Used"), true),
                    text("capacity", "Capacity", false, false),
                    number("powerWatts", "Power", "W"),
                    number("warrantyMonths", "Warranty", "months")),
            AttributeGroup.ACCESSORY, List.of(
                    text("brand", "Brand", false, true),
                    text("material", "Material", false, true),
                    text("size", "Size", false, false)),
            AttributeGroup.BUSINESS_SUPPLY, List.of(
                    text("serviceType", "Service / material type", true, true),
                    number("leadTimeDays", "Lead time", "days"),
                    bool("customization", "Customisation available")),
            AttributeGroup.GENERAL, List.of()
    );

    private AttributeSchema() {
    }

    public static List<AttributeDef> forGroup(AttributeGroup group) {
        return SCHEMA.getOrDefault(group == null ? AttributeGroup.GENERAL : group, List.of());
    }

    private static AttributeDef text(String key, String label, boolean required, boolean filterable) {
        return new AttributeDef(key, label, FieldType.TEXT, List.of(), required, filterable, null);
    }

    private static AttributeDef select(String key, String label, List<String> options, boolean required) {
        return new AttributeDef(key, label, FieldType.SELECT, options, required, true, null);
    }

    private static AttributeDef number(String key, String label, String unit) {
        return new AttributeDef(key, label, FieldType.NUMBER, List.of(), false, false, unit);
    }

    private static AttributeDef bool(String key, String label) {
        return new AttributeDef(key, label, FieldType.BOOLEAN, List.of(), false, true, null);
    }
}
