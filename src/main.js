/**
 * Main Entry Point
 * 
 * Initializes the WaniKani Story Generator userscript by:
 * 1. Loading Font Awesome icons
 * 2. Registering circular dependencies via callback functions
 * 3. Starting SPA navigation observation
 * 4. Adding settings menu command to Tampermonkey
 */

import { loadFontAwesome } from './core.js';
import { observeUrlChanges, handlePageChange, registerPageInitializers } from './navigation.js';
import { initReviewPage } from './review.js';
import { initDashboardPage, registerDashboardCallbacks } from './dashboard.js';
import { generateStory, registerApiCallbacks } from './api.js';
import { showStoryOverlay } from './ui-story.js';
import { openSettingsOverlay } from './ui-settings.js';

// Load Font Awesome icons before any UI renders
loadFontAwesome();

// Resolve circular dependencies via registration functions
registerPageInitializers(initReviewPage, initDashboardPage);
registerDashboardCallbacks(generateStory, openSettingsOverlay);
registerApiCallbacks(showStoryOverlay, openSettingsOverlay);

// Register settings command in Tampermonkey context menu
if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('WaniKani Story: Settings', openSettingsOverlay);
}

// Start observing URL changes for SPA navigation
observeUrlChanges();
handlePageChange();
