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

# Custom entrypoint: run WP-CLI setup in the background (non-blocking),
# then hand off to WordPress's original entrypoint to start Apache
RUN { \
    echo '#!/bin/sh'; \
    echo '/usr/local/bin/webhop-setup.sh > /var/log/webhop-setup.log 2>&1 &'; \
    echo '# Respect Railway'"'"'s dynamic PORT, default to 80 if unset'; \
    echo 'if [ -n "$PORT" ] && [ "$PORT" != "80" ]; then'; \
    echo '  sed -ri "s/Listen 80/Listen $PORT/" /etc/apache2/ports.conf'; \
    echo '  sed -ri "s/:80>/:$PORT>/" /etc/apache2/sites-available/000-default.conf'; \
    echo 'fi'; \
    echo 'exec docker-entrypoint.sh "$@"'; \
} > /usr/local/bin/webhop-entrypoint.sh \
    && chmod +x /usr/local/bin/webhop-entrypoint.sh

# Apache config for WordPress
RUN { \
    echo '<Directory /var/www/html/>'; \
    echo '    Options FollowSymLinks'; \
    echo '    AllowOverride All'; \
    echo '    Require all granted'; \
    echo '</Directory>'; \
} > /etc/apache2/conf-available/wordpress.conf \
    && a2enconf wordpress

# Final, deterministic MPM fix. Earlier attempts using a2enmod/a2dismod on the
# mods-enabled symlinks were silently undone by a later trigger (most likely
# a dpkg/apache2 package reconfigure invoked indirectly by docker-php-ext-install
# or the mariadb-client install), causing the container to crash on every boot
# with "AH00534: apache2: Configuration error: More than one MPM loaded."
# Instead of fighting that state, we rewrite the actual include directive in
# apache2.conf so it can ONLY ever load mpm_prefork.conf/.load, regardless of
# what mods-enabled/ contains at runtime. We also physically delete the
# mpm_event and mpm_worker module files (not just the mods-enabled symlinks)
# so there is nothing left for any trigger to re-enable.
RUN rm -f /etc/apache2/mods-available/mpm_event.load /etc/apache2/mods-available/mpm_event.conf \
           /etc/apache2/mods-available/mpm_worker.load /etc/apache2/mods-available/mpm_worker.conf \
    && rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf \
              /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf \
              /etc/apache2/mods-enabled/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.conf \
    && ln -sf ../mods-available/mpm_prefork.load /etc/apache2/mods-enabled/mpm_prefork.load \
    && ln -sf ../mods-available/mpm_prefork.conf /etc/apache2/mods-enabled/mpm_prefork.conf \
    && apache2ctl -M 2>&1 | grep -c mpm_ | grep -qx 1

EXPOSE 80

ENTRYPOINT ["webhop-entrypoint.sh"]
CMD ["apache2-foreground"]

# Health check — generous start period since first boot needs to wait for
# MySQL + run WP-CLI install before wp-login.php responds correctly
HEALTHCHECK --interval=10s --timeout=10s --start-period=180s --retries=10 \
    CMD curl -fs "http://localhost:${PORT:-80}/" -o /dev/null || curl -fs "http://localhost:${PORT:-80}/wp-login.php" -o /dev/null || exit 1
