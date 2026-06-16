#!/bin/bash
set -e

echo "🐸 WebHop WordPress Setup Starting..."

# Wait for database to be ready
echo "Waiting for database..."
max_tries=60
count=0
until mysql -h "${WORDPRESS_DB_HOST:-db}" -u "${WORDPRESS_DB_USER:-wordpress}" \
      -p"${WORDPRESS_DB_PASSWORD:-wordpress}" "${WORDPRESS_DB_NAME:-wordpress}" \
      -e "SELECT 1" > /dev/null 2>&1; do
  count=$((count + 1))
  if [ $count -ge $max_tries ]; then
    echo "ERROR: Database not ready after ${max_tries} attempts"
    exit 1
  fi
  echo "  Waiting for DB... attempt $count/$max_tries"
  sleep 2
done

echo "✅ Database connected"

SITE_URL="${WP_SITE_URL:-http://localhost:8080}"
ADMIN_USER="${WP_ADMIN_USER:-admin}"
ADMIN_PASS="${WP_ADMIN_PASSWORD:-WebHop2024!}"
ADMIN_EMAIL="${WP_ADMIN_EMAIL:-admin@webhop.local}"
SITE_TITLE="${WP_SITE_TITLE:-WebHop Generated Site}"

# Check if WP is already installed
if wp core is-installed --path=/var/www/html --allow-root 2>/dev/null; then
  echo "✅ WordPress already installed — skipping setup"
  exit 0
fi

echo "Installing WordPress core..."
wp core install \
  --path=/var/www/html \
  --url="$SITE_URL" \
  --title="$SITE_TITLE" \
  --admin_user="$ADMIN_USER" \
  --admin_password="$ADMIN_PASS" \
  --admin_email="$ADMIN_EMAIL" \
  --skip-email \
  --allow-root

echo "✅ WordPress core installed"

# Set permalink structure
wp rewrite structure '/%postname%/' --path=/var/www/html --allow-root
wp rewrite flush --path=/var/www/html --allow-root

# Delete default content
wp post delete 1 --force --path=/var/www/html --allow-root 2>/dev/null || true
wp post delete 2 --force --path=/var/www/html --allow-root 2>/dev/null || true

# Delete hello dolly plugin
wp plugin delete hello --path=/var/www/html --allow-root 2>/dev/null || true

# Activate WebHop theme
if [ -d "/var/www/html/wp-content/themes/webhop-theme" ]; then
  wp theme activate webhop-theme --path=/var/www/html --allow-root
  echo "✅ WebHop theme activated"
fi

# Set reasonable WordPress options
wp option update blog_public 1 --path=/var/www/html --allow-root
wp option update default_comment_status 'closed' --path=/var/www/html --allow-root
wp option update timezone_string 'America/Chicago' --path=/var/www/html --allow-root
wp option update date_format 'F j, Y' --path=/var/www/html --allow-root

# Create REST API application password for our backend
wp user application-password create "$ADMIN_USER" webhop-api --path=/var/www/html --allow-root || true

# Enable REST API
wp option update rest_namespace '' --path=/var/www/html --allow-root 2>/dev/null || true

# Disable XML-RPC for security
wp option update enable_xmlrpc 0 --path=/var/www/html --allow-root 2>/dev/null || true

echo ""
echo "🎉 WebHop WordPress setup complete!"
echo "   URL:   $SITE_URL"
echo "   Admin: $SITE_URL/wp-admin"
echo "   User:  $ADMIN_USER"
echo ""
