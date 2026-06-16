<?php
/**
 * WebHop Theme — Footer Template
 */
$business_name = get_option('webhop_business_name', get_bloginfo('name'));
$tagline       = get_option('webhop_tagline', get_bloginfo('description'));
$phone         = get_option('webhop_phone');
$email         = get_option('webhop_email');
$address       = get_option('webhop_address');
?>

    <!-- Site Footer -->
    <footer id="site-footer" role="contentinfo">
        <div class="site-footer-inner">
            <div class="site-footer-grid">

                <!-- Brand column -->
                <div class="footer-brand">
                    <?php if (has_custom_logo()) { the_custom_logo(); } ?>
                    <h3 style="color:#fff;margin-top:0.75rem;font-size:1.25rem;"><?php echo esc_html($business_name); ?></h3>
                    <?php if ($tagline) : ?>
                        <p><?php echo esc_html($tagline); ?></p>
                    <?php endif; ?>
                    <!-- Social links -->
                    <div class="footer-social" style="display:flex;gap:0.75rem;margin-top:1rem;">
                        <?php
                        $socials = [
                            'webhop_social_facebook'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>',
                            'webhop_social_instagram' => '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor"/></svg>',
                            'webhop_social_linkedin'  => '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>',
                        ];
                        foreach ($socials as $option => $icon) {
                            $url = get_option($option);
                            if ($url) {
                                echo '<a href="' . esc_url($url) . '" target="_blank" rel="noopener noreferrer" style="color:rgba(255,255,255,0.5);transition:color 0.15s">' . $icon . '</a>';
                            }
                        }
                        ?>
                    </div>
                </div>

                <!-- Quick Links -->
                <div class="footer-col">
                    <h4><?php esc_html_e('Pages', 'webhop-theme'); ?></h4>
                    <?php
                    wp_nav_menu([
                        'theme_location' => 'footer',
                        'container'      => false,
                        'depth'          => 1,
                        'fallback_cb'    => function () {
                            echo '<ul>';
                            $pages = get_pages(['sort_column' => 'menu_order', 'number' => 5]);
                            foreach ($pages as $p) {
                                echo '<li><a href="' . get_permalink($p->ID) . '">' . esc_html($p->post_title) . '</a></li>';
                            }
                            echo '</ul>';
                        },
                    ]);
                    ?>
                </div>

                <!-- Contact info -->
                <div class="footer-col">
                    <h4><?php esc_html_e('Contact', 'webhop-theme'); ?></h4>
                    <ul>
                        <?php if ($phone) : ?>
                            <li><a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>"><?php echo esc_html($phone); ?></a></li>
                        <?php endif; ?>
                        <?php if ($email) : ?>
                            <li><a href="mailto:<?php echo esc_attr($email); ?>"><?php echo esc_html($email); ?></a></li>
                        <?php endif; ?>
                        <?php if ($address) : ?>
                            <li><?php echo esc_html($address); ?></li>
                        <?php endif; ?>
                    </ul>
                </div>

                <!-- Legal / extra -->
                <div class="footer-col">
                    <h4><?php esc_html_e('Legal', 'webhop-theme'); ?></h4>
                    <ul>
                        <li><a href="<?php echo esc_url(home_url('/privacy-policy')); ?>"><?php esc_html_e('Privacy Policy', 'webhop-theme'); ?></a></li>
                        <li><a href="<?php echo esc_url(home_url('/terms')); ?>"><?php esc_html_e('Terms of Service', 'webhop-theme'); ?></a></li>
                    </ul>
                </div>

            </div>

            <!-- Footer bottom -->
            <div class="footer-bottom">
                <p>&copy; <?php echo date('Y'); ?> <?php echo esc_html($business_name); ?>. <?php esc_html_e('All rights reserved.', 'webhop-theme'); ?></p>
                <p><?php esc_html_e('Website built by', 'webhop-theme'); ?> <a href="https://webhop.ai" target="_blank" rel="noopener">WebHop</a></p>
            </div>

        </div>
    </footer>
    <!-- /Site Footer -->

</div><!-- #page-wrapper -->

<?php wp_footer(); ?>
</body>
</html>
