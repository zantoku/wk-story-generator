// ==============================================================
// Storage management using GM_getValue/GM_setValue
// ==============================================================

import {
    API_KEY_STORAGE,
    PROMPT_STORAGE,
    DEFAULT_PROMPT,
    TTS_VOICE_STORAGE,
    TTS_INSTRUCTIONS_STORAGE,
    TTS_SPEED_STORAGE,
    DEFAULT_TTS_INSTRUCTIONS,
    QUEUE_CAPACITY_STORAGE,
    WORDS_PER_STORY_STORAGE,
    SAMPLING_MODE_STORAGE,
    log
} from './core.js';

// Import queue functions - note: these are imported to use, not for circular dependency
import { loadStoredVocab, storeVocab } from './queue.js';

// ---------------------------------------------------------------------
// API Key Storage
// ---------------------------------------------------------------------

/**
 * Get the stored OpenAI API key
 * @returns {string} The API key or empty string
 */
export function getApiKey() {
    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(API_KEY_STORAGE, "") || "";
        }
    } catch (_) {}
    return "";
}

/**
 * Set the OpenAI API key
 * @param {string} value - The API key to store
 */
export function setApiKey(value) {
    try {
        if (typeof GM_setValue === "function") {
            GM_setValue(API_KEY_STORAGE, value || "");
        }
    } catch (_) {}
}

// ---------------------------------------------------------------------
// Custom Prompt Storage
// ---------------------------------------------------------------------

/**
 * Get the custom prompt template
 * @returns {string} The custom prompt or default prompt
 */
export function getPrompt() {
    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(PROMPT_STORAGE, DEFAULT_PROMPT) || DEFAULT_PROMPT;
        }
    } catch (_) {}
    return DEFAULT_PROMPT;
}

/**
 * Set the custom prompt template
 * @param {string} value - The prompt template to store
 */
export function setPrompt(value) {
    try {
        if (typeof GM_setValue === "function") {
            GM_setValue(PROMPT_STORAGE, value || DEFAULT_PROMPT);
        }
    } catch (_) {}
}

// ---------------------------------------------------------------------
// TTS Voice Storage
// ---------------------------------------------------------------------

/**
 * Get the selected TTS voice
 * @returns {string} The voice name (default: "alloy")
 */
export function getTTSVoice() {
    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(TTS_VOICE_STORAGE, "alloy") || "alloy";
        }
    } catch (_) {}
    return "alloy";
}

/**
 * Set the TTS voice
 * @param {string} value - The voice name
 */
export function setTTSVoice(value) {
    try {
        if (typeof GM_setValue === "function") {
            GM_setValue(TTS_VOICE_STORAGE, value || "alloy");
        }
    } catch (_) {}
}

// ---------------------------------------------------------------------
// TTS Instructions Storage
// ---------------------------------------------------------------------

/**
 * Get the TTS narration instructions
 * @returns {string} The instructions or default instructions
 */
export function getTTSInstructions() {
    try {
        if (typeof GM_getValue === "function") {
            return GM_getValue(TTS_INSTRUCTIONS_STORAGE, DEFAULT_TTS_INSTRUCTIONS) || DEFAULT_TTS_INSTRUCTIONS;
        }
    } catch (_) {}
    return DEFAULT_TTS_INSTRUCTIONS;
}

/**
 * Set the TTS narration instructions
 * @param {string} value - The instructions text
 */
export function setTTSInstructions(value) {
    try {
        if (typeof GM_setValue === "function") {
            GM_setValue(TTS_INSTRUCTIONS_STORAGE, value || DEFAULT_TTS_INSTRUCTIONS);
        }
    } catch (_) {}
}

// ---------------------------------------------------------------------
// TTS Speed Storage
// ---------------------------------------------------------------------

/**
 * Get the TTS playback speed
 * @returns {number} The speed multiplier (0.5 - 2.0, default: 1.0)
 */
