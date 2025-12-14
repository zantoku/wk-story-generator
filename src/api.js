// ==============================================================
// OpenAI API calls for story generation
// ==============================================================

import { STORY_SCHEMA, log } from './core.js';
import { loadStoredVocab, selectVocabularyForStory, getSelectionStats } from './queue.js';
import { getApiKey, getPrompt, getWordsPerStory, getSamplingMode } from './storage.js';
import { setButtonLoading, resetButtonState } from './dashboard.js';

// Forward references for functions from other modules
let showStoryOverlay = null;
let openSettingsOverlay = null;

/**
 * Register UI functions to avoid circular dependencies
 * @param {Function} showStoryFn - Function to display story overlay
 * @param {Function} openSettingsFn - Function to open settings overlay
 */
export function registerApiCallbacks(showStoryFn, openSettingsFn) {
    showStoryOverlay = showStoryFn;
    openSettingsOverlay = openSettingsFn;
}

/**
 * Generate a story using OpenAI's Responses API
 * @param {Array|null} vocab - Optional vocabulary array (unused, kept for API compatibility)
 * @param {HTMLButtonElement|null} button - Button element to show loading state
 */
export function generateStory(vocab = null, button = null) {
    // Load queue and select vocabulary based on settings
    const queueData = loadStoredVocab();
    const wordsPerStory = getWordsPerStory();
    const samplingMode = getSamplingMode();
    
    // Select vocabulary for this story
    const selectedVocab = selectVocabularyForStory(queueData.queue, wordsPerStory, samplingMode);
    
    // Get and log selection stats
    const stats = getSelectionStats(queueData.queue, selectedVocab);
    log("Story generation stats:", stats);
    log(`Using ${stats.selectedCount} words (${stats.todayCount} from today) via ${stats.samplingMode} mode`);
    
    if (selectedVocab.length === 0) {
        alert("No vocabulary available to generate a story. Complete some reviews first!");
        return;
    }
    
    log("Selected vocabulary for story:", selectedVocab);

    const apiKey = getApiKey();
    if (!apiKey) {
        alert(
            "No OpenAI API key configured for the WaniKani story generator.\n\n" +
            "I'll open the settings panel so you can paste your key."
        );
        if (openSettingsOverlay) {
            openSettingsOverlay();
        }
        return;
    }

    setButtonLoading(button);

    const promptTemplate = getPrompt();
    const prompt = promptTemplate
        .replace('{{VOCAB}}', selectedVocab.join(", "))
        .replace('{{COUNT}}', selectedVocab.length.toString());

    // Use Responses API with structured output for guaranteed JSON schema
    fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            input: [
                { role: "system", content: "You are a helpful Japanese tutor." },
                { role: "user", content: prompt }
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "wanikani_story_response",
                    strict: true,
                    schema: STORY_SCHEMA
                }
            }
        })
    })
    .then(response => {
        log("OpenAI response status:", response.status);
        
        // Reset button state now that we have a response
        resetButtonState(button, queueData.queue.length);

        if (!response.ok) {
            return response.json().then(
                errJson => {
                    let msg = "Story generation failed.\nStatus: " + response.status;
                    if (errJson.error && errJson.error.message) {
                        msg += "\nMessage: " + errJson.error.message;
                    }
                    log("OpenAI error:", errJson);
                    alert(msg);
                    throw new Error(msg);
                },
                () => {
                    const msg = "Story generation failed.\nStatus: " + response.status;
                    alert(msg);
                    throw new Error(msg);
                }
            );
        }

        return response.json();
    })
    .then(json => {
        log("Full Responses API response:", json);
        
        // Check response status
        if (json.status !== "completed") {
            alert("Story generation failed: response status is " + json.status);
            log("Incomplete response:", json);
            return;
        }

        // Get the first output message
        const outputMessage = json.output?.find(item => item.type === "message");
        if (!outputMessage) {
            alert("Story generation failed: no message in response output.");
            log("Response JSON:", json);
            return;
        }
        
        // Check for refusal in content
        const refusalContent = outputMessage.content?.find(c => c.type === "refusal");
        if (refusalContent) {
            alert("The AI model refused to generate the story:\n" + refusalContent.refusal);
            log("Model refusal:", refusalContent.refusal);
            return;
        }
        
        // Get output text
        const textContent = outputMessage.content?.find(c => c.type === "output_text");
        if (!textContent?.text) {
            alert("Story generation failed: no text content in response.");
            log("Response JSON:", json);
            return;
        }

        // Parse structured JSON response
        let storyData;
        try {
            storyData = JSON.parse(textContent.text);
            log("Parsed story data:", storyData);
        } catch (e) {
            alert("Story generation failed: invalid JSON response.");
            log("JSON parse error:", e, "Content:", textContent.text);
            return;
        }

        // Validate required fields
        if (!storyData.japanese_story || !storyData.english_translation || !storyData.vocabulary_list) {
            alert("Story generation failed: missing required fields in response.");
            log("Invalid story data structure:", storyData);
            return;
        }

        if (showStoryOverlay) {
            showStoryOverlay(storyData);
        }
        // Note: Queue is NOT cleared - vocabulary persists for future stories
    })
    .catch(error => {
        log("Fetch error:", error);
        resetButtonState(button, queueData.queue.length);
        if (!error.message.includes("Story generation failed")) {
            alert("Story generation failed (network error). See console for details.");
        }
    });
}

