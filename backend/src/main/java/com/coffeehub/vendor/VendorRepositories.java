package com.coffeehub.vendor;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

/** Spring Data repositories for the vendor module, grouped in one file. */
public final class VendorRepositories {

    private VendorRepositories() {
    }

    public interface VendorRepository extends JpaRepository<Vendor, Long>, JpaSpecificationExecutor<Vendor> {

        Optional<Vendor> findByUserId(Long userId);

        Optional<Vendor> findBySlug(String slug);

        boolean existsBySlug(String slug);

        long countByStatus(VendorStatus status);

        List<Vendor> findByStatusAndFeaturedTrue(VendorStatus status);
    }

    public interface VendorDocumentRepository extends JpaRepository<VendorDocument, Long> {

        List<VendorDocument> findByVendorIdOrderByUploadedAtDesc(Long vendorId);

        Optional<VendorDocument> findByIdAndVendorId(Long id, Long vendorId);
    }

    public interface VendorBankAccountRepository extends JpaRepository<VendorBankAccount, Long> {

        Optional<VendorBankAccount> findByVendorId(Long vendorId);
    }

    public interface SavedSupplierRepository extends JpaRepository<SavedSupplier, Long> {

        List<SavedSupplier> findByUserIdOrderByCreatedAtDesc(Long userId);

        Optional<SavedSupplier> findByUserIdAndVendorId(Long userId, Long vendorId);
    }
}
