package com.coffeehub.auth;

import com.coffeehub.auth.AuthRepositories.AuthTokenRepository;
import com.coffeehub.auth.AuthRepositories.LoginEventRepository;
import com.coffeehub.auth.dto.AuthResponse;
import com.coffeehub.auth.dto.LoginRequest;
import com.coffeehub.auth.dto.RegisterRequest;
import com.coffeehub.auth.dto.RegisterSellerRequest;
import com.coffeehub.audit.AuditService;
import com.coffeehub.common.ApiException;
import com.coffeehub.notification.EmailService;
import com.coffeehub.security.JwtService;
import com.coffeehub.security.UserDetailsServiceImpl;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserDto;
import com.coffeehub.user.UserRepository;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private static final int REFERRAL_BONUS_POINTS = 50;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final Duration RESET_TOKEN_TTL = Duration.ofHours(1);
    private static final Duration VERIFY_TOKEN_TTL = Duration.ofDays(3);

    private final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final LoginEventRepository loginEventRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsServiceImpl userLookup;
    private final VendorService vendorService;
    private final EmailService emailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public AuthResponse register(RegisterRequest request) {
        String phone = UserDetailsServiceImpl.normalizePhone(request.phone());
        assertAvailable(request.email(), phone);

        Optional<User> referrer = Optional.ofNullable(request.referralCode())
                .filter(code -> !code.isBlank())
                .flatMap(code -> userRepository.findByReferralCode(code.trim().toUpperCase()));

        User saved = userRepository.save(User.builder()
                .name(request.name().trim())
                .email(request.email().trim().toLowerCase())
                .password(passwordEncoder.encode(request.password()))
                .phone(phone)
                .role(Role.CUSTOMER)
                .enabled(true)
                .companyName(blankToNull(request.companyName()))
                .gstNumber(blankToNull(request.gstNumber()))
                .businessType(blankToNull(request.businessType()))
                .referralCode(generateUniqueReferralCode())
                .referredBy(referrer.map(User::getReferralCode).orElse(null))
                .loyaltyPoints(referrer.isPresent() ? REFERRAL_BONUS_POINTS : 0)
                .build());

        referrer.ifPresent(r -> {
            r.setLoyaltyPoints(r.getLoyaltyPoints() + REFERRAL_BONUS_POINTS);
            userRepository.save(r);
        });

        sendVerificationEmail(saved);
        return new AuthResponse(jwtService.generateToken(saved), UserDto.from(saved));
    }

    public AuthResponse registerSeller(RegisterSellerRequest request) {
        String phone = UserDetailsServiceImpl.normalizePhone(request.phone());
        assertAvailable(request.email(), phone);

        User saved = userRepository.save(User.builder()
                .name(request.contactPerson().trim())
                .email(request.email().trim().toLowerCase())
                .password(passwordEncoder.encode(request.password()))
                .phone(phone)
                .role(Role.SELLER)
                .enabled(true)
                .referralCode(generateUniqueReferralCode())
                .build());

        // The vendor starts in DRAFT: registering never makes a seller live.
        Vendor vendor = vendorService.createDraft(saved, request.businessName().trim());
        vendor.setVendorType(request.vendorType());
        vendor.setWebsite(blankToNull(request.website()));
        vendor.setAddressLine(request.addressLine().trim());
        vendor.setCity(request.city().trim());
        vendor.setState(request.state().trim());
        vendor.setPin(request.pin());

        sendVerificationEmail(saved);
        return new AuthResponse(jwtService.generateToken(saved), UserDto.from(saved));
    }

    // A failed login must still be recorded, so the auth failure must not roll the transaction back.
    @Transactional(noRollbackFor = AuthenticationException.class)
    public AuthResponse login(LoginRequest request, HttpServletRequest http) {
        String identifier = request.identifier().trim();
        try {
            User user = (User) authenticationManager
                    .authenticate(new UsernamePasswordAuthenticationToken(identifier, request.password()))
                    .getPrincipal();
            user.setLastLoginAt(Instant.now());
            userRepository.save(user);
            recordLogin(user.getId(), identifier, true, http);
            return new AuthResponse(jwtService.generateToken(user), UserDto.from(user));
        } catch (AuthenticationException e) {
            recordLogin(userLookup.findByIdentifier(identifier).map(User::getId).orElse(null), identifier, false, http);
            throw e;
        }
    }

    /** Always succeeds from the caller's point of view, so it cannot be used to discover registered emails. */
    public void forgotPassword(String email) {
        userRepository.findByEmail(email.trim().toLowerCase()).filter(User::isEnabled).ifPresent(user -> {
            String token = issueToken(user, AuthToken.Type.PASSWORD_RESET, RESET_TOKEN_TTL);
            emailService.send(user.getEmail(), "Reset your CoffeeHub password",
                    "Use this link to choose a new password. It expires in 1 hour.\n\n"
                            + frontendUrl + "/reset-password?token=" + token
                            + "\n\nIf you didn't ask for this, you can ignore this email.");
        });
    }

    public void resetPassword(String token, String newPassword) {
        AuthToken authToken = consumeToken(token, AuthToken.Type.PASSWORD_RESET);
        User user = authToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void verifyEmail(String token) {
        AuthToken authToken = consumeToken(token, AuthToken.Type.EMAIL_VERIFICATION);
        User user = authToken.getUser();
        user.setEmailVerified(true);
        userRepository.save(user);
    }

    public void resendVerification(User user) {
        if (!user.isEmailVerified()) {
            sendVerificationEmail(user);
        }
    }

    // ---------------------------------------------------------------- helpers

    private void assertAvailable(String email, String phone) {
        if (userRepository.existsByEmail(email.trim().toLowerCase())) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        if (userRepository.existsByPhone(phone)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this mobile number already exists");
        }
    }

    private void sendVerificationEmail(User user) {
        String token = issueToken(user, AuthToken.Type.EMAIL_VERIFICATION, VERIFY_TOKEN_TTL);
        emailService.send(user.getEmail(), "Verify your CoffeeHub email",
                "Welcome to CoffeeHub. Confirm your email address:\n\n" + frontendUrl + "/verify-email?token=" + token);
    }

    private String issueToken(User user, AuthToken.Type type, Duration ttl) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        authTokenRepository.save(AuthToken.builder()
                .user(user)
                .type(type)
                .tokenHash(sha256(token))
                .expiresAt(Instant.now().plus(ttl))
                .build());
        return token;
    }

    private AuthToken consumeToken(String token, AuthToken.Type type) {
        AuthToken authToken = authTokenRepository.findByTokenHashAndType(sha256(token == null ? "" : token), type)
                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "This link is invalid or has expired"));
        authToken.setUsedAt(Instant.now());
        return authToken;
    }

    private void recordLogin(Long userId, String identifier, boolean success, HttpServletRequest http) {
        String agent = http.getHeader("User-Agent");
        loginEventRepository.save(LoginEvent.builder()
                .userId(userId)
                .identifier(identifier.length() > 255 ? identifier.substring(0, 255) : identifier)
                .success(success)
                .ip(AuditService.clientIp(http))
                .userAgent(agent != null && agent.length() > 300 ? agent.substring(0, 300) : agent)
                .build());
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private String generateUniqueReferralCode() {
        String code;
        do {
            StringBuilder sb = new StringBuilder("CH");
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_ALPHABET.charAt(random.nextInt(CODE_ALPHABET.length())));
            }
            code = sb.toString();
        } while (userRepository.existsByReferralCode(code));
        return code;
    }
}
