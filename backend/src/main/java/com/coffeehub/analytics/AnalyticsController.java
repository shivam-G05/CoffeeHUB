package com.coffeehub.analytics;

import com.coffeehub.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * First-party funnel analytics: the storefront posts named events
 * (signup -> search -> product view -> cart -> checkout -> purchase, and the RFQ
 * equivalents) so acquisition-to-transaction conversion can be measured.
 */
@RestController
@RequiredArgsConstructor
public class AnalyticsController {

    /** Funnel order; also the allow-list of accepted event names. */
    public static final List<String> EVENTS = List.of(
            "signup_started", "signup_completed", "vendor_registration", "vendor_approved",
            "search", "product_view", "supplier_view", "add_to_cart", "checkout_started", "purchase",
            "rfq_started", "rfq_submitted", "quote_received", "quote_accepted");

    private static final Set<String> ALLOWED = Set.copyOf(EVENTS);

    public interface AnalyticsEventRepository extends JpaRepository<AnalyticsEvent, Long> {

        @Query("select e.name, count(e) from AnalyticsEvent e where e.createdAt >= :since group by e.name")
        List<Object[]> countsSince(@Param("since") Instant since);
    }

    public record EventRequest(@NotBlank @Size(max = 50) String name, @Size(max = 64) String sessionId,
                               @Size(max = 500) String detail) {
    }

    private final AnalyticsEventRepository repository;

    @PostMapping("/api/analytics/events")
    public void track(@AuthenticationPrincipal User user, @Valid @RequestBody EventRequest request) {
        if (!ALLOWED.contains(request.name())) {
            return;
        }
        repository.save(AnalyticsEvent.builder()
                .name(request.name())
                .userId(user != null ? user.getId() : null)
                .sessionId(request.sessionId())
                .detail(request.detail())
                .build());
    }

    /** Event counts for the last N days, in funnel order. */
    @GetMapping("/api/admin/analytics")
    public Map<String, Long> summary(@RequestParam(defaultValue = "30") int days) {
        Map<String, Long> counts = new LinkedHashMap<>();
        EVENTS.forEach(name -> counts.put(name, 0L));
        Instant since = Instant.now().minus(Math.min(Math.max(days, 1), 365), ChronoUnit.DAYS);
        for (Object[] row : repository.countsSince(since)) {
            counts.computeIfPresent((String) row[0], (k, v) -> (Long) row[1]);
        }
        return counts;
    }
}
