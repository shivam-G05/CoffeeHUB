package com.coffeehub.order;

import com.coffeehub.common.ApiException;
import com.coffeehub.order.dto.CreateOrderRequest;
import com.coffeehub.order.dto.OrderDto;
import com.coffeehub.order.dto.UpdateStatusRequest;
import com.coffeehub.product.Product;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.user.User;
import com.coffeehub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class OrderService {

    private static final int POINTS_PER_100_RUPEES = 1;

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public OrderDto create(User customer, CreateOrderRequest request) {
        Order order = Order.builder()
                .customer(customer)
                .totalAmount(BigDecimal.ZERO)
                .build();

        BigDecimal total = BigDecimal.ZERO;
        for (CreateOrderRequest.Item itemReq : request.items()) {
            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Product " + itemReq.productId() + " not found"));

            if (!product.isApproved()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, product.getName() + " is not available for purchase");
            }
            if (product.getStock() < itemReq.quantity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Not enough stock for " + product.getName());
            }

            product.setStock(product.getStock() - itemReq.quantity());
            productRepository.save(product);

            OrderItem item = OrderItem.builder()
                    .product(product)
                    .quantity(itemReq.quantity())
                    .unitPrice(product.getPrice())
                    .build();
            order.addItem(item);

            total = total.add(product.getPrice().multiply(BigDecimal.valueOf(itemReq.quantity())));
        }

        order.setTotalAmount(total);
        Order saved = orderRepository.save(order);

        int earnedPoints = total.intValue() / 100 * POINTS_PER_100_RUPEES;
        if (earnedPoints > 0) {
            customer.setLoyaltyPoints(customer.getLoyaltyPoints() + earnedPoints);
            userRepository.save(customer);
        }

        return OrderDto.from(saved);
    }

    public List<OrderDto> mine(User customer) {
        return orderRepository.findByCustomerOrderByCreatedAtDesc(customer).stream().map(OrderDto::from).toList();
    }

    public List<OrderDto> forSeller(User seller) {
        return orderRepository.findDistinctByItems_Product_SellerOrderByCreatedAtDesc(seller).stream().map(OrderDto::from).toList();
    }

    public List<OrderDto> all() {
        return orderRepository.findAllByOrderByCreatedAtDesc().stream().map(OrderDto::from).toList();
    }

    public OrderDto updateStatus(User requester, Long id, UpdateStatusRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Order not found"));

        boolean isAdmin = requester.getRole().name().equals("ADMIN");
        boolean isSellerOfItem = order.getItems().stream()
                .anyMatch(i -> i.getProduct().getSeller().getId().equals(requester.getId()));

        if (!isAdmin && !isSellerOfItem) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot update this order");
        }

        order.setStatus(request.status());
        return OrderDto.from(orderRepository.save(order));
    }
}
