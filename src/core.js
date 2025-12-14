// ==============================================================
// Core constants, configuration, and utility functions
// ==============================================================

// ---------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------
export const STORAGE_KEY = "wk_story_vocab";
export const API_KEY_STORAGE = "wk_story_api_key";
export const PROMPT_STORAGE = "wk_story_prompt";
export const TTS_VOICE_STORAGE = "wk_story_tts_voice";
export const TTS_INSTRUCTIONS_STORAGE = "wk_story_tts_instructions";
export const TTS_SPEED_STORAGE = "wk_story_tts_speed";
export const QUEUE_CAPACITY_STORAGE = "wk_story_queue_capacity";
export const WORDS_PER_STORY_STORAGE = "wk_story_words_per_story";
export const SAMPLING_MODE_STORAGE = "wk_story_sampling_mode";

// ---------------------------------------------------------------------
// JSON Schema for structured story response
// ---------------------------------------------------------------------
export const STORY_SCHEMA = {
    type: "object",
    properties: {
        japanese_story: {
            type: "string",
            description: "The complete story in Japanese using the provided vocabulary"
        },
        english_translation: {
            type: "string",
            description: "English translation of the Japanese story"
        },
        vocabulary_list: {
            type: "array",
            description: "List of vocabulary words used in the story with their meanings",
            items: {
                type: "object",
                properties: {
                    word: {
                        type: "string",
                        description: "The Japanese vocabulary word"
                    },
                    reading: {
                        type: "string",
                        description: "Hiragana reading of the word"
                    },
                    meaning: {
                        type: "string",
                        description: "English meaning of the word"
                    }
                },
                required: ["word", "reading", "meaning"],
                additionalProperties: false
            }
        }
    },
    required: ["japanese_story", "english_translation", "vocabulary_list"],
    additionalProperties: false
};

// ---------------------------------------------------------------------
// Default prompt template
// ---------------------------------------------------------------------
export const DEFAULT_PROMPT = `Create a casual, modern Japanese story that naturally incorporates ALL of the following vocabulary words:

{{VOCAB}}

Guidelines:
• Use a modern, conversational writing style (not folk tales or children's stories)
• Make the story length proportional to the number of words ({{COUNT}} words provided)
• Let the story flow naturally - don't force vocabulary into awkward sentences
• Use everyday situations and realistic dialogue when appropriate
• Keep the Japanese simple and accessible, but natural-sounding
• Each vocabulary word should appear at least once in the story

Please provide:
1. The complete story in Japanese
2. An English translation of the story
3. A vocabulary list with each word's reading (in hiragana) and English meaning`;

// ---------------------------------------------------------------------
// Default TTS instructions
// ---------------------------------------------------------------------
export const DEFAULT_TTS_INSTRUCTIONS = `Voice Affect: Low, hushed, and suspenseful; convey tension and intrigue.

Tone: Deeply serious and mysterious, maintaining an undercurrent of unease throughout.

Pacing: Slow, deliberate, pausing slightly after suspenseful moments to heighten drama.

Emotion: Restrained yet intense—voice should subtly tremble or tighten at key suspenseful points.

Emphasis: Highlight sensory descriptions ("footsteps echoed," "heart hammering," "shadows melting into darkness") to amplify atmosphere.

Pronunciation: Slightly elongated vowels and softened consonants for an eerie, haunting effect.

Pauses: Insert meaningful pauses after phrases like "only shadows melting into darkness," and especially before the final line, to enhance suspense dramatically.`;

// ---------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------

/**
 * Logging utility with consistent prefix
 * @param {...any} args - Arguments to log
 */
export const log = (...args) => console.log("[WK STORY]", ...args);

/**
 * Load Font Awesome for modern icons
 * Checks if already loaded to prevent duplicates
 */
export function loadFontAwesome() {
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement("link");
        faLink.rel = "stylesheet";
        faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
        faLink.integrity = "sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==";
        faLink.crossOrigin = "anonymous";
        document.head.appendChild(faLink);
        log("Font Awesome loaded");
    }
}
