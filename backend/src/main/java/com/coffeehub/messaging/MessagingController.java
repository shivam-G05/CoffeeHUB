package com.coffeehub.messaging;

import com.coffeehub.common.PageDto;
import com.coffeehub.messaging.MessagingService.ConversationDto;
import com.coffeehub.messaging.MessagingService.SendRequest;
import com.coffeehub.messaging.MessagingService.StartRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class MessagingController {

    private final MessagingService messagingService;

    @GetMapping("/api/conversations")
    @PreAuthorize("hasAnyRole('CUSTOMER','SELLER')")
    public PageDto<ConversationDto> list(@AuthenticationPrincipal User user,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "30") int size) {
        return messagingService.list(user, page, size);
    }

    @PostMapping("/api/conversations")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ConversationDto start(@AuthenticationPrincipal User buyer, @Valid @RequestBody StartRequest request) {
        return messagingService.start(buyer, request);
    }

    @GetMapping("/api/conversations/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','SELLER')")
    public ConversationDto open(@AuthenticationPrincipal User user, @PathVariable Long id) {
        return messagingService.open(user, id);
    }

    @PostMapping("/api/conversations/{id}/messages")
    @PreAuthorize("hasAnyRole('CUSTOMER','SELLER')")
    public ConversationDto send(@AuthenticationPrincipal User user, @PathVariable Long id, @Valid @RequestBody SendRequest request) {
        return messagingService.send(user, id, request.message());
    }

    @GetMapping("/api/admin/conversations")
    public PageDto<ConversationDto> flagged(@RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "30") int size) {
        return messagingService.flagged(page, size);
    }

    @GetMapping("/api/admin/conversations/{id}")
    public ConversationDto adminOpen(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        return messagingService.adminOpen(admin, id);
    }
}
