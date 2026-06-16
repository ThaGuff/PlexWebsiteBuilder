<?php
/**
 * WebHop Theme — Header Template
 */
$business_name = get_option('webhop_business_name', get_bloginfo('name'));
$phone         = get_option('webhop_phone');
$cta_text      = get_option('webhop_cta_text', 'Get Started');
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="<?php echo esc_attr(get_option('webhop_primary_color', '#1A1A1A')); ?>">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div id="page-wrapper">

    <!-- Skip to content -->
    <a class="sr-only" href="#primary"><?php esc_html_e('Skip to content', 'webhop-theme'); ?></a>

    <!-- Site Header -->
    <header id="site-header" role="banner">
        <div class="site-header-inner">

            <!-- Branding -->
            <a class="site-branding" href="<?php echo esc_url(home_url('/')); ?>" aria-label="<?php echo esc_attr($business_name); ?> — Home">
                <?php
                if (has_custom_logo()) {
                    the_custom_logo();
                } else {
                ?>
                    <span class="site-title-text"><?php echo esc_html($business_name); ?></span>
                <?php } ?>
            </a>

            <!-- Primary Navigation -->
            <nav class="primary-navigation" id="primary-nav" aria-label="<?php esc_attr_e('Primary', 'webhop-theme'); ?>">
                <?php
                wp_nav_menu([
                    'theme_location' => 'primary',
                    'menu_class'     => '',
                    'container'      => false,
                    'fallback_cb'    => function () {
                        // Auto-generate menu from pages if none set
                        echo '<ul>';
                        $pages = get_pages(['sort_column' => 'menu_order', 'number' => 6]);
                        foreach ($pages as $page) {
                            $active = is_page($page->ID) ? ' class="current-menu-item"' : '';
                            echo '<li' . $active . '><a href="' . get_permalink($page->ID) . '">' . esc_html($page->post_title) . '</a></li>';
                        }
                        echo '</ul>';
                    },
                ]);
                ?>
                <?php if ($phone) : ?>
                    <a href="tel:<?php echo esc_attr(preg_replace('/[^0-9+]/', '', $phone)); ?>" 
                       class="webhop-btn nav-cta"
                       style="margin-left:1rem;">
                        <?php echo esc_html($phone); ?>
                    </a>
                <?php endif; ?>
            </nav>

            <!-- Mobile menu toggle -->
            <button class="menu-toggle" id="menu-toggle" 
                    aria-controls="primary-nav" 
                    aria-expanded="false"
                    aria-label="<?php esc_attr_e('Toggle navigation', 'webhop-theme'); ?>">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <line x1="3" y1="12" x2="21" y2="12"/>
                    <line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
            </button>

        </div>
    </header>
    <!-- /Site Header -->
