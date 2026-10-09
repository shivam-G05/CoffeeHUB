package com.coffeehub.rfq;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public final class RfqRepositories {

    private RfqRepositories() {
    }

    public interface RfqRepository extends JpaRepository<Rfq, Long> {

        Page<Rfq> findByBuyerIdOrderByCreatedAtDesc(Long buyerId, Pageable pageable);

        Page<Rfq> findAllByOrderByCreatedAtDesc(Pageable pageable);

        Page<Rfq> findByStatusOrderByCreatedAtDesc(Rfq.Status status, Pageable pageable);
    }

    public interface RfqVendorRepository extends JpaRepository<RfqVendor, Long> {

        List<RfqVendor> findByRfqId(Long rfqId);

        Optional<RfqVendor> findByRfqIdAndVendorId(Long rfqId, Long vendorId);

        Page<RfqVendor> findByVendorIdOrderByInvitedAtDesc(Long vendorId, Pageable pageable);

        long countByRfqId(Long rfqId);
    }

    public interface QuoteRepository extends JpaRepository<Quote, Long> {

        List<Quote> findByRfqIdOrderByPricePerUnitAsc(Long rfqId);

        Optional<Quote> findByRfqIdAndVendorId(Long rfqId, Long vendorId);

        Page<Quote> findByVendorIdOrderByCreatedAtDesc(Long vendorId, Pageable pageable);

        Page<Quote> findAllByOrderByCreatedAtDesc(Pageable pageable);

        long countByRfqId(Long rfqId);

        long countByStatus(Quote.Status status);
    }
}
