package com.coffeehub.messaging;

import com.coffeehub.audit.AuditService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.ContactMasker;
import com.coffeehub.common.PageDto;
import com.coffeehub.notification.NotificationService;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.vendor.Vendor;
import com.coffeehub.vendor.VendorRepositories.VendorRepository;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class MessagingService {

    public interface ConversationRepository extends JpaRepository<Conversation, Long> {

        Page<Conversation> findByBuyerIdOrderByLastMessageAtDesc(Long buyerId, Pageable pageable);

        Page<Conversation> findByVendorIdOrderByLastMessageAtDesc(Long vendorId, Pageable pageable);

        Page<Conversation> findByFlaggedTrueOrderByLastMessageAtDesc(Pageable pageable);

        Optional<Conversation> findFirstByBuyerIdAndVendorIdAndContextTypeAndContextId(
                Long buyerId, Long vendorId, Conversation.ContextType contextType, Long contextId);
    }

    public interface MessageRepository extends JpaRepository<Message, Long> {

        List<Message> findTop200ByConversationIdOrderByCreatedAtDesc(Long conversationId);

        Optional<Message> findFirstByConversationIdOrderByCreatedAtDesc(Long conversationId);
    }

    public record MessageDto(Long id, Long senderId, String senderName, boolean mine, String body, boolean flagged, Instant createdAt) {
    }

    public record ConversationDto(Long id, String subject, Conversation.ContextType contextType, Long contextId,
                                  Long buyerId, String buyerName, Long vendorId, String vendorName, String vendorSlug,
                                  String lastMessagePreview, Instant lastMessageAt, boolean unread, boolean flagged,
                                  List<MessageDto> messages) {
    }

    public record StartRequest(@NotNull Long vendorId, Conversation.ContextType contextType, Long contextId,
                               @Size(max = 200) String subject, @NotBlank @Size(max = 4000) String message) {
    }

    public record SendRequest(@NotBlank @Size(max = 4000) String message) {
    }

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final VendorRepository vendorRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    /** A buyer opens (or reuses) a thread with a vendor and sends the first message. */
    public ConversationDto start(User buyer, StartRequest req) {
        Vendor vendor = vendorRepository.findById(req.vendorId())
                .filter(Vendor::isVerified)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Supplier not found"));
        Conversation.ContextType type = req.contextType() == null ? Conversation.ContextType.GENERAL : req.contextType();
        String subject = req.subject() == null || req.subject().isBlank() ? "Inquiry for " + vendor.getBusinessName() : req.subject().trim();
        Conversation conversation = ensure(buyer, vendor, type, req.contextId(), subject);
        append(conversation, buyer, req.message());
        return detail(conversation, buyer);
    }

    /** Finds the thread for this buyer / vendor / context, creating it if needed. */
    public Conversation ensure(User buyer, Vendor vendor, Conversation.ContextType type, Long contextId, String subject) {
        return conversationRepository
                .findFirstByBuyerIdAndVendorIdAndContextTypeAndContextId(buyer.getId(), vendor.getId(), type, contextId)
                .orElseGet(() -> conversationRepository.save(Conversation.builder()
                        .buyer(buyer)
                        .vendor(vendor)
                        .contextType(type)
                        .contextId(contextId)
                        .subject(subject)
                        .build()));
    }

    public ConversationDto send(User sender, Long conversationId, String body) {
        Conversation conversation = findForParticipant(sender, conversationId);
        append(conversation, sender, body);
        return detail(conversation, sender);
    }

    @Transactional(readOnly = true)
    public PageDto<ConversationDto> list(User user, int page, int size) {
        Pageable pageable = PageDto.request(page, size, Sort.unsorted());
        if (user.getRole() == Role.SELLER) {
            Long vendorId = vendorRepository.findByUserId(user.getId()).map(Vendor::getId).orElse(-1L);
            return PageDto.from(conversationRepository.findByVendorIdOrderByLastMessageAtDesc(vendorId, pageable), c -> summary(c, user));
        }
        return PageDto.from(conversationRepository.findByBuyerIdOrderByLastMessageAtDesc(user.getId(), pageable), c -> summary(c, user));
    }

    /** Opening a thread marks it read for that participant. */
    public ConversationDto open(User user, Long conversationId) {
        Conversation conversation = findForParticipant(user, conversationId);
        if (isBuyer(conversation, user)) {
            conversation.setBuyerLastReadAt(Instant.now());
        } else {
            conversation.setVendorLastReadAt(Instant.now());
        }
        return detail(conversation, user);
    }

    // ---- admin review: limited to threads the contact-sharing filter flagged, and every read is audited

    @Transactional(readOnly = true)
    public PageDto<ConversationDto> flagged(int page, int size) {
        return PageDto.from(
                conversationRepository.findByFlaggedTrueOrderByLastMessageAtDesc(PageDto.request(page, size, Sort.unsorted())),
                c -> summary(c, null));
    }

    public ConversationDto adminOpen(User admin, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .filter(Conversation::isFlagged)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));
        auditService.log(admin, "CONVERSATION_REVIEWED", "Conversation", conversationId, "Flagged thread opened for policy review");
        return detail(conversation, admin);
    }

    // ---------------------------------------------------------------- helpers

    private void append(Conversation conversation, User sender, String rawBody) {
        ContactMasker.Result masked = ContactMasker.mask(rawBody.trim());
        boolean fromBuyer = isBuyer(conversation, sender);

        // Track how quickly the vendor answers buyers, shown on their storefront.
        if (!fromBuyer) {
            messageRepository.findFirstByConversationIdOrderByCreatedAtDesc(conversation.getId())
                    .filter(last -> last.getSender().getId().equals(conversation.getBuyer().getId()))
                    .ifPresent(last -> {
                        double hours = Duration.between(last.getCreatedAt(), Instant.now()).toMinutes() / 60.0;
                        Vendor vendor = conversation.getVendor();
                        Double average = vendor.getAvgResponseHours();
                        vendor.setAvgResponseHours(average == null ? hours : average * 0.8 + hours * 0.2);
                    });
        }

        messageRepository.save(Message.builder()
                .conversation(conversation)
                .sender(sender)
                .body(masked.text())
                .flagged(masked.flagged())
                .build());
        String preview = masked.text().length() > 280 ? masked.text().substring(0, 280) : masked.text();
        conversation.setLastMessagePreview(preview);
        conversation.setLastMessageAt(Instant.now());
        if (masked.flagged()) {
            conversation.setFlagged(true);
        }
        if (fromBuyer) {
            conversation.setBuyerLastReadAt(Instant.now());
            notificationService.notify(conversation.getVendor().getUser(), "NEW_MESSAGE",
                    "New message: " + conversation.getSubject(), preview, "/seller/messages/" + conversation.getId());
        } else {
            conversation.setVendorLastReadAt(Instant.now());
            notificationService.notify(conversation.getBuyer(), "NEW_MESSAGE",
                    "New message from " + conversation.getVendor().getBusinessName(), preview,
                    "/customer/messages/" + conversation.getId());
        }
    }

    private Conversation findForParticipant(User user, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Conversation not found"));
        boolean isVendor = conversation.getVendor().getUser().getId().equals(user.getId());
        if (!isBuyer(conversation, user) && !isVendor) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Conversation not found");
        }
        return conversation;
    }

    private boolean isBuyer(Conversation conversation, User user) {
        return conversation.getBuyer().getId().equals(user.getId());
    }

    private ConversationDto summary(Conversation c, User viewer) {
        return dto(c, viewer, List.of());
    }

    private ConversationDto detail(Conversation c, User viewer) {
        List<MessageDto> messages = messageRepository.findTop200ByConversationIdOrderByCreatedAtDesc(c.getId()).stream()
                .map(m -> new MessageDto(m.getId(), m.getSender().getId(), senderName(c, m.getSender()),
                        viewer != null && m.getSender().getId().equals(viewer.getId()), m.getBody(), m.isFlagged(), m.getCreatedAt()))
                .sorted((a, b) -> a.createdAt().compareTo(b.createdAt()))
                .toList();
        return dto(c, viewer, messages);
    }

    /** Vendors are shown by business name and buyers by company or first name: no personal contact details. */
    private String senderName(Conversation c, User sender) {
        if (sender.getId().equals(c.getBuyer().getId())) {
            return buyerDisplayName(sender);
        }
        return c.getVendor().getBusinessName();
    }

    public static String buyerDisplayName(User buyer) {
        if (buyer.getCompanyName() != null && !buyer.getCompanyName().isBlank()) {
            return buyer.getCompanyName();
        }
        return buyer.getName().trim().split("\\s+")[0];
    }

    private ConversationDto dto(Conversation c, User viewer, List<MessageDto> messages) {
        boolean unread = false;
        if (viewer != null && viewer.getRole() != Role.ADMIN) {
            Instant lastRead = isBuyer(c, viewer) ? c.getBuyerLastReadAt() : c.getVendorLastReadAt();
            unread = lastRead == null || lastRead.isBefore(c.getLastMessageAt());
        }
        return new ConversationDto(c.getId(), c.getSubject(), c.getContextType(), c.getContextId(),
                c.getBuyer().getId(), buyerDisplayName(c.getBuyer()), c.getVendor().getId(), c.getVendor().getBusinessName(),
                c.getVendor().getSlug(), c.getLastMessagePreview(), c.getLastMessageAt(), unread, c.isFlagged(), messages);
    }
}
