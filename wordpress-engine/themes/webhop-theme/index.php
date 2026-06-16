<?php
/**
 * WebHop Theme — Main Template (index.php)
 */
get_header();
?>

<main id="primary" class="site-main">
<?php
if (have_posts()) :
    while (have_posts()) : the_post();
        the_content();
    endwhile;
else :
?>
    <section class="webhop-section text-center">
        <div class="container">
            <h2><?php esc_html_e('Nothing found', 'webhop-theme'); ?></h2>
            <p><?php esc_html_e('It seems we can\'t find what you\'re looking for.', 'webhop-theme'); ?></p>
        </div>
    </section>
<?php endif; ?>
</main>

<?php get_footer(); ?>
