#!/bin/sh
set -e

# Run WP-CLI setup in the background (non-blocking) so Apache can start
# immediately while WordPress installs against the database.
/usr/local/bin/webhop-setup.sh > /var/log/webhop-setup.log 2>&1 &

# --- Railway-platform MPM fix -----------------------------------------
# This is a known Railway-platform-specific issue, not something caused
# by this Dockerfile or the upstream php:8.2-apache / wordpress:*-apache
# base images. Multiple unrelated users report the identical
# "AH00534: More than one MPM loaded" failure at container boot with zero
# Dockerfile changes on their end (see Railway community: "More than one
# MPM loaded error on php:8.2-apache image"). The base image's own build
# step already runs `a2dismod mpm_event && a2enmod mpm_prefork` correctly,
# but Railway's runtime environment re-introduces the conflict AFTER the
# image is built and BEFORE the container's first boot — so any fix baked
# into the image at build time gets silently undone. The fix has to run
# live, on every container start, immediately before Apache launches.
a2dismod mpm_event 2>/dev/null || true
a2dismod mpm_worker 2>/dev/null || true
rm -f /etc/apache2/mods-enabled/mpm_event.load /etc/apache2/mods-enabled/mpm_event.conf
rm -f /etc/apache2/mods-enabled/mpm_worker.load /etc/apache2/mods-enabled/mpm_worker.conf
a2enmod mpm_prefork 2>/dev/null || true
# -------------------------------------------------------------------------

# Respect Railway's dynamic PORT, default to 80 if unset
if [ -n "$PORT" ] && [ "$PORT" != "80" ]; then
  sed -ri "s/Listen 80/Listen $PORT/" /etc/apache2/ports.conf
  sed -ri "s/:80>/:$PORT>/" /etc/apache2/sites-available/000-default.conf
fi

exec docker-entrypoint.sh "$@"
