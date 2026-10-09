package com.coffeehub.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public final class AuthRepositories {

    private AuthRepositories() {
    }

    public interface AuthTokenRepository extends JpaRepository<AuthToken, Long> {

        Optional<AuthToken> findByTokenHashAndType(String tokenHash, AuthToken.Type type);
    }

    public interface LoginEventRepository extends JpaRepository<LoginEvent, Long> {

        Page<LoginEvent> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    }
}
