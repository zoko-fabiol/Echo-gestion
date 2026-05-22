// This file is intentionally simple and is included inline in stock.html via script tags.
// It contains utilities to attach accessibility attributes to product tiles.
window.attachProductTileAccessibility = function() {
    document.querySelectorAll('.product-tile').forEach(el => {
        if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        if (!el.hasAttribute('aria-label')) {
            const nameEl = el.querySelector('.font-medium, .text-gray-900');
            const name = nameEl ? nameEl.innerText.trim() : el.innerText.trim();
            el.setAttribute('aria-label', name);
        }
        if (!el._accessibilityAttached) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
            el._accessibilityAttached = true;
        }
    });
};

// Also provide a no-op to ensure the function can be used safely
window.attachProductTileAccessibilityNoop = function() {};