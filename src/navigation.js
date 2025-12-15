// ==============================================================
// SPA navigation and routing for WaniKani's Turbo-powered site
// ==============================================================

import { log } from './core.js';

// Track current URL to detect changes
let currentUrl = location.href;

// Page initializers will be set from main.js to avoid circular dependencies
let initReviewPage = null;
let initDashboardPage = null;

/**
 * Register page initialization functions
 * This is called from main.js after all modules are loaded
 * @param {Function} reviewInit - Function to initialize review page
 * @param {Function} dashboardInit - Function to initialize dashboard page
 */
export function registerPageInitializers(reviewInit, dashboardInit) {
    initReviewPage = reviewInit;
    initDashboardPage = dashboardInit;
}

/**
 * Observe URL changes in the SPA
 * Uses MutationObserver to detect navigation in Turbo-powered site
 */
export function observeUrlChanges() {
    const observer = new MutationObserver(() => {
        if (location.href !== currentUrl) {
            const prev = currentUrl;
            currentUrl = location.href;
            log(`URL changed: ${prev} → ${currentUrl}`);
            handlePageChange();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Handle page change by routing to appropriate initializer
 * Checks pathname and calls the corresponding page initialization function
 */
export function handlePageChange() {
    const path = location.pathname;
    log('handlePageChange:', path);

    if (path.startsWith('/subjects/review')) {
        if (initReviewPage) {
            initReviewPage();
        } else {
            log('Review page initializer not registered yet');
        }
    } else if (path === '/dashboard' || path === '/') {
        if (initDashboardPage) {
            initDashboardPage();
        } else {
            log('Dashboard page initializer not registered yet');
        }
    }
}

