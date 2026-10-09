package com.coffeehub.config;

import com.coffeehub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Logs a loud warning at startup for settings that are fine on a developer
 * machine but unsafe on a public deployment. It only warns (it never blocks
 * startup), so check the log after every deploy.
 */
@Slf4j
@Component
@Order(4)
@RequiredArgsConstructor
public class DeploymentWarnings implements ApplicationRunner {

    private static final String DEV_JWT_SECRET = "dev-only-change-this-secret-in-production-min-32-chars";
    private static final String DEFAULT_ADMIN_PASSWORD = "Admin@12345";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.seed.admin-email}")
    private String adminEmail;

    @Value("${app.payments.mock-enabled}")
    private boolean mockPayments;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void run(ApplicationArguments args) {
        // Local development is recognised by the frontend URL still pointing at localhost.
        if (frontendUrl.contains("localhost") || frontendUrl.contains("127.0.0.1")) {
            return;
        }
        if (DEV_JWT_SECRET.equals(jwtSecret)) {
            log.warn("SECURITY: JWT_SECRET is the development default. Anyone can forge login tokens. Set a random JWT_SECRET.");
        }
        userRepository.findByEmail(adminEmail.toLowerCase())
                .filter(admin -> passwordEncoder.matches(DEFAULT_ADMIN_PASSWORD, admin.getPassword()))
                .ifPresent(admin -> log.warn("SECURITY: the admin account {} still uses the documented default password. Change it.", adminEmail));
        if (mockPayments) {
            log.warn("PAYMENTS: PAYMENTS_MOCK_ENABLED is true. Buyers can mark orders as paid without paying. Set it to false.");
        }
    }
}
