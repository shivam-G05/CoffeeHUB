package com.coffeehub.common;

import java.text.Normalizer;
import java.util.Locale;
import java.util.function.Predicate;

public final class Slugs {

    private Slugs() {
    }

    public static String slugify(String input) {
        String s = Normalizer.normalize(input == null ? "" : input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (s.isEmpty()) {
            return "item";
        }
        return s.length() > 80 ? s.substring(0, 80) : s;
    }

    public static String unique(String base, Predicate<String> exists) {
        String slug = slugify(base);
        String candidate = slug;
        int i = 2;
        while (exists.test(candidate)) {
            candidate = slug + "-" + i++;
        }
        return candidate;
    }
}
