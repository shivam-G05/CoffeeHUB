package com.coffeehub.config;

import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserRepository;
import com.coffeehub.vendor.VendorRepositories.VendorRepository;
import com.coffeehub.vendor.VendorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Connection;
import java.util.List;
import java.util.Map;

/**
 * Brings a database created by an earlier version in line with the current model.
 * Needed because the schema is managed by Hibernate's ddl-auto=update, which adds
 * tables/columns but never revises existing constraints or data. Every step is
 * idempotent, so it is safe on every startup and on a fresh database.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class LegacySchemaFixer implements ApplicationRunner {

    private final JdbcTemplate jdbc;
    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final VendorService vendorService;

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        if (!isPostgres()) {
            return;
        }
        dropEnumCheckConstraints();

        // Products from before the moderation workflow only had an "approved" flag.
        jdbc.update("update product set status = case when approved then 'APPROVED' else 'PENDING' end where status is null");

        // Every seller account gets a vendor record. Existing sellers start as DRAFT:
        // they must complete verification before their listings are public again.
        for (User seller : userRepository.findByRole(Role.SELLER)) {
            if (vendorRepository.findByUserId(seller.getId()).isEmpty()) {
                vendorService.createDraft(seller, seller.getName());
            }
        }
        vendorRepository.flush();
        jdbc.update("update product p set vendor_id = v.id from vendor v where p.vendor_id is null and v.user_id = p.seller_id");
    }

    /**
     * Hibernate creates a CHECK constraint listing the enum values for each enum
     * column, but "update" never alters it, so adding an enum value (new order
     * statuses, etc.) would make inserts fail on an existing database. The
     * application validates enum values itself, so the constraints are dropped.
     */
    private void dropEnumCheckConstraints() {
        List<Map<String, Object>> constraints = jdbc.queryForList("""
                select conrelid::regclass::text as table_name, conname
                from pg_constraint
                where contype = 'c' and connamespace = current_schema()::regnamespace and conname like '%\\_check'
                """);
        for (Map<String, Object> c : constraints) {
            jdbc.execute("alter table " + c.get("table_name") + " drop constraint if exists \"" + c.get("conname") + "\"");
        }
        if (!constraints.isEmpty()) {
            log.info("Dropped {} enum check constraint(s) left by schema auto-update", constraints.size());
        }
    }

    private boolean isPostgres() throws Exception {
        try (Connection connection = jdbc.getDataSource().getConnection()) {
            return "PostgreSQL".equalsIgnoreCase(connection.getMetaData().getDatabaseProductName());
        }
    }
}
