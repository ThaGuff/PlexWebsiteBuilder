FROM wordpress:6.5-php8.2-apache

# Install system utilities and WP-CLI dependencies
RUN apt-get update && apt-get install -y \
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

# Apache config for WordPress
RUN { \
    echo '<Directory /var/www/html/>'; \
    echo '    Options FollowSymLinks'; \
    echo '    AllowOverride All'; \
    echo '    Require all granted'; \
    echo '</Directory>'; \
} > /etc/apache2/conf-available/wordpress.conf \
    && a2enconf wordpress

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/wp-login.php || exit 1
