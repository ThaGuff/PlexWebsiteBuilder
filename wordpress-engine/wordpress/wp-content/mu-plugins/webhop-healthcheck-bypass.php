<?php
/**
 * Plugin Name: WebHop Railway Healthcheck Bypass
 * Description: Serves a plain 200 OK directly to Railway's internal healthcheck
 *              prober, bypassing WordPress's canonical URL redirect logic.
 *
 * Background: Railway's healthcheck prober connects to the container directly
 * over its internal network, which can present a Host header and/or protocol
 * that doesn't match this site's configured siteurl/home. WordPress's
 * redirect_canonical() then 302s every request trying to "fix" the URL,
 * which Railway's healthcheck always treats as unhealthy — even though the
 * application itself is running perfectly fine and serving real traffic
 * correctly for actual visitors (who arrive via the public domain over HTTPS
 * and match the configured site URL).
 *
 * This must-use plugin runs on every request, before most of WordPress's
 * routing logic, and short-circuits only for Railway's specific healthcheck
 * user agent — real visitor traffic is completely unaffected.
 */

if (
    isset($_SERVER['HTTP_USER_AGENT']) &&
    stripos($_SERVER['HTTP_USER_AGENT'], 'RailwayHealthCheck') !== false
) {
    http_response_code(200);
    header('Content-Type: text/plain');
    echo 'ok';
    exit;
}
