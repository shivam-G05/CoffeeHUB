package com.coffeehub.order;

import com.coffeehub.audit.AuditService;
import com.coffeehub.category.CategoryService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.content.SettingsService;
import com.coffeehub.notification.NotificationService;
import com.coffeehub.order.OrderDtos.*;
import com.coffeehub.order.OrderRepositories.CartItemRepository;
import com.coffeehub.order.OrderRepositories.PaymentRepository;
import com.coffeehub.order.OrderRepositories.VendorOrderRepository;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.product.ProductService;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserRepository;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderService {

    private static final int POINTS_PER_100_RUPEES = 1;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final OrderRepository orderRepository;
    private final VendorOrderRepository vendorOrderRepository;
    private final PaymentRepository paymentRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;
    private final CategoryService categoryService;
    private final UserRepository userRepository;
    private final VendorService vendorService;
    private final SettingsService settingsService;
    private final NotificationService notificationService;
    private final AuditService auditService;

    /** Simulated online payment for development/demo. Must stay off in production until a real gateway is integrated. */
    @Value("${app.payments.mock-enabled}")
    private boolean mockPaymentsEnabled;

    // ---------------------------------------------------------------- checkout

    @Transactional(readOnly = true)
    public PaymentOptions paymentOptions() {
        List<Payment.Method> methods = new ArrayList<>(List.of(Payment.Method.COD, Payment.Method.BANK_TRANSFER));
        if (mockPaymentsEnabled) {
            methods.add(Payment.Method.ONLINE);
        }
        return new PaymentOptions(methods, mockPaymentsEnabled,
                settingsService.get(SettingsService.BANK_TRANSFER_INSTRUCTIONS, ""));
    }

    /**
     * Turns the buyer's cart into one parent order plus one vendor order per seller,
     * e.g. CH-100001 with CH-100001-A and CH-100001-B.
     */
    public OrderDto checkout(User principal, CheckoutRequest req) {
        User buyer = userRepository.findById(principal.getId()).orElseThrow();
        List<CartItem> cart = cartItemRepository.findByUserIdOrderByIdAsc(buyer.getId());
        if (cart.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your cart is empty");
        }
        if (!paymentOptions().methods().contains(req.paymentMethod())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That payment method is not available");
        }
        BigDecimal gatewayPercent = req.paymentMethod() == Payment.Method.ONLINE
                ? settingsService.decimal(SettingsService.GATEWAY_FEE_PERCENT, "2")
                : BigDecimal.ZERO;

        AddressInput ship = req.shippingAddress();
        AddressInput bill = req.billingAddress() != null ? req.billingAddress() : ship;
        Order order = orderRepository.save(Order.builder()
                .customer(buyer)
                .totalAmount(BigDecimal.ZERO)
                .status(OrderStatus.PLACED)
                .paymentMethod(req.paymentMethod())
                .paymentStatus(Payment.Status.PENDING)
                .contactName(req.name().trim())
                .contactPhone(req.phone().trim())
                .contactEmail(req.email().trim().toLowerCase())
                .shipLine1(ship.line1()).shipLine2(ship.line2()).shipCity(ship.city()).shipState(ship.state()).shipPin(ship.pin())
                .billLine1(bill.line1()).billLine2(bill.line2()).billCity(bill.city()).billState(bill.state()).billPin(bill.pin())
                .gstNumber(req.gstNumber() == null || req.gstNumber().isBlank() ? null : req.gstNumber().trim().toUpperCase())
                .notes(req.notes())
                .build());
        order.setOrderNumber("CH-" + (100000 + order.getId()));

        Map<Long, VendorOrder> byVendor = new LinkedHashMap<>();
        for (CartItem cartItem : cart) {
            // Locks the product row so two concurrent checkouts cannot both take the last unit.
            Product product = productRepository.findByIdForUpdate(cartItem.getProduct().getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "A product in your cart no longer exists"));
            int quantity = cartItem.getQuantity();
            String issue = CartService.purchaseIssue(product, quantity);
            if (issue != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, product.getName() + ": " + issue);
            }
            Vendor vendor = product.getVendor();
            VendorOrder vendorOrder = byVendor.get(vendor.getId());
            if (vendorOrder == null) {
                vendorOrder = vendorOrderRepository.save(VendorOrder.builder()
                        .order(order)
                        .vendor(vendor)
                        .subOrderNumber(order.getOrderNumber() + "-" + suffix(byVendor.size()))
                        .build());
                byVendor.put(vendor.getId(), vendorOrder);
            }

            BigDecimal lineTotal = money(product.getPrice().multiply(BigDecimal.valueOf(quantity)));
            BigDecimal commissionRate = categoryService.commissionRate(product.getCategory());
            BigDecimal taxRate = categoryService.taxRate(product.getCategory());
            BigDecimal commission = percentOf(lineTotal, commissionRate);
            // Listed prices are GST-inclusive, so the tax component is extracted rather than added on top.
            BigDecimal tax = money(lineTotal.multiply(taxRate).divide(HUNDRED.add(taxRate), 4, RoundingMode.HALF_UP));

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .vendorOrder(vendorOrder)
                    .product(product)
                    .productName(product.getName())
                    .quantity(quantity)
                    .unitPrice(product.getPrice())
                    .commissionRate(commissionRate)
                    .commissionAmount(commission)
                    .taxRate(taxRate)
                    .taxAmount(tax)
                    .build();
            order.getItems().add(item);
            vendorOrder.getItems().add(item);

            vendorOrder.setItemsSubtotal(vendorOrder.getItemsSubtotal().add(lineTotal));
            vendorOrder.setTaxAmount(vendorOrder.getTaxAmount().add(tax));
            vendorOrder.setPlatformFee(vendorOrder.getPlatformFee().add(commission));
            if (product.getShippingCharge() != null) {
                // One shipment per vendor: charge the highest per-product shipping fee once.
                vendorOrder.setShippingAmount(vendorOrder.getShippingAmount().max(product.getShippingCharge()));
            }

            product.setStock(product.getStock() - quantity);
            productService.syncStockStatus(product);
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal shipping = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal gatewayFees = BigDecimal.ZERO;
        for (VendorOrder vendorOrder : byVendor.values()) {
            vendorOrder.setTotalAmount(vendorOrder.getItemsSubtotal().add(vendorOrder.getShippingAmount()));
            vendorOrder.setGatewayFee(percentOf(vendorOrder.getTotalAmount(), gatewayPercent));
            vendorOrder.setVendorPayable(vendorOrder.getTotalAmount()
                    .subtract(vendorOrder.getPlatformFee())
                    .subtract(vendorOrder.getGatewayFee()));
            subtotal = subtotal.add(vendorOrder.getItemsSubtotal());
            shipping = shipping.add(vendorOrder.getShippingAmount());
            tax = tax.add(vendorOrder.getTaxAmount());
            gatewayFees = gatewayFees.add(vendorOrder.getGatewayFee());
        }
        order.setItemsSubtotal(subtotal);
        order.setShippingTotal(shipping);
        order.setTaxTotal(tax);
        order.setTotalAmount(subtotal.add(shipping));

        paymentRepository.save(Payment.builder()
                .order(order)
                .method(req.paymentMethod())
                .amount(order.getTotalAmount())
                .gatewayFee(gatewayFees)
                .provider(req.paymentMethod() == Payment.Method.ONLINE ? "mock" : "manual")
                .build());

        cartItemRepository.deleteAll(cart);

        int earnedPoints = order.getTotalAmount().intValue() / 100 * POINTS_PER_100_RUPEES;
        if (earnedPoints > 0) {
            buyer.setLoyaltyPoints(buyer.getLoyaltyPoints() + earnedPoints);
        }

        orderRepository.flush();
        notificationService.notify(buyer, "ORDER_PLACED", "Order " + order.getOrderNumber() + " placed",
                "We've sent your order to " + byVendor.size() + (byVendor.size() == 1 ? " seller." : " sellers."),
                "/customer/orders/" + order.getId());
        for (VendorOrder vendorOrder : byVendor.values()) {
            notificationService.notify(vendorOrder.getVendor().getUser(), "NEW_ORDER",
                    "New order " + vendorOrder.getSubOrderNumber(),
                    vendorOrder.getItems().size() + " item(s), ₹" + vendorOrder.getTotalAmount(),
                    "/seller/orders/" + vendorOrder.getId());
        }
        return toDto(order, new ArrayList<>(byVendor.values()), View.BUYER);
    }

    // ---------------------------------------------------------------- payment

    /** Test-mode stand-in for a gateway callback. Disabled unless app.payments.mock-enabled is set. */
    public OrderDto payOnlineMock(User buyer, Long orderId) {
        if (!mockPaymentsEnabled) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Online payment is not available");
        }
        Order order = findOrder(orderId);
        assertBuyer(order, buyer);
        if (order.getPaymentMethod() != Payment.Method.ONLINE || order.getPaymentStatus() != Payment.Status.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This order is not awaiting online payment");
        }
        markPaid(order, "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        return toDto(order, View.BUYER);
    }

    /** Admin records that a bank transfer (or COD remittance) was received. */
    public OrderDto adminConfirmPayment(User admin, Long orderId, String reference) {
        Order order = findOrder(orderId);
        if (order.getPaymentStatus() != Payment.Status.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This order's payment is already " + order.getPaymentStatus());
        }
        markPaid(order, reference == null || reference.isBlank() ? null : reference.trim());
        auditService.log(admin, "PAYMENT_CONFIRMED", "Order", orderId, order.getOrderNumber() + " ref=" + reference);
        return toDto(order, View.ADMIN);
    }

    private void markPaid(Order order, String reference) {
        Payment payment = paymentRepository.findByOrderId(order.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "This order has no payment record"));
        payment.setStatus(Payment.Status.PAID);
        payment.setPaidAt(Instant.now());
        if (reference != null) {
            payment.setProviderReference(reference);
        }
        order.setPaymentStatus(Payment.Status.PAID);
        List<VendorOrder> vendorOrders = vendorOrderRepository.findByOrderIdOrderByIdAsc(order.getId());
        for (VendorOrder vendorOrder : vendorOrders) {
            if (vendorOrder.getStatus() == OrderStatus.PLACED) {
                vendorOrder.setStatus(OrderStatus.PAYMENT_CONFIRMED);
                vendorOrder.setUpdatedAt(Instant.now());
            }
            refreshSettlement(vendorOrder);
            notificationService.notify(vendorOrder.getVendor().getUser(), "PAYMENT_CONFIRMED",
                    "Payment confirmed for " + vendorOrder.getSubOrderNumber(), "You can now accept and process this order.",
                    "/seller/orders/" + vendorOrder.getId());
        }
        recomputeParent(order, vendorOrders);
        notificationService.notify(order.getCustomer(), "PAYMENT_CONFIRMED", "Payment received for " + order.getOrderNumber(),
                null, "/customer/orders/" + order.getId());
    }

    // ---------------------------------------------------------------- buyer

    @Transactional(readOnly = true)
    public PageDto<OrderDto> myOrders(User buyer, int page, int size) {
        return PageDto.from(
                orderRepository.findByCustomerIdOrderByCreatedAtDesc(buyer.getId(), PageDto.request(page, size, Sort.unsorted())),
                o -> toDto(o, View.BUYER));
    }

    @Transactional(readOnly = true)
    public OrderDto get(User viewer, Long orderId) {
        Order order = findOrder(orderId);
        if (viewer.getRole() == Role.ADMIN) {
            return toDto(order, View.ADMIN);
        }
        assertBuyer(order, viewer);
        return toDto(order, View.BUYER);
    }

    public OrderDto cancelByBuyer(User buyer, Long vendorOrderId, String reason) {
        VendorOrder vendorOrder = findVendorOrder(vendorOrderId);
        assertBuyer(vendorOrder.getOrder(), buyer);
        if (!vendorOrder.getStatus().isInFlow() || vendorOrder.getStatus().progress() >= OrderStatus.PROCESSING.progress()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This order is already being prepared and can no longer be cancelled. Raise a dispute if there is a problem.");
        }
        cancel(vendorOrder, reason == null || reason.isBlank() ? "Cancelled by buyer" : reason.trim());
        notificationService.notify(vendorOrder.getVendor().getUser(), "ORDER_CANCELLED",
                "Order " + vendorOrder.getSubOrderNumber() + " was cancelled by the buyer", vendorOrder.getCancelReason(),
                "/seller/orders/" + vendorOrder.getId());
        return toDto(vendorOrder.getOrder(), View.BUYER);
    }

    public OrderDto confirmDelivery(User buyer, Long vendorOrderId) {
        VendorOrder vendorOrder = findVendorOrder(vendorOrderId);
        assertBuyer(vendorOrder.getOrder(), buyer);
        if (vendorOrder.getStatus() != OrderStatus.SHIPPED && vendorOrder.getStatus() != OrderStatus.DELIVERED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only shipped or delivered orders can be confirmed as received");
        }
        changeStatus(vendorOrder, OrderStatus.COMPLETED);
        return toDto(vendorOrder.getOrder(), View.BUYER);
    }

    // ---------------------------------------------------------------- vendor

    @Transactional(readOnly = true)
    public PageDto<VendorOrderDto> vendorOrders(User seller, OrderStatus status, int page, int size) {
        Vendor vendor = vendorService.requireForUser(seller);
        var pageable = PageDto.request(page, size, Sort.unsorted());
        Page<VendorOrder> result = status == null
                ? vendorOrderRepository.findByVendorIdOrderByCreatedAtDesc(vendor.getId(), pageable)
                : vendorOrderRepository.findByVendorIdAndStatusOrderByCreatedAtDesc(vendor.getId(), status, pageable);
        return PageDto.from(result, vo -> toDto(vo, View.VENDOR));
    }

    @Transactional(readOnly = true)
    public VendorOrderDto vendorOrder(User seller, Long vendorOrderId) {
        return toDto(findOwnedVendorOrder(seller, vendorOrderId), View.VENDOR);
    }

    /** Vendor moves their own sub-order forward (accept / process / ready / ship / deliver) or cancels it before shipping. */
    public VendorOrderDto vendorUpdate(User seller, Long vendorOrderId, VendorStatusRequest req) {
        VendorOrder vendorOrder = findOwnedVendorOrder(seller, vendorOrderId);
        OrderStatus current = vendorOrder.getStatus();
        OrderStatus target = req.status();
        Order order = vendorOrder.getOrder();

        if (target == OrderStatus.CANCELLED) {
            if (!current.isInFlow() || current.progress() >= OrderStatus.SHIPPED.progress()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Shipped orders cannot be cancelled");
            }
            if (req.reason() == null || req.reason().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Give the buyer a reason for cancelling");
            }
            cancel(vendorOrder, req.reason().trim());
            notificationService.notify(order.getCustomer(), "ORDER_CANCELLED",
                    "Order " + vendorOrder.getSubOrderNumber() + " was cancelled by the seller", vendorOrder.getCancelReason(),
                    "/customer/orders/" + order.getId());
            return toDto(vendorOrder, View.VENDOR);
        }

        boolean vendorSettable = target.progress() >= OrderStatus.ACCEPTED.progress()
                && target.progress() <= OrderStatus.DELIVERED.progress()
                && target != OrderStatus.CONFIRMED;
        if (!vendorSettable || !current.isInFlow() || target.progress() <= current.progress()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "An order cannot move from " + current + " to " + target);
        }
        if (order.getPaymentMethod() != Payment.Method.COD && order.getPaymentStatus() != Payment.Status.PAID) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Payment for this order has not been confirmed yet");
        }

        if (req.courierName() != null && !req.courierName().isBlank()) {
            vendorOrder.setCourierName(req.courierName().trim());
        }
        if (req.trackingNumber() != null && !req.trackingNumber().isBlank()) {
            vendorOrder.setTrackingNumber(req.trackingNumber().trim());
        }
        if (req.trackingUrl() != null && !req.trackingUrl().isBlank()) {
            String url = req.trackingUrl().trim();
            if (!url.startsWith("https://") && !url.startsWith("http://")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Tracking link must start with http:// or https://");
            }
            vendorOrder.setTrackingUrl(url);
        }
        if (req.dispatchDate() != null) {
            vendorOrder.setDispatchDate(req.dispatchDate());
        }
        if (target.progress() >= OrderStatus.SHIPPED.progress()) {
            if (vendorOrder.getCourierName() == null || vendorOrder.getTrackingNumber() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Enter the courier and tracking number to mark this order shipped");
            }
            if (vendorOrder.getDispatchDate() == null) {
                vendorOrder.setDispatchDate(LocalDate.now());
            }
        }
        changeStatus(vendorOrder, target);
        return toDto(vendorOrder, View.VENDOR);
    }

    // ---------------------------------------------------------------- admin

    @Transactional(readOnly = true)
    public PageDto<OrderDto> adminOrders(String q, int page, int size) {
        var pageable = PageDto.request(page, size, Sort.unsorted());
        Page<Order> result = q == null || q.isBlank()
                ? orderRepository.findAllByOrderByCreatedAtDesc(pageable)
                : orderRepository.findByOrderNumberContainingIgnoreCaseOrderByCreatedAtDesc(q.trim(), pageable);
        return PageDto.from(result, o -> toDto(o, View.ADMIN));
    }

    public OrderDto adminSetStatus(User admin, Long vendorOrderId, OrderStatus target, String reason) {
        VendorOrder vendorOrder = findVendorOrder(vendorOrderId);
        OrderStatus previous = vendorOrder.getStatus();
        if (target == OrderStatus.PENDING || target == OrderStatus.CONFIRMED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That status is not used for new orders");
        }
        if (!target.isInFlow() && target != OrderStatus.CANCELLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Refunds and disputes have their own actions; they cannot be set as a status directly");
        }
        if (target == OrderStatus.CANCELLED) {
            cancel(vendorOrder, reason == null || reason.isBlank() ? "Cancelled by CoffeeHub" : reason.trim());
        } else {
            changeStatus(vendorOrder, target);
        }
        auditService.log(admin, "ORDER_STATUS_OVERRIDE", "VendorOrder", vendorOrderId,
                vendorOrder.getSubOrderNumber() + ": " + previous + " -> " + vendorOrder.getStatus()
                        + (reason == null || reason.isBlank() ? "" : " (" + reason.trim() + ")"));
        return toDto(vendorOrder.getOrder(), View.ADMIN);
    }

    public OrderDto adminRefund(User admin, Long vendorOrderId, BigDecimal amount, String reason) {
        VendorOrder vendorOrder = findVendorOrder(vendorOrderId);
        refund(vendorOrder, amount);
        auditService.log(admin, "REFUND_ISSUED", "VendorOrder", vendorOrderId,
                vendorOrder.getSubOrderNumber() + " ₹" + amount + (reason == null || reason.isBlank() ? "" : " (" + reason.trim() + ")"));
        return toDto(vendorOrder.getOrder(), View.ADMIN);
    }

    // ---------------------------------------------------------------- state changes shared with disputes

    /** Records a refund against a vendor order and adjusts what the vendor is owed. A full refund closes the order as REFUNDED. */
    public void refund(VendorOrder vendorOrder, BigDecimal amount) {
        Order order = vendorOrder.getOrder();
        BigDecimal refundable = vendorOrder.getTotalAmount().subtract(vendorOrder.getRefundAmount());
        if (amount == null || amount.signum() <= 0 || amount.compareTo(refundable) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Refund must be between ₹0.01 and ₹" + refundable);
        }
        if (order.getPaymentStatus() == Payment.Status.PENDING) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This order has not been paid, so there is nothing to refund");
        }
        vendorOrder.setRefundAmount(vendorOrder.getRefundAmount().add(amount));
        boolean full = vendorOrder.getRefundAmount().compareTo(vendorOrder.getTotalAmount()) >= 0;
        if (full) {
            vendorOrder.setPlatformFee(BigDecimal.ZERO);
            vendorOrder.setVendorPayable(BigDecimal.ZERO);
            vendorOrder.setStatus(OrderStatus.REFUNDED);
        } else {
            vendorOrder.setVendorPayable(vendorOrder.getVendorPayable().subtract(amount).max(BigDecimal.ZERO));
            if (vendorOrder.getStatus() == OrderStatus.REFUND_REQUESTED || vendorOrder.getStatus() == OrderStatus.DISPUTED) {
                vendorOrder.setStatus(vendorOrder.getPreviousStatus() != null ? vendorOrder.getPreviousStatus() : OrderStatus.DELIVERED);
            }
        }
        vendorOrder.setUpdatedAt(Instant.now());
        refreshSettlement(vendorOrder);

        paymentRepository.findByOrderId(order.getId()).ifPresent(payment -> {
            payment.setRefundedAmount(payment.getRefundedAmount().add(amount));
            payment.setStatus(payment.getRefundedAmount().compareTo(payment.getAmount()) >= 0
                    ? Payment.Status.REFUNDED : Payment.Status.PARTIALLY_REFUNDED);
            order.setPaymentStatus(payment.getStatus());
        });
        recomputeParent(order, vendorOrderRepository.findByOrderIdOrderByIdAsc(order.getId()));
        notificationService.notify(order.getCustomer(), "REFUND", "Refund of ₹" + amount + " for " + vendorOrder.getSubOrderNumber(),
                "The refund has been recorded and will reach your original payment method.", "/customer/orders/" + order.getId());
        notificationService.notify(vendorOrder.getVendor().getUser(), "REFUND", "Refund issued on " + vendorOrder.getSubOrderNumber(),
                "₹" + amount + " was refunded to the buyer.", "/seller/orders/" + vendorOrder.getId());
    }

    public void markDisputed(VendorOrder vendorOrder) {
        if (vendorOrder.getStatus() != OrderStatus.DISPUTED) {
            vendorOrder.setPreviousStatus(vendorOrder.getStatus());
            vendorOrder.setStatus(OrderStatus.DISPUTED);
            vendorOrder.setUpdatedAt(Instant.now());
            refreshSettlement(vendorOrder);
            recomputeParent(vendorOrder.getOrder(), vendorOrderRepository.findByOrderIdOrderByIdAsc(vendorOrder.getOrder().getId()));
        }
    }

    /** Closes a dispute without a (full) refund: the order returns to where it was. */
    public void restoreAfterDispute(VendorOrder vendorOrder) {
        if (vendorOrder.getStatus() == OrderStatus.DISPUTED) {
            vendorOrder.setStatus(vendorOrder.getPreviousStatus() != null ? vendorOrder.getPreviousStatus() : OrderStatus.DELIVERED);
            vendorOrder.setUpdatedAt(Instant.now());
            refreshSettlement(vendorOrder);
            recomputeParent(vendorOrder.getOrder(), vendorOrderRepository.findByOrderIdOrderByIdAsc(vendorOrder.getOrder().getId()));
        }
    }

    private void changeStatus(VendorOrder vendorOrder, OrderStatus target) {
        Order order = vendorOrder.getOrder();
        vendorOrder.setStatus(target);
        vendorOrder.setUpdatedAt(Instant.now());
        if ((target == OrderStatus.DELIVERED || target == OrderStatus.COMPLETED) && vendorOrder.getDeliveredAt() == null) {
            vendorOrder.setDeliveredAt(Instant.now());
        }
        List<VendorOrder> siblings = vendorOrderRepository.findByOrderIdOrderByIdAsc(order.getId());
        // Cash on delivery is collected at the door, so the order counts as paid once every part of it has arrived.
        if (order.getPaymentMethod() == Payment.Method.COD && order.getPaymentStatus() == Payment.Status.PENDING
                && siblings.stream().filter(v -> v.getStatus().isInFlow())
                .allMatch(v -> v.getStatus().progress() >= OrderStatus.DELIVERED.progress())) {
            order.setPaymentStatus(Payment.Status.PAID);
            paymentRepository.findByOrderId(order.getId()).ifPresent(p -> {
                p.setStatus(Payment.Status.PAID);
                p.setPaidAt(Instant.now());
            });
        }
        siblings.forEach(this::refreshSettlement);
        recomputeParent(order, siblings);

        String detail = target == OrderStatus.SHIPPED
                ? "Shipped with " + vendorOrder.getCourierName() + ", tracking " + vendorOrder.getTrackingNumber()
                : null;
        notificationService.notify(order.getCustomer(), "ORDER_" + target.name(),
                "Order " + vendorOrder.getSubOrderNumber() + " is now " + target.name().toLowerCase().replace('_', ' '),
                detail, "/customer/orders/" + order.getId());
    }

    /** Cancels a vendor order and puts its stock back. A paid order becomes REFUND_REQUESTED until admin issues the refund. */
    private void cancel(VendorOrder vendorOrder, String reason) {
        Order order = vendorOrder.getOrder();
        for (OrderItem item : vendorOrder.getItems()) {
            Product product = item.getProduct();
            product.setStock(product.getStock() + item.getQuantity());
            productService.syncStockStatus(product);
        }
        boolean moneyHeld = order.getPaymentStatus() == Payment.Status.PAID || order.getPaymentStatus() == Payment.Status.PARTIALLY_REFUNDED;
        vendorOrder.setPreviousStatus(vendorOrder.getStatus());
        vendorOrder.setStatus(moneyHeld ? OrderStatus.REFUND_REQUESTED : OrderStatus.CANCELLED);
        vendorOrder.setCancelReason(reason);
        vendorOrder.setUpdatedAt(Instant.now());
        if (!moneyHeld) {
            vendorOrder.setPlatformFee(BigDecimal.ZERO);
            vendorOrder.setVendorPayable(BigDecimal.ZERO);
        } else {
            notificationService.notifyAdmins("REFUND_REQUESTED", "Refund needed for " + vendorOrder.getSubOrderNumber(),
                    "A paid order was cancelled: " + reason, "/admin/orders");
        }
        refreshSettlement(vendorOrder);
        recomputeParent(order, vendorOrderRepository.findByOrderIdOrderByIdAsc(order.getId()));
    }

    private void refreshSettlement(VendorOrder vendorOrder) {
        if (vendorOrder.getSettlementStatus() == VendorOrder.SettlementStatus.SETTLED) {
            return;
        }
        Order order = vendorOrder.getOrder();
        boolean paid = order.getPaymentStatus() == Payment.Status.PAID || order.getPaymentStatus() == Payment.Status.PARTIALLY_REFUNDED;
        VendorOrder.SettlementStatus status = switch (vendorOrder.getStatus()) {
            case DELIVERED, COMPLETED -> paid ? VendorOrder.SettlementStatus.ELIGIBLE : VendorOrder.SettlementStatus.PENDING;
            case CANCELLED, REFUNDED -> VendorOrder.SettlementStatus.CANCELLED;
            case DISPUTED, REFUND_REQUESTED -> VendorOrder.SettlementStatus.ON_HOLD;
            default -> VendorOrder.SettlementStatus.PENDING;
        };
        vendorOrder.setSettlementStatus(status);
    }

    /** Parent status = the least advanced vendor order still in flow; otherwise the exception state they share. */
    private void recomputeParent(Order order, List<VendorOrder> vendorOrders) {
        OrderStatus summary = vendorOrders.stream()
                .map(VendorOrder::getStatus)
                .filter(OrderStatus::isInFlow)
                .min((a, b) -> Integer.compare(a.progress(), b.progress()))
                .orElse(null);
        if (summary == null) {
            List<OrderStatus> statuses = vendorOrders.stream().map(VendorOrder::getStatus).toList();
            if (statuses.contains(OrderStatus.DISPUTED)) {
                summary = OrderStatus.DISPUTED;
            } else if (statuses.contains(OrderStatus.REFUND_REQUESTED)) {
                summary = OrderStatus.REFUND_REQUESTED;
            } else if (statuses.contains(OrderStatus.REFUNDED)) {
                summary = OrderStatus.REFUNDED;
            } else {
                summary = OrderStatus.CANCELLED;
            }
        }
        order.setStatus(summary);
    }

    // ---------------------------------------------------------------- lookups & mapping

    public VendorOrder findVendorOrder(Long id) {
        return vendorOrderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    /** 404 (not 403) for another vendor's order, so order ids cannot be probed across vendors. */
    public VendorOrder findOwnedVendorOrder(User seller, Long vendorOrderId) {
        Vendor vendor = vendorService.requireForUser(seller);
        VendorOrder vendorOrder = findVendorOrder(vendorOrderId);
        if (!vendorOrder.getVendor().getId().equals(vendor.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        }
        return vendorOrder;
    }

    private Order findOrder(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    private void assertBuyer(Order order, User buyer) {
        if (!order.getCustomer().getId().equals(buyer.getId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Order not found");
        }
    }

    public OrderDto toDto(Order order, View view) {
        return toDto(order, vendorOrderRepository.findByOrderIdOrderByIdAsc(order.getId()), view);
    }

    private OrderDto toDto(Order order, List<VendorOrder> vendorOrders, View view) {
        // Orders from before vendor sub-orders existed only have a flat item list.
        List<ItemDto> legacyItems = vendorOrders.isEmpty()
                ? order.getItems().stream().map(ItemDto::from).toList()
                : List.of();
        String reference = paymentRepository.findByOrderId(order.getId()).map(Payment::getProviderReference).orElse(null);
        return new OrderDto(
                order.getId(),
                order.getOrderNumber() != null ? order.getOrderNumber() : "#" + order.getId(),
                order.getCustomer().getId(),
                order.getCustomer().getName(),
                order.getContactName(),
                order.getContactPhone(),
                order.getContactEmail(),
                shippingAddress(order),
                order.getBillLine1() == null ? null : new AddressDto(order.getBillLine1(), order.getBillLine2(),
                        order.getBillCity(), order.getBillState(), order.getBillPin()),
                order.getGstNumber(),
                order.getNotes(),
                order.getItemsSubtotal(),
                order.getShippingTotal(),
                order.getTaxTotal(),
                order.getTotalAmount(),
                order.getStatus(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                reference,
                order.getCreatedAt(),
                vendorOrders.stream().map(vo -> toDto(vo, view)).toList(),
                legacyItems);
    }

    public VendorOrderDto toDto(VendorOrder vo, View view) {
        Order order = vo.getOrder();
        boolean commercial = view != View.BUYER;
        return new VendorOrderDto(
                vo.getId(),
                vo.getSubOrderNumber(),
                order.getId(),
                order.getOrderNumber(),
                vo.getVendor().getId(),
                vo.getVendor().getBusinessName(),
                vo.getVendor().getSlug(),
                vo.getVendor().getGstNumber(),
                vendorAddress(vo.getVendor()),
                vo.getStatus(),
                vo.getItems().stream().map(ItemDto::from).toList(),
                vo.getItemsSubtotal(),
                vo.getTaxAmount(),
                vo.getShippingAmount(),
                vo.getTotalAmount(),
                vo.getRefundAmount(),
                vo.getCourierName(),
                vo.getTrackingNumber(),
                vo.getTrackingUrl(),
                vo.getDispatchDate(),
                vo.getCancelReason(),
                order.getPaymentMethod(),
                order.getPaymentStatus(),
                vo.getCreatedAt(),
                vo.getUpdatedAt(),
                vo.getDeliveredAt(),
                commercial ? order.getContactName() : null,
                commercial ? order.getContactPhone() : null,
                commercial ? shippingAddress(order) : null,
                commercial ? order.getNotes() : null,
                commercial ? vo.getPlatformFee() : null,
                commercial ? vo.getGatewayFee() : null,
                commercial ? vo.getVendorPayable() : null,
                commercial ? vo.getSettlementStatus() : null);
    }

    private AddressDto shippingAddress(Order order) {
        return order.getShipLine1() == null ? null
                : new AddressDto(order.getShipLine1(), order.getShipLine2(), order.getShipCity(), order.getShipState(), order.getShipPin());
    }

    private static String vendorAddress(Vendor v) {
        return java.util.stream.Stream.of(v.getAddressLine(), v.getCity(), v.getState(), v.getPin())
                .filter(part -> part != null && !part.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));
    }

    private static String suffix(int index) {
        return index < 26 ? String.valueOf((char) ('A' + index)) : "Z" + (index - 25);
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal percentOf(BigDecimal amount, BigDecimal percent) {
        return money(amount.multiply(percent).divide(HUNDRED, 4, RoundingMode.HALF_UP));
    }
}
