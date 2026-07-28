package com.coffeehub.auth.dto;

import com.coffeehub.user.UserDto;

public record AuthResponse(String token, UserDto user) {
}
