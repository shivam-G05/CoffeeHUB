package com.coffeehub.seo;

import com.coffeehub.content.ContentBlock;
import com.coffeehub.product.ProductStatus;
import com.coffeehub.vendor.VendorStatus;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * XML sitemap of every publicly visible page on the storefront site. It is served by the API because only
 * the API knows which listings are live; the storefront's robots.txt points crawlers here.
 */
@RestController
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SitemapController {

    private static final List<String> STATIC_PATHS = List.of(
            "/", "/products", "/suppliers", "/post-requirement", "/products/compare", "/help", "/register/seller");

    private static final DateTimeFormatter W3C_DATE = DateTimeFormatter.ISO_LOCAL_DATE.withZone(ZoneOffset.UTC);

    private final EntityManager em;

    @Value("${app.frontend-url}")
    private String siteUrl;

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        String base = siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
        StringBuilder xml = new StringBuilder(8192)
                .append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");

        STATIC_PATHS.forEach(path -> url(xml, base + path, null));

        em.createQuery("""
                        select c.slug from Category c
                        where c.active = true and c.slug is not null
                        order by c.slug""", String.class)
                .getResultList()
                .forEach(slug -> url(xml, base + "/category/" + slug, null));

        em.createQuery("""
                        select v.slug, v.createdAt from Vendor v
                        where v.status = :approved and v.slug is not null
                        order by v.id""", Object[].class)
                .setParameter("approved", VendorStatus.APPROVED)
                .getResultList()
                .forEach(row -> url(xml, base + "/suppliers/" + row[0], (Instant) row[1]));

        // Same visibility rule as the public catalogue: live listing from an approved vendor.
        em.createQuery("""
                        select p.id, p.slug, p.createdAt from Product p
                        where p.status in :live and p.vendor.status = :approved
                        order by p.id""", Object[].class)
                .setParameter("live", List.of(ProductStatus.APPROVED, ProductStatus.OUT_OF_STOCK))
                .setParameter("approved", VendorStatus.APPROVED)
                .getResultList()
                .forEach(row -> url(xml, base + "/products/" + (row[1] != null ? row[1] : row[0]), (Instant) row[2]));

        em.createQuery("""
                        select b.slug, b.updatedAt from ContentBlock b
                        where b.type = :policy and b.active = true and b.slug is not null
                        order by b.slug""", Object[].class)
                .setParameter("policy", ContentBlock.Type.POLICY)
                .getResultList()
                .forEach(row -> url(xml, base + "/policies/" + row[0], (Instant) row[1]));

        xml.append("</urlset>\n");
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                .contentType(MediaType.APPLICATION_XML)
                .body(xml.toString());
    }

    private static void url(StringBuilder xml, String loc, Instant lastModified) {
        xml.append("  <url><loc>").append(escape(loc)).append("</loc>");
        if (lastModified != null) {
            xml.append("<lastmod>").append(W3C_DATE.format(lastModified)).append("</lastmod>");
        }
        xml.append("</url>\n");
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
