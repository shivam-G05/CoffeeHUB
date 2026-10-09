package com.coffeehub.notification;

import com.coffeehub.common.PageDto;
import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public record NotificationDto(Long id, String type, String title, String body, String link, boolean read, Instant createdAt) {
        static NotificationDto from(Notification n) {
            return new NotificationDto(n.getId(), n.getType(), n.getTitle(), n.getBody(), n.getLink(), n.getReadAt() != null, n.getCreatedAt());
        }
    }

    @GetMapping
    public PageDto<NotificationDto> list(@AuthenticationPrincipal User user,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return PageDto.from(
                notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageDto.request(page, size, Sort.unsorted())),
                NotificationDto::from);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(@AuthenticationPrincipal User user) {
        return Map.of("count", notificationRepository.countByUserIdAndReadAtIsNull(user.getId()));
    }

    @PostMapping("/{id}/read")
    @Transactional
    public void markRead(@AuthenticationPrincipal User user, @PathVariable Long id) {
        notificationRepository.findByIdAndUserId(id, user.getId()).ifPresent(n -> {
            if (n.getReadAt() == null) {
                n.setReadAt(Instant.now());
            }
        });
    }

    @PostMapping("/read-all")
    @Transactional
    public void markAllRead(@AuthenticationPrincipal User user) {
        notificationRepository.markAllRead(user.getId(), Instant.now());
    }
}
