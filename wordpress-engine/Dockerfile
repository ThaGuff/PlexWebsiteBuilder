FROM wordpress:6.5-php8.2-apache

# Install system utilities and WP-CLI dependencies
# --no-install-recommends prevents apt from pulling in a second Apache MPM module
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    less \
    mariadb-client \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install WP-CLI
RUN curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x wp-cli.phar \
    && mv wp-cli.phar /usr/local/bin/wp

# Install PHP extensions for optimal WordPress performance
RUN docker-php-ext-install \
    opcache \
    pdo_mysql \
    mysqli

# Enable Apache mod_rewrite for WordPress permalinks
RUN a2enmod rewrite

# Configure OPcache for performance
RUN { \
    echo 'opcache.memory_consumption=128'; \
    echo 'opcache.interned_strings_buffer=8'; \
    echo 'opcache.max_accelerated_files=4000'; \
    echo 'opcache.revalidate_freq=2'; \
    echo 'opcache.fast_shutdown=1'; \
    echo 'opcache.enable_cli=1'; \
} > /usr/local/etc/php/conf.d/opcache-recommended.ini

# Upload size limits
RUN { \
    echo 'upload_max_filesize = 64M'; \
    echo 'post_max_size = 64M'; \
    echo 'memory_limit = 256M'; \
    echo 'max_execution_time = 300'; \
} > /usr/local/etc/php/conf.d/uploads.ini

# Copy WordPress files from our zip (pre-extracted)
COPY ./wordpress/ /var/www/html/

# Copy our custom theme
COPY ./themes/webhop-theme/ /var/www/html/wp-content/themes/webhop-theme/

# Copy setup scripts
COPY ./scripts/ /docker-entrypoint-initdb.d-custom/
RUN chmod +x /docker-entrypoint-initdb.d-custom/*.sh 2>/dev/null || true

# Copy custom entrypoint
COPY ./scripts/setup.sh /usr/local/bin/webhop-setup.sh
RUN chmod +x /usr/local/bin/webhop-setup.sh

# Custom entrypoint script content is written via a separate script file
# (./scripts/webhop-entrypoint.sh) and copied in below, rather than generated
# inline with echo, to avoid quoting bugs. See that file for the Railway MPM
# runtime fix and dynamic PORT handling.
COPY ./scripts/webhop-entrypoint.sh /usr/local/bin/webhop-entrypoint.sh
RUN chmod +x /usr/local/bin/webhop-entrypoint.sh

# Apache config for WordPress
RUN { \
    echo '<Directory /var/www/html/>'; \
    echo '    Options FollowSymLinks'; \
    echo '    AllowOverride All'; \
    echo '    Require all granted'; \
    echo '</Directory>'; \
} > /etc/apache2/conf-available/wordpress.conf \
    && a2enconf wordpress

WORKDIR /var/www/html

# Add this comment as documentation: WORDPRESS_CONFIG_EXTRA is set as an
# environment variable on the Railway service (not here) to:
#   $_SERVER['HTTPS'] = 'on';
# Railway terminates TLS at its edge for all real external traffic, but its
# internal healthcheck prober (RailwayHealthCheck/1.0) connects directly to
# the container over plain HTTP without forwarding the X-Forwarded-Proto
# header that wp-config-docker.php normally relies on to detect HTTPS. Since
# WP_SITE_URL is configured as an https:// URL, WordPress's canonical
# redirect logic then 302s every single request (including the healthcheck
# itself) forever, because it always sees the request as "wrong protocol".
# Forcing HTTPS detection unconditionally resolves this without weakening
# anything, since this app is never legitimately reached over plain HTTP.

EXPOSE 80

ENTRYPOINT ["webhop-entrypoint.sh"]
CMD ["apache2-foreground"]

# Health check — generous start period since first boot needs to wait for
# MySQL + run WP-CLI install before wp-login.php responds correctly
HEALTHCHECK --interval=10s --timeout=10s --start-period=180s --retries=10 \
    CMD curl -fs "http://localhost:${PORT:-80}/" -o /dev/null || curl -fs "http://localhost:${PORT:-80}/wp-login.php" -o /dev/null || exit 1
