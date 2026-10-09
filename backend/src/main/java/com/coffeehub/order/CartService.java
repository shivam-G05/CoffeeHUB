package com.coffeehub.order;

import com.coffeehub.common.ApiException;
import com.coffeehub.order.OrderRepositories.CartItemRepository;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.product.ProductStatus;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Server-side cart. Items from any number of sellers; totals are grouped per seller as they will be at checkout. */
@Service
@RequiredArgsConstructor
@Transactional
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;

    public record CartLine(Long id, Long productId, String productSlug, String name, String imageUrl, BigDecimal price,
                           String priceUnit, Integer moq, int quantity, int stock, BigDecimal lineTotal,
                           boolean available, String issue) {
    }

    public record CartGroup(Long vendorId, String vendorName, String vendorSlug, boolean vendorVerified,
                            List<CartLine> items, BigDecimal subtotal, BigDecimal shipping) {
    }

    public record CartDto(List<CartGroup> groups, int itemCount, BigDecimal subtotal, BigDecimal shippingTotal,
                          BigDecimal total, boolean readyForCheckout) {
    }

    @Transactional(readOnly = true)
    public CartDto get(User user) {
        return build(cartItemRepository.findByUserIdOrderByIdAsc(user.getId()));
    }

    public CartDto add(User user, Long productId, int quantity) {
        Product product = productRepository.findById(productId)
                .filter(Product::isPubliclyVisible)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product not found"));
        CartItem item = cartItemRepository.findByUserIdAndProductId(user.getId(), productId)
                .orElseGet(() -> CartItem.builder().user(user).product(product).quantity(0).build());
        int target = item.getQuantity() + quantity;
        // First add of a B2B listing jumps straight to its minimum order quantity.
        if (product.getMoq() != null && target < product.getMoq()) {
            target = product.getMoq();
        }
        assertQuantity(product, target);
        item.setQuantity(target);
        cartItemRepository.save(item);
        return get(user);
    }

    public CartDto setQuantity(User user, Long itemId, int quantity) {
        CartItem item = cartItemRepository.findByIdAndUserId(itemId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cart item not found"));
        assertQuantity(item.getProduct(), quantity);
        item.setQuantity(quantity);
        return get(user);
    }

    public CartDto remove(User user, Long itemId) {
        cartItemRepository.findByIdAndUserId(itemId, user.getId()).ifPresent(cartItemRepository::delete);
        cartItemRepository.flush();
        return get(user);
    }

    /** Why this quantity of this product cannot be bought right now, or null if it can. */
    public static String purchaseIssue(Product product, int quantity) {
        if (!product.isPubliclyVisible()) {
            return "No longer available";
        }
        if (product.getStatus() == ProductStatus.OUT_OF_STOCK || product.getStock() <= 0) {
            return "Out of stock";
        }
        if (product.getMoq() != null && quantity < product.getMoq()) {
            return "Minimum order is " + product.getMoq();
        }
        if (quantity > product.getStock()) {
            return "Only " + product.getStock() + " available";
        }
        return null;
    }

    private void assertQuantity(Product product, int quantity) {
        String issue = purchaseIssue(product, quantity);
        if (issue != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, product.getName() + ": " + issue);
        }
    }

    private CartDto build(List<CartItem> items) {
        Map<Long, List<CartItem>> byVendor = new LinkedHashMap<>();
        for (CartItem item : items) {
            Vendor vendor = item.getProduct().getVendor();
            byVendor.computeIfAbsent(vendor == null ? -1L : vendor.getId(), k -> new ArrayList<>()).add(item);
        }
        List<CartGroup> groups = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal shippingTotal = BigDecimal.ZERO;
        int count = 0;
        boolean ready = !items.isEmpty();
        for (List<CartItem> group : byVendor.values()) {
            Vendor vendor = group.get(0).getProduct().getVendor();
            List<CartLine> lines = new ArrayList<>();
            BigDecimal groupSubtotal = BigDecimal.ZERO;
            BigDecimal groupShipping = BigDecimal.ZERO;
            for (CartItem item : group) {
                Product p = item.getProduct();
                String issue = purchaseIssue(p, item.getQuantity());
                BigDecimal lineTotal = p.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                lines.add(new CartLine(item.getId(), p.getId(), p.getSlug(), p.getName(), p.getImageUrl(), p.getPrice(),
                        p.getPriceUnit(), p.getMoq(), item.getQuantity(), p.getStock(), lineTotal, issue == null, issue));
                count += item.getQuantity();
                if (issue != null) {
                    ready = false;
                    continue;
                }
                groupSubtotal = groupSubtotal.add(lineTotal);
                if (p.getShippingCharge() != null) {
                    groupShipping = groupShipping.max(p.getShippingCharge());
                }
            }
            groups.add(new CartGroup(
                    vendor != null ? vendor.getId() : null,
                    vendor != null ? vendor.getBusinessName() : "Unavailable seller",
                    vendor != null ? vendor.getSlug() : null,
                    vendor != null && vendor.isVerified(),
                    lines, groupSubtotal, groupShipping));
            subtotal = subtotal.add(groupSubtotal);
            shippingTotal = shippingTotal.add(groupShipping);
        }
        return new CartDto(groups, count, subtotal, shippingTotal, subtotal.add(shippingTotal), ready);
    }
}
