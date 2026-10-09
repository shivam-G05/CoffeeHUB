package com.coffeehub.common;

import java.util.regex.Pattern;

/**
 * Basic detection of phone numbers / email addresses in buyer-seller messages, to
 * reduce immediate off-platform leakage. Deliberately simple: it catches the
 * obvious cases, it is not a determined-evasion filter.
 */
public final class ContactMasker {

    private static final Pattern EMAIL = Pattern.compile(
            "[A-Za-z0-9._%+-]+\\s*(@|\\(at\\)|\\[at\\])\\s*[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    private static final Pattern PHONE = Pattern.compile(
            "(?<!\\d)(?:\\+?91[\\s-]?)?(?:\\d[\\s-]?){10}(?!\\d)");
    private static final String PLACEHOLDER = "[contact details hidden]";

    public record Result(String text, boolean flagged) {
    }

    private ContactMasker() {
    }

    public static Result mask(String text) {
        if (text == null || text.isBlank()) {
            return new Result(text, false);
        }
        String masked = EMAIL.matcher(text).replaceAll(PLACEHOLDER);
        masked = PHONE.matcher(masked).replaceAll(PLACEHOLDER);
        return new Result(masked, !masked.equals(text));
    }
}
