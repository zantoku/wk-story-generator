// ==============================================================
// Review page vocabulary collection logic
// ==============================================================

import { log } from './core.js';
import { loadStoredVocab, storeVocab, getCurrentDate } from './queue.js';
import { getQueueCapacity } from './storage.js';

// Track if review page has been initialized
let reviewInitialized = false;

/**
 * Get the currently displayed word from the review interface
 * @returns {string|null} The current word or null if not found
 */
function getCurrentWord() {
    const el =
        document.querySelector('.character-header__characters') ||
        document.querySelector('.subject-character__characters');
    const word = el?.textContent?.trim();
    log('Current visible word:', word);
    return word || null;
}

/**
 * Extract and parse the quiz queue from the DOM
 * @returns {Array|null} Queue array or null if not found/invalid
 */
function getQueue() {
    const queueRoot = document.querySelector('#quiz-queue');
    if (!queueRoot || !queueRoot.firstElementChild) {
        log('No #quiz-queue element found.');
        return null;
    }

    try {
        const jsonText = queueRoot.firstElementChild.textContent;
        const arr = JSON.parse(jsonText);
        if (Array.isArray(arr)) {
            return arr;
        } else {
            log('Queue JSON is not an array:', arr);
            return null;
        }
    } catch (e) {
        console.warn('[WK STORY] Failed to parse queue JSON:', e);
        return null;
    }
}

/**
 * Find the current vocabulary item in the queue
 * @param {string} word - The word to find
 * @param {Array} queue - The queue array to search
 * @returns {Object|null} Matched vocabulary item or null
 */
function findCurrentItem(word, queue) {
    if (!word || !queue) {return null;}
    const item = queue.find(
        obj =>
            (obj.type === 'Vocabulary' || obj.type === 'KanaVocabulary') &&
            obj.characters === word
    );
    log('Matched item for word:', word, '→', item);
    return item;
}

/**
 * Initialize review page vocabulary collection
 * Sets up event listeners for collecting vocabulary during reviews
 */
export function initReviewPage() {
    if (reviewInitialized) {return;}
    reviewInitialized = true;

    log('Initializing review capture…');

    // Load existing queue data
    const queueData = loadStoredVocab();
    // Create a Set of existing words for fast duplicate checking
    const existingWords = new Set(queueData.queue.map(item => item.word));

    window.addEventListener('didAnswerQuestion', () => {
        log('didAnswerQuestion fired → matching visible word with queue…');

        const word = getCurrentWord();
        const queue = getQueue();
        const item = findCurrentItem(word, queue);

        if (!item) {
            log('No vocab item found for this answer.');
            return;
        }

        const slug = item.characters;
        if (!slug) {
            log('Item has no characters field:', item);
            return;
        }

        if (!existingWords.has(slug)) {
            // Add new vocabulary item with metadata
            const vocabItem = {
                word: slug,
                date: getCurrentDate(),
                timestamp: Date.now()
            };
            
            queueData.queue.push(vocabItem);
            existingWords.add(slug);
            
            log('Collected vocab:', slug, 'on date:', vocabItem.date);
            
            // Store immediately with capacity enforcement
            storeVocab(queueData, getQueueCapacity());
        } else {
            log('Vocab already collected, skipping duplicate:', slug);
        }
    });

    // Mark completion → persist vocab for dashboard button
    window.addEventListener('didCompleteSession', () => {
        log('didCompleteSession fired — queue size:', queueData.queue.length);
        storeVocab(queueData, getQueueCapacity());
    });
}