export function getTTSSpeed() {
    try {
        if (typeof GM_getValue === "function") {
            const speed = GM_getValue(TTS_SPEED_STORAGE, 1.0);
            return parseFloat(speed) || 1.0;
        }
    } catch (_) {}
    return 1.0;
}

/**
 * Set the TTS playback speed
 * @param {number} value - The speed multiplier (clamped to 0.5 - 2.0)
 */
export function setTTSSpeed(value) {
    try {
        if (typeof GM_setValue === "function") {
            const speed = parseFloat(value) || 1.0;
            GM_setValue(TTS_SPEED_STORAGE, Math.max(0.5, Math.min(2.0, speed)));
        }
    } catch (_) {}
}

// ---------------------------------------------------------------------
// Queue Capacity Storage
// ---------------------------------------------------------------------

/**
 * Get the maximum queue capacity
 * @returns {number} The capacity (20-500, default: 100)
 */
export function getQueueCapacity() {
    try {
        if (typeof GM_getValue === "function") {
            const capacity = GM_getValue(QUEUE_CAPACITY_STORAGE, 100);
            const parsed = parseInt(capacity, 10);
            return isNaN(parsed) ? 100 : Math.max(20, Math.min(500, parsed));
        }
    } catch (_) {}
    return 100;
}

/**
 * Set the maximum queue capacity
 * Automatically trims the queue if new capacity is smaller than current size
 * @param {number} value - The capacity (clamped to 20-500)
 */
export function setQueueCapacity(value) {
    try {
        if (typeof GM_setValue === "function") {
            const capacity = parseInt(value, 10) || 100;
            const clamped = Math.max(20, Math.min(500, capacity));
            GM_setValue(QUEUE_CAPACITY_STORAGE, clamped);
            
            // Trigger queue trimming if current size exceeds new capacity
            const queueData = loadStoredVocab();
            if (queueData.queue.length > clamped) {
                log(`Queue capacity reduced to ${clamped}, trimming queue from ${queueData.queue.length} items`);
                storeVocab(queueData, clamped);
            }
        }
    } catch (_) {}
}

// ---------------------------------------------------------------------
// Words Per Story Storage
// ---------------------------------------------------------------------

/**
 * Get the number of words to use per story
 * @returns {number} The word count (5-100, default: 20)
 */
export function getWordsPerStory() {
    try {
        if (typeof GM_getValue === "function") {
            const words = GM_getValue(WORDS_PER_STORY_STORAGE, 20);
            const parsed = parseInt(words, 10);
            return isNaN(parsed) ? 20 : Math.max(5, Math.min(100, parsed));
        }
    } catch (_) {}
    return 20;
}

/**
 * Set the number of words to use per story
 * @param {number} value - The word count (clamped to 5-100)
 */
export function setWordsPerStory(value) {
    try {
        if (typeof GM_setValue === "function") {
            const words = parseInt(value, 10) || 20;
            GM_setValue(WORDS_PER_STORY_STORAGE, Math.max(5, Math.min(100, words)));
        }
    } catch (_) {}
}

// ---------------------------------------------------------------------
// Sampling Mode Storage
// ---------------------------------------------------------------------

/**
 * Get the vocabulary sampling mode
 * @returns {string} "recent" or "random" (default: "recent")
 */
export function getSamplingMode() {
    try {
        if (typeof GM_getValue === "function") {
            const mode = GM_getValue(SAMPLING_MODE_STORAGE, "recent");
            return (mode === "random" || mode === "recent") ? mode : "recent";
        }
    } catch (_) {}
    return "recent";
}

/**
 * Set the vocabulary sampling mode
 * @param {string} value - "recent" or "random"
 */
export function setSamplingMode(value) {
    try {
        if (typeof GM_setValue === "function") {
            const mode = (value === "random" || value === "recent") ? value : "recent";
            GM_setValue(SAMPLING_MODE_STORAGE, mode);
        }
    } catch (_) {}
}

