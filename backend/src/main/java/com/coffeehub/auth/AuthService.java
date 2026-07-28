package com.coffeehub.auth;

import com.coffeehub.auth.dto.AuthResponse;
import com.coffeehub.auth.dto.LoginRequest;
import com.coffeehub.auth.dto.RegisterRequest;
import com.coffeehub.common.ApiException;
import com.coffeehub.security.JwtService;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserDto;
import com.coffeehub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private static final int REFERRAL_BONUS_POINTS = 50;
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private final SecureRandom random = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        if (request.role() == Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin accounts cannot be self-registered");
        }

        Optional<User> referrer = Optional.ofNullable(request.referralCode())
                .filter(code -> !code.isBlank())
                .flatMap(code -> userRepository.findByReferralCode(code.trim().toUpperCase()));

        User user = User.builder()
                .name(request.name())
                .email(request.email().toLowerCase())
                .password(passwordEncoder.encode(request.password()))
                .phone(request.phone())
                .role(request.role())
                .enabled(true)
                .referralCode(generateUniqueReferralCode())
                .referredBy(referrer.map(User::getReferralCode).orElse(null))
                .loyaltyPoints(referrer.isPresent() ? REFERRAL_BONUS_POINTS : 0)
                .build();

        User saved = userRepository.save(user);

        referrer.ifPresent(r -> {
            r.setLoyaltyPoints(r.getLoyaltyPoints() + REFERRAL_BONUS_POINTS);
            userRepository.save(r);
        });

        String token = jwtService.generateToken(saved);
        return new AuthResponse(token, UserDto.from(saved));
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email().toLowerCase(), request.password())
        );

        User user = userRepository.findByEmail(request.email().toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, UserDto.from(user));
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
