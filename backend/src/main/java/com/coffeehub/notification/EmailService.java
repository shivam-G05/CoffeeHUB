package com.coffeehub.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Email delivery channel. Uses SMTP when spring.mail.* is configured
 * (SPRING_MAIL_HOST etc.); otherwise logs the message so local/dev flows such
 * as password reset remain usable without a mail server.
 */
@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String from;

    public EmailService(ObjectProvider<JavaMailSender> mailSender,
                        @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender.getIfAvailable();
        this.from = from;
    }

    @Async
    public void send(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return;
        }
        if (mailSender == null) {
            log.info("[email not configured] to={} subject={}\n{}", to, subject, body);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.warn("Could not send email to {}: {}", to, e.getMessage());
        }
    }
}
