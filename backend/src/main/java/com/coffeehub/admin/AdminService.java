package com.coffeehub.admin;

import com.coffeehub.audit.AuditLog;
import com.coffeehub.audit.AuditLogRepository;
import com.coffeehub.audit.AuditService;
import com.coffeehub.auth.AuthRepositories.LoginEventRepository;
import com.coffeehub.auth.LoginEvent;
import com.coffeehub.cafe.CafeRepository;
import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.PageDto;
import com.coffeehub.dispute.DisputeService;
import com.coffeehub.order.OrderRepositories.SettlementRepository;
import com.coffeehub.order.OrderRepositories.VendorOrderRepository;
import com.coffeehub.order.OrderRepository;
import com.coffeehub.order.OrderStatus;
import com.coffeehub.order.Settlement;
import com.coffeehub.order.VendorOrder;
import com.coffeehub.product.ProductRepository;
import com.coffeehub.product.ProductStatus;
import com.coffeehub.rfq.Quote;
import com.coffeehub.rfq.RfqRepositories.QuoteRepository;
import com.coffeehub.rfq.RfqRepositories.RfqRepository;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserDto;
import com.coffeehub.user.UserRepository;
import com.coffeehub.vendor.VendorRepositories.VendorRepository;
import com.coffeehub.vendor.VendorStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private static final Set<OrderStatus> NOT_COUNTED = EnumSet.of(OrderStatus.CANCELLED, OrderStatus.REFUNDED);
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final CafeRepository cafeRepository;
    private final OrderRepository orderRepository;
    private final VendorOrderRepository vendorOrderRepository;
    private final SettlementRepository settlementRepository;
    private final VendorRepository vendorRepository;
    private final RfqRepository rfqRepository;
    private final QuoteRepository quoteRepository;
    private final DisputeService disputeService;
    private final AuditLogRepository auditLogRepository;
    private final LoginEventRepository loginEventRepository;
    private final AuditService auditService;

    public record DayPoint(String date, BigDecimal sales, long orders) {
    }

    public record VendorSales(Long vendorId, String vendorName, BigDecimal sales, long orders) {
    }

    public record Report(AdminStatsDto stats, List<DayPoint> salesByDay, List<VendorSales> topVendors) {
    }

    public record AuditDto(Long id, String actorEmail, String actorRole, String action, String entityType, String entityId,
                           String details, String ip, Instant createdAt) {
        static AuditDto from(AuditLog a) {
            return new AuditDto(a.getId(), a.getActorEmail(), a.getActorRole(), a.getAction(), a.getEntityType(),
                    a.getEntityId(), a.getDetails(), a.getIp(), a.getCreatedAt());
        }
    }

    public record LoginDto(Long id, String identifier, boolean success, String ip, String userAgent, Instant createdAt) {
        static LoginDto from(LoginEvent e) {
            return new LoginDto(e.getId(), e.getIdentifier(), e.isSuccess(), e.getIp(), e.getUserAgent(), e.getCreatedAt());
        }
    }

    @Transactional(readOnly = true)
    public AdminStatsDto stats() {
        BigDecimal gmv = vendorOrderRepository.sumTotal(NOT_COUNTED);
        long orders = orderRepository.count();
        long quotes = quoteRepository.count();
        long accepted = quoteRepository.countByStatus(Quote.Status.ACCEPTED);
        return new AdminStatsDto(
                gmv,
                vendorOrderRepository.sumPlatformFee(NOT_COUNTED),
                orders,
                orders == 0 ? BigDecimal.ZERO : gmv.divide(BigDecimal.valueOf(orders), 2, RoundingMode.HALF_UP),
                vendorRepository.countByStatus(VendorStatus.APPROVED),
                vendorRepository.countByStatus(VendorStatus.PENDING_VERIFICATION) + vendorRepository.countByStatus(VendorStatus.UNDER_REVIEW),
                productRepository.count(),
                productRepository.countByStatus(ProductStatus.PENDING),
                rfqRepository.count(),
                quotes,
                quotes == 0 ? 0 : Math.round(accepted * 1000.0 / quotes) / 10.0,
                disputeService.activeCount(),
                vendorOrderRepository.sumRefunds(),
                userRepository.countByRole(Role.CUSTOMER),
                userRepository.countByRole(Role.SELLER),
                cafeRepository.count(),
                cafeRepository.findAll().stream().filter(c -> !c.isApproved()).count()
        );
    }

    /** KPIs plus daily sales and top vendors over the last N days. */
    @Transactional(readOnly = true)
    public Report report(int days) {
        int window = Math.min(Math.max(days, 1), 365);
        LocalDate today = LocalDate.now(IST);
        Map<LocalDate, BigDecimal[]> byDay = new LinkedHashMap<>();
        for (int i = window - 1; i >= 0; i--) {
            byDay.put(today.minusDays(i), new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }
        Map<Long, Object[]> byVendor = new LinkedHashMap<>();
        Instant since = today.minusDays(window - 1L).atStartOfDay(IST).toInstant();
        for (VendorOrder vo : vendorOrderRepository.findByCreatedAtAfterOrderByCreatedAtAsc(since)) {
            if (NOT_COUNTED.contains(vo.getStatus())) {
                continue;
            }
            BigDecimal[] day = byDay.get(vo.getCreatedAt().atZone(IST).toLocalDate());
            if (day != null) {
                day[0] = day[0].add(vo.getTotalAmount());
                day[1] = day[1].add(BigDecimal.ONE);
            }
            Object[] vendor = byVendor.computeIfAbsent(vo.getVendor().getId(),
                    k -> new Object[]{vo.getVendor().getBusinessName(), BigDecimal.ZERO, 0L});
            vendor[1] = ((BigDecimal) vendor[1]).add(vo.getTotalAmount());
            vendor[2] = (Long) vendor[2] + 1;
        }
        List<DayPoint> salesByDay = new ArrayList<>();
        byDay.forEach((date, v) -> salesByDay.add(new DayPoint(date.toString(), v[0], v[1].longValue())));
        List<VendorSales> topVendors = byVendor.entrySet().stream()
                .map(e -> new VendorSales(e.getKey(), (String) e.getValue()[0], (BigDecimal) e.getValue()[1], (Long) e.getValue()[2]))
                .sorted((a, b) -> b.sales().compareTo(a.sales()))
                .limit(10)
                .toList();
        return new Report(stats(), salesByDay, topVendors);
    }

    /** Per-vendor-order ledger export: every financial component in its own column so it reconciles. */
    @Transactional(readOnly = true)
    public String transactionsCsv(int days) {
        Instant since = Instant.now().minus(Math.min(Math.max(days, 1), 730), ChronoUnit.DAYS);
        StringBuilder csv = new StringBuilder("Order,Sub-order,Date,Vendor,Buyer,Status,Payment method,Payment status,"
                + "Items subtotal,Tax (included),Shipping,Order value,Platform fee,Gateway fee,Refund,Vendor payable,Settlement status\n");
        for (VendorOrder vo : vendorOrderRepository.findByCreatedAtAfterOrderByCreatedAtAsc(since)) {
            row(csv, vo.getOrder().getOrderNumber(), vo.getSubOrderNumber(), vo.getCreatedAt().atZone(IST).toLocalDate(),
                    vo.getVendor().getBusinessName(), vo.getOrder().getCustomer().getName(), vo.getStatus(),
                    vo.getOrder().getPaymentMethod(), vo.getOrder().getPaymentStatus(), vo.getItemsSubtotal(), vo.getTaxAmount(),
                    vo.getShippingAmount(), vo.getTotalAmount(), vo.getPlatformFee(), vo.getGatewayFee(), vo.getRefundAmount(),
                    vo.getVendorPayable(), vo.getSettlementStatus());
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String settlementsCsv() {
        StringBuilder csv = new StringBuilder("Settlement,Date,Vendor,Amount,Orders,Reference,Note\n");
        for (Settlement s : settlementRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))) {
            row(csv, s.getId(), s.getCreatedAt().atZone(IST).toLocalDate(), s.getVendor().getBusinessName(), s.getAmount(),
                    s.getOrderCount(), s.getReference(), s.getNote());
        }
        return csv.toString();
    }

    // ---------------------------------------------------------------- users

    @Transactional(readOnly = true)
    public PageDto<UserDto> users(Role role, int page, int size) {
        var pageable = PageDto.request(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageDto.from(role == null ? userRepository.findAll(pageable) : userRepository.findByRole(role, pageable), UserDto::from);
    }

    public UserDto toggleUser(User admin, Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getRole() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin accounts cannot be disabled");
        }
        user.setEnabled(!user.isEnabled());
        auditService.log(admin, user.isEnabled() ? "USER_ENABLED" : "USER_BLOCKED", "User", id, user.getEmail());
        return UserDto.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public PageDto<LoginDto> loginHistory(Long userId, int page, int size) {
        return PageDto.from(
                loginEventRepository.findByUserIdOrderByCreatedAtDesc(userId, PageDto.request(page, size, Sort.unsorted())),
                LoginDto::from);
    }

    @Transactional(readOnly = true)
    public PageDto<AuditDto> auditLogs(String entityType, int page, int size) {
        var pageable = PageDto.request(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageDto.from(
                entityType == null || entityType.isBlank()
                        ? auditLogRepository.findAll(pageable)
                        : auditLogRepository.findByEntityType(entityType, pageable),
                AuditDto::from);
    }

    @Transactional(readOnly = true)
    public List<CafeDto> allCafes() {
        return cafeRepository.findAll().stream().map(CafeDto::from).toList();
    }

    // ---------------------------------------------------------------- csv

    private static void row(StringBuilder csv, Object... cells) {
        for (int i = 0; i < cells.length; i++) {
            if (i > 0) {
                csv.append(',');
            }
            csv.append(cell(cells[i]));
        }
        csv.append('\n');
    }

    private static String cell(Object value) {
        if (value == null) {
            return "";
        }
        String s = value.toString();
        // Neutralise spreadsheet formula injection from user-supplied text such as business names.
        if (!(value instanceof Number) && !s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }
        if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
