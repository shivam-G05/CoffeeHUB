package com.coffeehub.dispute;

import com.coffeehub.common.PageDto;
import com.coffeehub.dispute.DisputeService.CreateRequest;
import com.coffeehub.dispute.DisputeService.DisputeDto;
import com.coffeehub.dispute.DisputeService.ResolveRequest;
import com.coffeehub.dispute.DisputeService.RespondRequest;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;

    @PostMapping("/api/disputes")
    @PreAuthorize("hasRole('CUSTOMER')")
    public DisputeDto create(@AuthenticationPrincipal User buyer, @Valid @RequestBody CreateRequest request) {
        return disputeService.create(buyer, request);
    }

    @GetMapping("/api/disputes/mine")
    @PreAuthorize("hasRole('CUSTOMER')")
    public List<DisputeDto> mine(@AuthenticationPrincipal User buyer) {
        return disputeService.mine(buyer);
    }

    @GetMapping("/api/vendor/disputes")
    @PreAuthorize("hasRole('SELLER')")
    public List<DisputeDto> forVendor(@AuthenticationPrincipal User seller) {
        return disputeService.forVendor(seller);
    }

    @PostMapping("/api/vendor/disputes/{id}/respond")
    @PreAuthorize("hasRole('SELLER')")
    public DisputeDto respond(@AuthenticationPrincipal User seller, @PathVariable Long id, @Valid @RequestBody RespondRequest request) {
        return disputeService.respond(seller, id, request.response());
    }

    @GetMapping("/api/admin/disputes")
    public PageDto<DisputeDto> adminList(@RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return disputeService.adminList(page, size);
    }

    @PostMapping("/api/admin/disputes/{id}/resolve")
    public DisputeDto resolve(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody ResolveRequest request) {
        return disputeService.resolve(admin, id, request);
    }
}
