package com.coffeehub.notification;

import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Single entry point for notification events. Every event becomes an in-app
 * notification and an email; further channels (SMS / WhatsApp / push) plug in
 * here without touching the callers.
 */
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Transactional
    public void notify(User user, String type, String title, String body, String link) {
        if (user == null) {
            return;
        }
        notificationRepository.save(Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .body(body)
                .link(link)
                .build());
        String text = (body == null ? "" : body + "\n\n") + (link == null ? "" : frontendUrl + link);
        emailService.send(user.getEmail(), title, text);
    }

    @Transactional
    public void notifyAdmins(String type, String title, String body, String link) {
        for (User admin : userRepository.findByRole(Role.ADMIN)) {
            notify(admin, type, title, body, link);
        }
    }
}
