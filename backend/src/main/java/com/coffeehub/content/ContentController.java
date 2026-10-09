package com.coffeehub.content;

import com.coffeehub.audit.AuditService;
import com.coffeehub.common.ApiException;
import com.coffeehub.common.Slugs;
import com.coffeehub.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Public CMS content and settings, plus their admin management endpoints. */
@RestController
@RequiredArgsConstructor
@Transactional
public class ContentController {

    public interface ContentBlockRepository extends JpaRepository<ContentBlock, Long> {

        List<ContentBlock> findByTypeAndActiveTrueOrderBySortOrderAscIdAsc(ContentBlock.Type type);

        List<ContentBlock> findAllByOrderByTypeAscSortOrderAscIdAsc();

        Optional<ContentBlock> findFirstByTypeAndSlugAndActiveTrue(ContentBlock.Type type, String slug);

        boolean existsByTypeAndSlug(ContentBlock.Type type, String slug);
    }

    public record ContentDto(Long id, ContentBlock.Type type, String slug, String title, String body, String imageUrl,
                             String linkUrl, int sortOrder, boolean active, Instant updatedAt) {
        static ContentDto from(ContentBlock c) {
            return new ContentDto(c.getId(), c.getType(), c.getSlug(), c.getTitle(), c.getBody(), c.getImageUrl(),
                    c.getLinkUrl(), c.getSortOrder(), c.isActive(), c.getUpdatedAt());
        }
    }

    public record ContentRequest(@NotNull ContentBlock.Type type, @NotBlank @Size(max = 255) String title,
                                 @Size(max = 20000) String body, @Size(max = 500) String imageUrl,
                                 @Size(max = 500) String linkUrl, int sortOrder, boolean active) {
    }

    public record SettingDto(String key, String value, String description, boolean publicSetting) {
    }

    public record SettingUpdate(@NotBlank String key, @Size(max = 2000) String value) {
    }

    private final ContentBlockRepository contentRepository;
    private final PlatformSettingRepository settingRepository;
    private final AuditService auditService;

    // ---- public

    @GetMapping("/api/content")
    @Transactional(readOnly = true)
    public List<ContentDto> byType(@RequestParam ContentBlock.Type type) {
        return contentRepository.findByTypeAndActiveTrueOrderBySortOrderAscIdAsc(type).stream().map(ContentDto::from).toList();
    }

    @GetMapping("/api/content/{type}/{slug}")
    @Transactional(readOnly = true)
    public ContentDto page(@PathVariable ContentBlock.Type type, @PathVariable String slug) {
        return contentRepository.findFirstByTypeAndSlugAndActiveTrue(type, slug)
                .map(ContentDto::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Page not found"));
    }

    /** Brand name, tagline, support email: lets the platform be rebranded without a code change. */
    @GetMapping("/api/settings/public")
    @Transactional(readOnly = true)
    public Map<String, String> publicSettings() {
        Map<String, String> settings = new LinkedHashMap<>();
        settingRepository.findByPublicSettingTrue().forEach(s -> settings.put(s.getKey(), s.getValue()));
        return settings;
    }

    // ---- admin (/api/admin/** is ADMIN-only in SecurityConfig)

    @GetMapping("/api/admin/content")
    @Transactional(readOnly = true)
    public List<ContentDto> adminList() {
        return contentRepository.findAllByOrderByTypeAscSortOrderAscIdAsc().stream().map(ContentDto::from).toList();
    }

    @PostMapping("/api/admin/content")
    public ContentDto create(@AuthenticationPrincipal User admin, @Valid @RequestBody ContentRequest req) {
        ContentBlock block = ContentBlock.builder()
                .type(req.type())
                .slug(Slugs.unique(req.title(), slug -> contentRepository.existsByTypeAndSlug(req.type(), slug)))
                .build();
        apply(block, req);
        ContentBlock saved = contentRepository.save(block);
        auditService.log(admin, "CONTENT_CREATED", "ContentBlock", saved.getId(), req.type() + ": " + req.title());
        return ContentDto.from(saved);
    }

    @PutMapping("/api/admin/content/{id}")
    public ContentDto update(@AuthenticationPrincipal User admin, @PathVariable Long id, @Valid @RequestBody ContentRequest req) {
        ContentBlock block = contentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Content not found"));
        apply(block, req);
        auditService.log(admin, "CONTENT_UPDATED", "ContentBlock", id, req.type() + ": " + req.title());
        return ContentDto.from(block);
    }

    @DeleteMapping("/api/admin/content/{id}")
    public void delete(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        contentRepository.findById(id).ifPresent(block -> {
            contentRepository.delete(block);
            auditService.log(admin, "CONTENT_DELETED", "ContentBlock", id, block.getType() + ": " + block.getTitle());
        });
    }

    @GetMapping("/api/admin/settings")
    @Transactional(readOnly = true)
    public List<SettingDto> settings() {
        return settingRepository.findAll().stream()
                .map(s -> new SettingDto(s.getKey(), s.getValue(), s.getDescription(), s.isPublicSetting()))
                .sorted((a, b) -> a.key().compareTo(b.key()))
                .toList();
    }

    @PutMapping("/api/admin/settings")
    public List<SettingDto> updateSettings(@AuthenticationPrincipal User admin, @Valid @RequestBody List<@Valid SettingUpdate> updates) {
        for (SettingUpdate update : updates) {
            PlatformSetting setting = settingRepository.findById(update.key())
                    .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Unknown setting " + update.key()));
            String value = update.value() == null ? "" : update.value().trim();
            if (update.key().endsWith("_percent")) {
                try {
                    double percent = Double.parseDouble(value);
                    if (percent < 0 || percent > 100) {
                        throw new NumberFormatException();
                    }
                } catch (NumberFormatException e) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, update.key() + " must be a number between 0 and 100");
                }
            }
            if (!value.equals(setting.getValue())) {
                auditService.log(admin, "SETTING_CHANGED", "PlatformSetting", update.key(), setting.getValue() + " -> " + value);
                setting.setValue(value);
            }
        }
        return settings();
    }

    private void apply(ContentBlock block, ContentRequest req) {
        block.setType(req.type());
        block.setTitle(req.title().trim());
        block.setBody(req.body());
        block.setImageUrl(blankToNull(req.imageUrl()));
        block.setLinkUrl(blankToNull(req.linkUrl()));
        block.setSortOrder(req.sortOrder());
        block.setActive(req.active());
        block.setUpdatedAt(Instant.now());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
