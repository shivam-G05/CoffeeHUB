package com.coffeehub.user;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

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
        return UserDto.from(userRepository.save(user));
    }

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 30) String phone
    ) {}
}
