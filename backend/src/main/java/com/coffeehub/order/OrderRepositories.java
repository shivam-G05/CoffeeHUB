package com.coffeehub.order;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public final class OrderRepositories {

    private OrderRepositories() {
    }

    public interface VendorOrderRepository extends JpaRepository<VendorOrder, Long> {

        List<VendorOrder> findByOrderIdOrderByIdAsc(Long orderId);

        Page<VendorOrder> findByVendorIdOrderByCreatedAtDesc(Long vendorId, Pageable pageable);

        Page<VendorOrder> findByVendorIdAndStatusOrderByCreatedAtDesc(Long vendorId, OrderStatus status, Pageable pageable);

        List<VendorOrder> findByVendorIdAndSettlementStatus(Long vendorId, VendorOrder.SettlementStatus status);

        List<VendorOrder> findBySettlementStatus(VendorOrder.SettlementStatus status);

        List<VendorOrder> findByCreatedAtAfterOrderByCreatedAtAsc(Instant after);

        long countByVendorId(Long vendorId);

        long countByStatusIn(Collection<OrderStatus> statuses);

        @Query("select coalesce(sum(v.totalAmount), 0) from VendorOrder v where v.status not in :excluded")
        BigDecimal sumTotal(@Param("excluded") Collection<OrderStatus> excluded);

        @Query("select coalesce(sum(v.platformFee), 0) from VendorOrder v where v.status not in :excluded")
        BigDecimal sumPlatformFee(@Param("excluded") Collection<OrderStatus> excluded);

        @Query("select coalesce(sum(v.refundAmount), 0) from VendorOrder v")
        BigDecimal sumRefunds();

        @Query("select coalesce(sum(v.vendorPayable), 0) from VendorOrder v where v.vendor.id = :vendorId and v.settlementStatus = :status")
        BigDecimal sumPayable(@Param("vendorId") Long vendorId, @Param("status") VendorOrder.SettlementStatus status);

        @Query("select coalesce(sum(v.totalAmount), 0) from VendorOrder v where v.vendor.id = :vendorId and v.status not in :excluded")
        BigDecimal sumTotalForVendor(@Param("vendorId") Long vendorId, @Param("excluded") Collection<OrderStatus> excluded);
    }

    public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

        /** True when the buyer has received this product: the gate for verified-purchase reviews. */
        @Query("""
                select count(i) > 0 from OrderItem i
                where i.product.id = :productId and i.order.customer.id = :userId
                  and i.vendorOrder.status in :statuses
                """)
        boolean hasPurchased(@Param("productId") Long productId, @Param("userId") Long userId,
                             @Param("statuses") Collection<OrderStatus> statuses);
    }

    public interface PaymentRepository extends JpaRepository<Payment, Long> {

        Optional<Payment> findByOrderId(Long orderId);

        Page<Payment> findAllByOrderByCreatedAtDesc(Pageable pageable);
    }

    public interface SettlementRepository extends JpaRepository<Settlement, Long> {

        List<Settlement> findByVendorIdOrderByCreatedAtDesc(Long vendorId);

        Page<Settlement> findAllByOrderByCreatedAtDesc(Pageable pageable);
    }

    public interface CartItemRepository extends JpaRepository<CartItem, Long> {

        List<CartItem> findByUserIdOrderByIdAsc(Long userId);

        Optional<CartItem> findByUserIdAndProductId(Long userId, Long productId);

        Optional<CartItem> findByIdAndUserId(Long id, Long userId);
    }
}
