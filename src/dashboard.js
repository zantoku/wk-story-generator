// ==============================================================
// Dashboard button and UI
// ==============================================================

import { log } from './core.js';
import { loadStoredVocab } from './queue.js';
import { getWordsPerStory, getQueueCapacity } from './storage.js';

// Forward references for functions from other modules
// These will be set by main.js after all modules are loaded
let generateStory = null;
let openSettingsOverlay = null;

/**
 * Register functions from other modules to avoid circular dependencies
 * @param {Function} generateStoryFn - Story generation function
 * @param {Function} openSettingsFn - Settings overlay function
 */
export function registerDashboardCallbacks(generateStoryFn, openSettingsFn) {
    generateStory = generateStoryFn;
    openSettingsOverlay = openSettingsFn;
}

/**
 * Set button to loading state
 * @param {HTMLButtonElement} button - The button element
 */
export function setButtonLoading(button) {
    if (!button) {return;}
    button.disabled = true;
    button.textContent = 'Generating story...';
    button.style.opacity = '0.7';
    button.style.cursor = 'wait';
}

/**
 * Reset button to normal state with updated word counts
 * @param {HTMLButtonElement} button - The button element
 * @param {number} totalWords - Total words in queue
 */
export function resetButtonState(button, totalWords) {
    if (!button) {return;}
    button.disabled = false;
    
    const wordsPerStory = getWordsPerStory();
    const wordsToSelect = Math.min(wordsPerStory, totalWords);
    
    if (totalWords === 0) {
        button.textContent = 'Generate Story (no words yet)';
    } else if (totalWords < wordsPerStory) {
        button.textContent = `Generate Story (${wordsToSelect} of ${totalWords} words)`;
    } else {
        button.textContent = `Generate Story (${wordsToSelect} from ${totalWords} words)`;
    }
    
    button.style.opacity = '1';
    button.style.cursor = 'pointer';
}

/**
 * Initialize dashboard page
 * Loads queue and sets up the story generation button
 */
export function initDashboardPage() {
    log('Initializing dashboard…');

    const queueData = loadStoredVocab();
    log('Loaded vocab from localStorage:', queueData);

    // Always setup button, even if queue is empty (will show appropriate message)
    setupDashboardButton(queueData);
}

/**
 * Set up dashboard button with MutationObserver
 * Waits for the reviews link to appear in the DOM
 * @param {Object} queueData - Queue data object
 */
function setupDashboardButton(queueData) {
    const observer = new MutationObserver(() => {
        const reviewsLink =
            document.querySelector('a[href="/subjects/review"]') ||
            document.querySelector('a[href="https://www.wanikani.com/subjects/review"]');

        if (!reviewsLink) {return;}
        if (document.getElementById('wk-story-btn')) {
            observer.disconnect();
            return;
        }

        log('Found Start Reviews link for button insertion.');
        insertDashboardButton(reviewsLink, queueData);
        observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Insert the story generation button and indicators into the dashboard
 * @param {HTMLElement} reviewsLink - The reviews link element to insert after
 * @param {Object} queueData - Queue data with stats
 */
function insertDashboardButton(reviewsLink, queueData) {
    log('Inserting dashboard button…');

    const totalWords = queueData.queue.length;
    const wordsPerStory = getWordsPerStory();
    const queueCapacity = getQueueCapacity();
    
    // Calculate words that will be selected
    const wordsToSelect = Math.min(wordsPerStory, totalWords);
    
    // Generate Story button with selection/total format
    const btn = document.createElement('button');
    btn.id = 'wk-story-btn';
    
    if (totalWords === 0) {
        btn.textContent = 'Generate Story (no words yet)';
    } else if (totalWords < wordsPerStory) {
        btn.textContent = `Generate Story (${wordsToSelect} of ${totalWords} words)`;
    } else {
        btn.textContent = `Generate Story (${wordsToSelect} from ${totalWords} words)`;
    }
    
    btn.style.padding = '10px 20px';
    btn.style.marginTop = '12px';
    btn.style.width = '100%';
    btn.style.cursor = 'pointer';
    btn.style.fontSize = '16px';
    btn.style.background = '#0074e9';
    btn.style.color = 'white';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';

    btn.addEventListener('click', () => {
        if (generateStory) {
            generateStory(null, btn);
        } else {
            log('generateStory function not registered yet');
        }
    });

    // Capacity indicator
    const capacityIndicator = document.createElement('div');
    capacityIndicator.style.fontSize = '11px';
    capacityIndicator.style.marginTop = '6px';
    capacityIndicator.style.textAlign = 'center';
    
    const capacityPercent = (totalWords / queueCapacity) * 100;
    let capacityColor = '#28a745'; // green
    if (capacityPercent >= 95) {
        capacityColor = '#dc3545'; // red
    } else if (capacityPercent >= 80) {
        capacityColor = '#ffc107'; // yellow
    }
    
    capacityIndicator.innerHTML = `<span style="color: ${capacityColor}; font-weight: 500;">Queue: ${totalWords}/${queueCapacity} words</span>`;
    
    // Date range indicator
    const dateIndicator = document.createElement('div');
    dateIndicator.style.fontSize = '11px';
    dateIndicator.style.marginTop = '4px';
    dateIndicator.style.textAlign = 'center';
    dateIndicator.style.color = '#666';
    
    if (queueData.stats.oldestDate && queueData.stats.newestDate) {
        const formatDate = (dateStr) => {
            const date = new Date(dateStr + 'T00:00:00');
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        };
        
        const dateRange = queueData.stats.oldestDate === queueData.stats.newestDate
            ? formatDate(queueData.stats.oldestDate)
            : `${formatDate(queueData.stats.oldestDate)} - ${formatDate(queueData.stats.newestDate)}`;
        
        dateIndicator.textContent = `Words from: ${dateRange}`;
    } else {
        dateIndicator.textContent = 'No vocabulary collected yet';
    }

    // Settings link
    const settingsLink = document.createElement('button');
    settingsLink.textContent = 'Story settings';
    settingsLink.style.marginTop = '8px';
    settingsLink.style.display = 'block';
    settingsLink.style.width = '100%';
    settingsLink.style.padding = '6px';
    settingsLink.style.fontSize = '12px';
    settingsLink.style.background = 'transparent';
    settingsLink.style.color = '#0074e9';
    settingsLink.style.border = 'none';
    settingsLink.style.cursor = 'pointer';
    settingsLink.style.textDecoration = 'underline';

    settingsLink.addEventListener('click', () => {
        if (openSettingsOverlay) {
            openSettingsOverlay();
        } else {
            log('openSettingsOverlay function not registered yet');
        }
    });

    reviewsLink.insertAdjacentElement('afterend', settingsLink);
    reviewsLink.insertAdjacentElement('afterend', dateIndicator);
    reviewsLink.insertAdjacentElement('afterend', capacityIndicator);
    reviewsLink.insertAdjacentElement('afterend', btn);

    log('Dashboard button + indicators + settings link inserted.');
}

