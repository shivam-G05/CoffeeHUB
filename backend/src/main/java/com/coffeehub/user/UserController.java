package com.coffeehub.user;

import com.coffeehub.audit.AuditService;
import com.coffeehub.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal User user) {
        return UserDto.from(user);
    }

    @PutMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal User user, @Valid @RequestBody UpdateProfileRequest req) {
        user.setName(req.name());
        if (req.phone() != null) {
            user.setPhone(req.phone());
        }
        user.setCompanyName(blankToNull(req.companyName()));
        user.setGstNumber(blankToNull(req.gstNumber()));
        user.setBusinessType(blankToNull(req.businessType()));
        return UserDto.from(userRepository.save(user));
    }

    @PostMapping("/me/password")
    public void changePassword(@AuthenticationPrincipal User user, @Valid @RequestBody ChangePasswordRequest req) {
        if (!passwordEncoder.matches(req.currentPassword(), user.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        auditService.log(user, "PASSWORD_CHANGED", "User", user.getId(), null);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String newPassword
    ) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 30) String phone,
            @Size(max = 255) String companyName,
            @Size(max = 20) String gstNumber,
            @Size(max = 100) String businessType
    ) {}
}
