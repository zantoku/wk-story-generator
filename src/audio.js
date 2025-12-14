// ==============================================================
// TTS audio generation using OpenAI Audio API
// ==============================================================

import { log } from './core.js';
import { getTTSVoice, getTTSInstructions, getTTSSpeed } from './storage.js';

/**
 * Generate audio from text using OpenAI's TTS API
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Blob>} Audio blob (MP3 format)
 * @throws {Error} If audio generation fails
 */
export async function generateAudio(text, apiKey) {
    log("Generating audio for text length:", text.length);

    if (!apiKey) {
        throw new Error("No API key provided for audio generation");
    }

    if (!text || text.trim().length === 0) {
        throw new Error("No text provided for audio generation");
    }

    // Check character limit (4096 for TTS API)
    if (text.length > 4096) {
        log("Warning: Text exceeds 4096 characters, may be truncated by API");
    }

    // Get TTS settings
    const voice = getTTSVoice();
    const instructions = getTTSInstructions();
    const speed = getTTSSpeed();

    log("TTS settings:", { voice, instructions, speed });

    try {
        const requestBody = {
            model: "gpt-4o-mini-tts",
            input: text,
            voice: voice,
            response_format: "mp3",
            speed: speed
        };

        // Add instructions if provided
        if (instructions && instructions.trim().length > 0) {
            requestBody.instructions = instructions.trim();
        }

        const response = await fetch("https://api.openai.com/v1/audio/speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify(requestBody)
        });

        log("Audio API response status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();
            log("Audio API error response:", errorText);
            throw new Error(`Audio generation failed: ${response.status} ${response.statusText}`);
        }

        // Convert response to Blob
        const audioBlob = await response.blob();
        log("Audio generated successfully, size:", audioBlob.size, "bytes");

        return audioBlob;
    } catch (error) {
        log("Audio generation error:", error);
        throw error;
    }
}

