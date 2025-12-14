// ==============================================================
// FIFO queue logic and vocabulary selection
// ==============================================================

import { STORAGE_KEY, log } from './core.js';
import { getSamplingMode } from './storage.js';

// ---------------------------------------------------------------------
// Date utility functions
// ---------------------------------------------------------------------

/**
 * Get current date as YYYY-MM-DD string
 * @returns {string} Current date in YYYY-MM-DD format
 */
export const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-CA'); // Returns YYYY-MM-DD
};

/**
 * Convert timestamp to YYYY-MM-DD string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getDateFromTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-CA');
};

// ---------------------------------------------------------------------
// Queue loading and storage
// ---------------------------------------------------------------------

/**
 * Load vocabulary queue from localStorage
 * @returns {Object} Queue data with version, queue array, and stats
 */
export const loadStoredVocab = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { version: 1, queue: [], stats: { totalCollected: 0, oldestDate: null, newestDate: null } };
        
        const data = JSON.parse(stored);
        
        // Ensure it has required structure
        if (!data.version || !Array.isArray(data.queue)) {
            log("Invalid queue structure, resetting");
            return { version: 1, queue: [], stats: { totalCollected: 0, oldestDate: null, newestDate: null } };
        }
        
        return data;
    } catch (e) {
        log("Error loading vocab queue:", e);
        return { version: 1, queue: [], stats: { totalCollected: 0, oldestDate: null, newestDate: null } };
    }
};

/**
 * Enforce FIFO queue capacity by removing oldest items
 * @param {Array} queue - Queue array with timestamp property
 * @param {number} maxCapacity - Maximum allowed queue size
 * @returns {Array} Trimmed queue
 */
export const enforceQueueCapacity = (queue, maxCapacity) => {
    if (queue.length <= maxCapacity) return queue;
    
    // Remove oldest items (FIFO)
    const itemsToRemove = queue.length - maxCapacity;
    log(`Queue over capacity (${queue.length}/${maxCapacity}), removing ${itemsToRemove} oldest items`);
    
    // Sort by timestamp ascending (oldest first) and remove from beginning
    const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);
    return sorted.slice(itemsToRemove);
};

/**
 * Calculate queue statistics
 * @param {Array} queue - Queue array with date property
 * @returns {Object} Stats object with totalCollected, oldestDate, newestDate
 */
export const getQueueStats = (queue) => {
    if (!queue || queue.length === 0) {
        return {
            totalCollected: 0,
            oldestDate: null,
            newestDate: null
        };
    }
    
    const dates = queue.map(item => item.date).sort();
    return {
        totalCollected: queue.length,
        oldestDate: dates[0],
        newestDate: dates[dates.length - 1]
    };
};

/**
 * Store vocabulary queue to localStorage with capacity enforcement
 * @param {Object} queueData - Queue data object with queue array
 * @param {number} maxCapacity - Maximum queue capacity (default: 100)
 */
export const storeVocab = (queueData, maxCapacity = 100) => {
    try {
        // Enforce capacity limit
        const trimmedQueue = enforceQueueCapacity(queueData.queue, maxCapacity);
        
        // Update stats
        const stats = getQueueStats(trimmedQueue);
        
        const dataToStore = {
            version: 1,
            queue: trimmedQueue,
            stats: stats
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
        log(`Stored queue: ${trimmedQueue.length} words, dates ${stats.oldestDate} to ${stats.newestDate}`);
    } catch (e) {
        log("Error storing vocab queue:", e);
    }
};

/**
 * Clear the vocabulary queue from localStorage
 */
export const clearStoredVocab = () => {
    localStorage.removeItem(STORAGE_KEY);
    log("Cleared vocab queue");
};

// ---------------------------------------------------------------------
// Vocabulary selection logic
// ---------------------------------------------------------------------

/**
 * Select vocabulary for story generation based on sampling mode
 * @param {Array} queue - Queue array with word, date, and timestamp properties
 * @param {number} wordsPerStory - Target number of words to select
 * @param {string} samplingMode - "recent" or "random"
 * @returns {Array} Array of selected vocabulary words (strings)
 */
export function selectVocabularyForStory(queue, wordsPerStory, samplingMode) {
    if (!queue || queue.length === 0) {
        log("No vocabulary in queue");
        return [];
    }

    const currentDate = getCurrentDate();
    
    // Get all words from today
    const todayWords = queue.filter(item => item.date === currentDate);
    log(`Today's words (${currentDate}):`, todayWords.length);
    
    // If today's words meet or exceed the target, use only today's words
    if (todayWords.length >= wordsPerStory) {
        log(`Using all ${todayWords.length} words from today (meets target of ${wordsPerStory})`);
        return todayWords.map(item => item.word);
    }
    
    // Need to add more words beyond today
    if (samplingMode === "recent") {
        // Sort by timestamp descending (newest first)
        const sortedQueue = [...queue].sort((a, b) => b.timestamp - a.timestamp);
        
        // Take the most recent words up to wordsPerStory
        const selected = sortedQueue.slice(0, wordsPerStory);
        log(`Selected ${selected.length} most recent words (${todayWords.length} from today, ${selected.length - todayWords.length} older)`);
        
        return selected.map(item => item.word);
    } else if (samplingMode === "random") {
        // Separate today's words from older words
        const olderWords = queue.filter(item => item.date !== currentDate);
        
        if (olderWords.length === 0) {
            // No older words available, use only today's
            log("No older words available for random sampling, using only today's words");
            return todayWords.map(item => item.word);
        }
        
        // Calculate how many random words we need
        const neededRandom = wordsPerStory - todayWords.length;
        
        // Shuffle older words using Fisher-Yates algorithm
        const shuffled = [...olderWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // Take the needed number of random words
        const randomOlder = shuffled.slice(0, Math.min(neededRandom, shuffled.length));
        
        // Combine today's words with random older words
        const allSelected = [...todayWords, ...randomOlder];
        log(`Selected ${allSelected.length} words: ${todayWords.length} from today + ${randomOlder.length} random older`);
        
        return allSelected.map(item => item.word);
    }
    
    // Fallback: return all available words
    log("Unknown sampling mode, returning all words");
    return queue.map(item => item.word);
}

/**
 * Get statistics about vocabulary selection
 * @param {Array} queue - Full queue array
 * @param {Array} selectedWords - Array of selected word strings
 * @returns {Object} Selection statistics
 */
export function getSelectionStats(queue, selectedWords) {
    if (!queue || queue.length === 0) {
        return {
            totalInQueue: 0,
            selectedCount: 0,
            todayCount: 0,
            dateRange: "No vocabulary yet",
            samplingMode: getSamplingMode()
        };
    }
    
    const currentDate = getCurrentDate();
    const todayCount = queue.filter(item => item.date === currentDate).length;
    
    // Get date range
    const dates = queue.map(item => item.date).sort();
    const oldestDate = dates[0];
    const newestDate = dates[dates.length - 1];
    
    // Format dates nicely
    const formatDate = (dateStr) => {
        const date = new Date(dateStr + "T00:00:00");
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    const dateRange = oldestDate === newestDate 
        ? formatDate(oldestDate)
        : `${formatDate(oldestDate)} - ${formatDate(newestDate)}`;
    
    return {
        totalInQueue: queue.length,
        selectedCount: selectedWords.length,
        todayCount: todayCount,
        dateRange: dateRange,
        samplingMode: getSamplingMode()
    };
}

