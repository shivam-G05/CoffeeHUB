package com.coffeehub.file;

import com.coffeehub.common.ApiException;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private static final Set<String> IMAGE_TYPES = Set.of("image/png", "image/jpeg", "image/webp", "image/avif");
    private static final String PDF = "application/pdf";
    private static final long MAX_IMAGE_BYTES = 3L * 1024 * 1024;
    private static final long MAX_DOCUMENT_BYTES = 5L * 1024 * 1024;

    private final StoredFileRepository storedFileRepository;

    public record FileDto(String id, String url, String fileName, String contentType, long size) {
        public static FileDto from(StoredFile f) {
            return new FileDto(f.getId().toString(), "/api/files/" + f.getId(), f.getFileName(), f.getContentType(), f.getSize());
        }
    }

    /**
     * visibility=public: images only (product photos, logos, dispute evidence).
     * visibility=private: images or PDF, readable only by the uploader and admins (verification documents).
     */
    @PostMapping
    @Transactional
    public FileDto upload(@AuthenticationPrincipal User user,
                          @RequestParam("file") MultipartFile file,
                          @RequestParam(defaultValue = "public") String visibility) throws IOException {
        boolean isPublic = !"private".equalsIgnoreCase(visibility);
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        boolean isImage = IMAGE_TYPES.contains(contentType);
        if (isPublic && !isImage) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only PNG, JPEG, WebP or AVIF images are allowed");
        }
        if (!isPublic && !isImage && !PDF.equals(contentType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only PDF or image files are allowed");
        }
        long limit = isImage ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
        if (file.getSize() > limit) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "File is too large (max " + limit / (1024 * 1024) + " MB)");
        }
        String name = file.getOriginalFilename() == null ? "upload" : file.getOriginalFilename().replaceAll("[\\\\/\\r\\n\"]", "_");
        StoredFile saved = storedFileRepository.save(StoredFile.builder()
                .owner(user)
                .fileName(name.length() > 200 ? name.substring(name.length() - 200) : name)
                .contentType(contentType)
                .size(file.getSize())
                .publicAccess(isPublic)
                .data(file.getBytes())
                .build());
        return FileDto.from(saved);
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> download(@AuthenticationPrincipal User viewer, @PathVariable UUID id) {
        StoredFile file = storedFileRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "File not found"));
        if (!file.isPublicAccess()) {
            boolean allowed = viewer != null
                    && (viewer.getRole() == Role.ADMIN || file.getOwner().getId().equals(viewer.getId()));
            if (!allowed) {
                // 404 rather than 403 so private documents' existence isn't revealed.
                throw new ApiException(HttpStatus.NOT_FOUND, "File not found");
            }
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(file.getContentType()));
        headers.setContentDisposition(ContentDisposition.inline().filename(file.getFileName(), StandardCharsets.UTF_8).build());
        headers.setCacheControl(file.isPublicAccess()
                ? CacheControl.maxAge(Duration.ofDays(30)).cachePublic()
                : CacheControl.noStore());
        return new ResponseEntity<>(file.getData(), headers, HttpStatus.OK);
    }
}
