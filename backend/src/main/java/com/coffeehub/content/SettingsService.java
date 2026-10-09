package com.coffeehub.content;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SettingsService {

    public static final String BRAND_NAME = "brand_name";
    public static final String BRAND_TAGLINE = "brand_tagline";
    public static final String SUPPORT_EMAIL = "support_email";
    public static final String DEFAULT_COMMISSION_PERCENT = "default_commission_percent";
    public static final String GATEWAY_FEE_PERCENT = "gateway_fee_percent";
    public static final String BANK_TRANSFER_INSTRUCTIONS = "bank_transfer_instructions";

    private final PlatformSettingRepository repository;

    public String get(String key, String fallback) {
        return repository.findById(key)
                .map(PlatformSetting::getValue)
                .filter(v -> v != null && !v.isBlank())
                .orElse(fallback);
    }

    public BigDecimal decimal(String key, String fallback) {
        try {
            return new BigDecimal(get(key, fallback).trim());
        } catch (NumberFormatException e) {
            return new BigDecimal(fallback);
        }
    }
}
