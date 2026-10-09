package com.coffeehub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-memory per-IP rate limit for the login/register endpoints, to blunt
 * brute-force and credential-stuffing/spam-registration attempts. Fine as
 * in-memory state since this app runs as a single instance (no horizontal
 * scaling), so there's no need for a shared store like Redis.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final Set<String> LIMITED_PATHS = Set.of(
            "/api/auth/login", "/api/auth/register", "/api/auth/register-seller",
            "/api/auth/forgot-password", "/api/auth/reset-password", "/api/auth/resend-verification");
    private static final int MAX_REQUESTS_PER_WINDOW = 10;
    private static final long WINDOW_MS = 60_000;
    private static final int MAX_TRACKED_IPS = 10_000;

    private record Window(AtomicInteger count, long windowStart) {
    }

    private final ConcurrentHashMap<String, Window> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (!LIMITED_PATHS.contains(request.getServletPath())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (buckets.size() > MAX_TRACKED_IPS) {
            buckets.clear();
        }

        String key = clientIp(request);
        long now = System.currentTimeMillis();
        Window window = buckets.compute(key, (k, existing) -> {
            if (existing == null || now - existing.windowStart() > WINDOW_MS) {
                return new Window(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });

        if (window.count().get() > MAX_REQUESTS_PER_WINDOW) {
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("""
                    {"timestamp":"%s","status":429,"error":"Too Many Requests","message":"Too many attempts, please try again in a minute"}
                    """.formatted(Instant.now()));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
