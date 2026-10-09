package com.coffeehub.admin;

import com.coffeehub.admin.AdminService.AuditDto;
import com.coffeehub.admin.AdminService.LoginDto;
import com.coffeehub.admin.AdminService.Report;
import com.coffeehub.cafe.dto.CafeDto;
import com.coffeehub.common.PageDto;
import com.coffeehub.user.Role;
import com.coffeehub.user.User;
import com.coffeehub.user.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public AdminStatsDto stats() {
        return adminService.stats();
    }

    @GetMapping("/reports/summary")
    public Report report(@RequestParam(defaultValue = "30") int days) {
        return adminService.report(days);
    }

    @GetMapping("/reports/transactions.csv")
    public ResponseEntity<byte[]> transactionsCsv(@RequestParam(defaultValue = "90") int days) {
        return csv("coffeehub-transactions.csv", adminService.transactionsCsv(days));
    }

    @GetMapping("/reports/settlements.csv")
    public ResponseEntity<byte[]> settlementsCsv() {
        return csv("coffeehub-settlements.csv", adminService.settlementsCsv());
    }

    @GetMapping("/users")
    public PageDto<UserDto> users(@RequestParam(required = false) Role role,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return adminService.users(role, page, size);
    }

    @PutMapping("/users/{id}/toggle")
    public UserDto toggleUser(@AuthenticationPrincipal User admin, @PathVariable Long id) {
        return adminService.toggleUser(admin, id);
    }

    @GetMapping("/users/{id}/logins")
    public PageDto<LoginDto> loginHistory(@PathVariable Long id,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size) {
        return adminService.loginHistory(id, page, size);
    }

    @GetMapping("/audit-logs")
    public PageDto<AuditDto> auditLogs(@RequestParam(required = false) String entityType,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "30") int size) {
        return adminService.auditLogs(entityType, page, size);
    }

    @GetMapping("/cafes")
    public List<CafeDto> allCafes() {
        return adminService.allCafes();
    }

    private ResponseEntity<byte[]> csv(String fileName, String content) {
        // UTF-8 BOM so Excel reads ₹ and non-ASCII names correctly.
        byte[] body = ("﻿" + content).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(body);
    }
}
