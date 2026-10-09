package com.coffeehub.config;

import com.coffeehub.category.AttributeGroup;
import com.coffeehub.category.Category;
import com.coffeehub.category.CategoryRepository;
import com.coffeehub.common.Slugs;
import com.coffeehub.content.ContentBlock;
import com.coffeehub.content.ContentController.ContentBlockRepository;
import com.coffeehub.content.PlatformSetting;
import com.coffeehub.content.PlatformSettingRepository;
import com.coffeehub.content.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seeds reference data the marketplace needs to be usable on first boot: the
 * Phase 1 category taxonomy, platform settings and placeholder policy pages.
 * Everything here is editable afterwards from the admin panel; rows that already
 * exist are never overwritten.
 */
@Component
@Order(3)
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String POLICY_PLACEHOLDER = """
            This page is a placeholder. The final wording must be reviewed by legal counsel and must match \
            the platform's actual payment, fulfilment and liability model before public launch.

            CoffeeHub is a marketplace. Unless stated otherwise, products are listed, sold and fulfilled by \
            independent third-party vendors, not by CoffeeHub.

            Edit this page from Admin > Content.""";

    private final CategoryRepository categoryRepository;
    private final PlatformSettingRepository settingRepository;
    private final ContentBlockRepository contentRepository;

    @Override
    @Transactional
    public void run(String... args) {
        seedSettings();
        if (categoryRepository.count() == 0) {
            seedCategories();
        }
        if (contentRepository.count() == 0) {
            seedContent();
        }
    }

    private void seedSettings() {
        setting(SettingsService.BRAND_NAME, "CoffeeHub", "Platform name shown across the site", true);
        setting(SettingsService.BRAND_TAGLINE, "India's coffee marketplace", "Short positioning line", true);
        setting(SettingsService.SUPPORT_EMAIL, "support@coffeehub.in", "Shown on support and policy pages", true);
        setting(SettingsService.DEFAULT_COMMISSION_PERCENT, "8", "Commission % for categories without their own rate", false);
        setting(SettingsService.GATEWAY_FEE_PERCENT, "2", "Payment gateway fee % applied to online payments", false);
        setting(SettingsService.BANK_TRANSFER_INSTRUCTIONS, "", "Bank details shown to buyers who choose bank transfer", false);
    }

    private void setting(String key, String value, String description, boolean isPublic) {
        if (!settingRepository.existsById(key)) {
            settingRepository.save(new PlatformSetting(key, value, description, isPublic));
        }
    }

    // Commission and tax rates below are starting examples, not commercial terms: change them in Admin > Categories.
    private void seedCategories() {
        Category coffee = root("Coffee", AttributeGroup.GENERAL, null, null, 1);
        child(coffee, "Green Coffee", AttributeGroup.GREEN_COFFEE, "3", "0", true);
        child(coffee, "Roasted Coffee", AttributeGroup.ROASTED_COFFEE, "10", "5", true);
        child(coffee, "Instant Coffee", AttributeGroup.INSTANT_COFFEE, "10", "18", true);

        Category equipment = root("Equipment", AttributeGroup.EQUIPMENT, "7", "18", 2);
        for (String name : List.of("Espresso Machines", "Coffee Grinders", "Brewers", "Vending Machines")) {
            child(equipment, name, AttributeGroup.EQUIPMENT, null, null, !name.equals("Vending Machines"));
        }

        Category accessories = root("Accessories", AttributeGroup.ACCESSORY, "12", "18", 3);
        for (String name : List.of("French Press", "Pour Over", "Filters", "Tampers", "Brewing Tools")) {
            child(accessories, name, AttributeGroup.ACCESSORY, null, null, false);
        }

        Category business = root("Business Supplies", AttributeGroup.BUSINESS_SUPPLY, null, "18", 4);
        for (String name : List.of("Packaging", "Private Label", "Contract Manufacturing")) {
            child(business, name, AttributeGroup.BUSINESS_SUPPLY, null, null, false);
        }
    }

    private Category root(String name, AttributeGroup group, String commission, String tax, int sortOrder) {
        return categoryRepository.save(Category.builder()
                .name(name)
                .slug(Slugs.unique(name, categoryRepository::existsBySlug))
                .attributeGroup(group)
                .commissionRate(commission == null ? null : new BigDecimal(commission))
                .taxRate(tax == null ? null : new BigDecimal(tax))
                .sortOrder(sortOrder)
                .build());
    }

    private void child(Category parent, String name, AttributeGroup group, String commission, String tax, boolean featured) {
        categoryRepository.save(Category.builder()
                .name(name)
                .slug(Slugs.unique(name, categoryRepository::existsBySlug))
                .parent(parent)
                .attributeGroup(group)
                .commissionRate(commission == null ? null : new BigDecimal(commission))
                .taxRate(tax == null ? null : new BigDecimal(tax))
                .featured(featured)
                .sortOrder((int) categoryRepository.count())
                .build());
    }

    private void seedContent() {
        int order = 0;
        for (String title : List.of(
                "Terms & Conditions", "Privacy Policy", "Seller Terms", "Buyer Protection", "Refund & Cancellation",
                "Shipping Policy", "Marketplace Disclaimer", "Prohibited Products", "Dispute Policy", "Cookie Policy")) {
            contentRepository.save(ContentBlock.builder()
                    .type(ContentBlock.Type.POLICY)
                    .slug(Slugs.slugify(title))
                    .title(title)
                    .body(POLICY_PLACEHOLDER)
                    .sortOrder(order++)
                    .build());
        }
        faq(0, "Who sells the products on CoffeeHub?",
                "Independent, verified vendors. Each product page shows who sells and ships the item.");
        faq(1, "What does \"CoffeeHub Verified\" mean?",
                "The seller's business documents were reviewed and approved by the CoffeeHub team before they could list products.");
        faq(2, "How do I buy in bulk?",
                "Use Post Requirement to describe what you need. We route it to relevant verified suppliers, and you compare their quotes side by side.");
        faq(3, "How do I become a seller?",
                "Register as a seller, complete your business profile, upload your verification documents and submit for review.");
    }

    private void faq(int order, String question, String answer) {
        contentRepository.save(ContentBlock.builder()
                .type(ContentBlock.Type.FAQ)
                .title(question)
                .body(answer)
                .sortOrder(order)
                .build());
    }
}
