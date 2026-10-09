package com.coffeehub.user;

import java.time.Instant;

public record UserDto(
        Long id,
        String name,
        String email,
        String phone,
        Role role,
        boolean enabled,
        String referralCode,
        int loyaltyPoints,
        String companyName,
        String gstNumber,
        String businessType,
        boolean emailVerified,
        Instant createdAt
) {
    public static UserDto from(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.isEnabled(),
                user.getReferralCode(),
                user.getLoyaltyPoints(),
                user.getCompanyName(),
                user.getGstNumber(),
                user.getBusinessType(),
                user.isEmailVerified(),
                user.getCreatedAt()
        );
    }
}
