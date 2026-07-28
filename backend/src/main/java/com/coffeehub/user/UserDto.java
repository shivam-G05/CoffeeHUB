package com.coffeehub.user;

public record UserDto(
        Long id,
        String name,
        String email,
        String phone,
        Role role,
        boolean enabled,
        String referralCode,
        int loyaltyPoints
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
                user.getLoyaltyPoints()
        );
    }
}
