package com.coffeehub.security;

import com.coffeehub.user.User;
import com.coffeehub.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    /** Accepts either an email address or a mobile number as the login identifier. */
    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        return findByIdentifier(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("No user for " + identifier));
    }

    public Optional<User> findByIdentifier(String identifier) {
        if (identifier == null) {
            return Optional.empty();
        }
        String value = identifier.trim();
        if (value.contains("@")) {
            return userRepository.findByEmail(value.toLowerCase());
        }
        return userRepository.findFirstByPhone(normalizePhone(value));
    }

    public static String normalizePhone(String phone) {
        return phone == null ? null : phone.replaceAll("[\\s()-]", "");
    }
}
