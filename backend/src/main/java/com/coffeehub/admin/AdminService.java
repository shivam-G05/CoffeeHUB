package com.coffeehub.admin;

import com.coffeehub.cafe.CafeRepository;
import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.common.ApiException;
import com.coffeehub.order.Order;
import com.coffeehub.order.OrderRepository;
import com.coffeehub.order.OrderStatus;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.product.dto.ProductDto;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserDto;
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
public class AdminService {

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final CafeRepository cafeRepository;
    private final OrderRepository orderRepository;

    public AdminStatsDto stats() {
        long totalOrders = orderRepository.count();
        BigDecimal revenue = orderRepository.findAllByOrderByCreatedAtDesc().stream()
                .filter(o -> o.getStatus() != OrderStatus.CANCELLED)
                .map(Order::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new AdminStatsDto(
                userRepository.findByRole(Role.CUSTOMER).size(),
                userRepository.findByRole(Role.SELLER).size(),
                productRepository.count(),
                productRepository.findAll().stream().filter(p -> !p.isApproved()).count(),
                cafeRepository.count(),
                cafeRepository.findAll().stream().filter(c -> !c.isApproved()).count(),
                totalOrders,
                revenue
        );
    }

    public List<UserDto> users(Role role) {
        List<User> users = role == null ? userRepository.findAll() : userRepository.findByRole(role);
        return users.stream().map(UserDto::from).toList();
    }

    public UserDto toggleUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        user.setEnabled(!user.isEnabled());
        return UserDto.from(userRepository.save(user));
    }

    public List<ProductDto> allProducts() {
        return productRepository.findAll().stream().map(ProductDto::from).toList();
    }

    public List<CafeDto> allCafes() {
        return cafeRepository.findAll().stream().map(CafeDto::from).toList();
    }
}
