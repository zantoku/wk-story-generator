// ==UserScript==
// @name         WaniKani Review Story Generator
// @namespace    karsten.wanikani.story
// @version      4.1
// @description  Collect vocab during reviews and generate a story afterward
// @match        https://www.wanikani.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function () {
    "use strict";

    const STORAGE_KEY = "wk_story_vocab";
    const API_KEY_STORAGE = "wk_story_api_key";
    const PROMPT_STORAGE = "wk_story_prompt";

    let currentUrl = location.href;
    let reviewInitialized = false;

    const log = (...args) => console.log("[WK STORY]", ...args);

    // Load Font Awesome for modern icons
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const faLink = document.createElement("link");
        faLink.rel = "stylesheet";
        faLink.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css";
        faLink.integrity = "sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==";
        faLink.crossOrigin = "anonymous";
        document.head.appendChild(faLink);
        log("Font Awesome loaded");
    }

    // ---------------------------------------------------------------------
    // Settings storage (API key)
    // ---------------------------------------------------------------------
    function getApiKey() {
        try {
            if (typeof GM_getValue === "function") {
                return GM_getValue(API_KEY_STORAGE, "") || "";
            }
        } catch (_) {}
        return "";
    }

    function setApiKey(value) {
        try {
            if (typeof GM_setValue === "function") {
                GM_setValue(API_KEY_STORAGE, value || "");
            }
        } catch (_) {}
    }

    // JSON Schema for structured story response
    const STORY_SCHEMA = {
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

    const DEFAULT_PROMPT = `Create a casual, modern Japanese story that naturally incorporates ALL of the following vocabulary words:

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

    function getPrompt() {
        try {
            if (typeof GM_getValue === "function") {
                return GM_getValue(PROMPT_STORAGE, DEFAULT_PROMPT) || DEFAULT_PROMPT;
            }
        } catch (_) {}
        return DEFAULT_PROMPT;
    }

    function setPrompt(value) {
        try {
            if (typeof GM_setValue === "function") {
                GM_setValue(PROMPT_STORAGE, value || DEFAULT_PROMPT);
            }
        } catch (_) {}
    }

    // ---------------------------------------------------------------------
    // TTS Settings storage
    // ---------------------------------------------------------------------
    const TTS_VOICE_STORAGE = "wk_story_tts_voice";
    const TTS_INSTRUCTIONS_STORAGE = "wk_story_tts_instructions";
    const TTS_SPEED_STORAGE = "wk_story_tts_speed";

    const DEFAULT_TTS_INSTRUCTIONS = `Voice Affect: Low, hushed, and suspenseful; convey tension and intrigue.

Tone: Deeply serious and mysterious, maintaining an undercurrent of unease throughout.

Pacing: Slow, deliberate, pausing slightly after suspenseful moments to heighten drama.

Emotion: Restrained yet intense—voice should subtly tremble or tighten at key suspenseful points.

Emphasis: Highlight sensory descriptions ("footsteps echoed," "heart hammering," "shadows melting into darkness") to amplify atmosphere.

Pronunciation: Slightly elongated vowels and softened consonants for an eerie, haunting effect.

Pauses: Insert meaningful pauses after phrases like "only shadows melting into darkness," and especially before the final line, to enhance suspense dramatically.`;

    function getTTSVoice() {
        try {
            if (typeof GM_getValue === "function") {
                return GM_getValue(TTS_VOICE_STORAGE, "alloy") || "alloy";
            }
        } catch (_) {}
        return "alloy";
    }

    function setTTSVoice(value) {
        try {
            if (typeof GM_setValue === "function") {
                GM_setValue(TTS_VOICE_STORAGE, value || "alloy");
            }
        } catch (_) {}
    }

    function getTTSInstructions() {
        try {
            if (typeof GM_getValue === "function") {
                return GM_getValue(TTS_INSTRUCTIONS_STORAGE, DEFAULT_TTS_INSTRUCTIONS) || DEFAULT_TTS_INSTRUCTIONS;
            }
        } catch (_) {}
        return DEFAULT_TTS_INSTRUCTIONS;
    }

    function setTTSInstructions(value) {
        try {
            if (typeof GM_setValue === "function") {
                GM_setValue(TTS_INSTRUCTIONS_STORAGE, value || DEFAULT_TTS_INSTRUCTIONS);
            }
        } catch (_) {}
    }

    function getTTSSpeed() {
        try {
            if (typeof GM_getValue === "function") {
                const speed = GM_getValue(TTS_SPEED_STORAGE, 1.0);
                return parseFloat(speed) || 1.0;
            }
        } catch (_) {}
        return 1.0;
    }

    function setTTSSpeed(value) {
        try {
            if (typeof GM_setValue === "function") {
                const speed = parseFloat(value) || 1.0;
                GM_setValue(TTS_SPEED_STORAGE, Math.max(0.5, Math.min(2.0, speed)));
            }
        } catch (_) {}
    }

    // ---------------------------------------------------------------------
    // Queue Configuration Settings
    // ---------------------------------------------------------------------
    const QUEUE_CAPACITY_STORAGE = "wk_story_queue_capacity";
    const WORDS_PER_STORY_STORAGE = "wk_story_words_per_story";
    const SAMPLING_MODE_STORAGE = "wk_story_sampling_mode";

    function getQueueCapacity() {
        try {
            if (typeof GM_getValue === "function") {
                const capacity = GM_getValue(QUEUE_CAPACITY_STORAGE, 100);
                const parsed = parseInt(capacity, 10);
                return isNaN(parsed) ? 100 : Math.max(20, Math.min(500, parsed));
            }
        } catch (_) {}
        return 100;
    }

    function setQueueCapacity(value) {
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

    function getWordsPerStory() {
        try {
            if (typeof GM_getValue === "function") {
                const words = GM_getValue(WORDS_PER_STORY_STORAGE, 20);
                const parsed = parseInt(words, 10);
                return isNaN(parsed) ? 20 : Math.max(5, Math.min(100, parsed));
            }
        } catch (_) {}
        return 20;
    }

    function setWordsPerStory(value) {
        try {
            if (typeof GM_setValue === "function") {
                const words = parseInt(value, 10) || 20;
                GM_setValue(WORDS_PER_STORY_STORAGE, Math.max(5, Math.min(100, words)));
            }
        } catch (_) {}
    }

    function getSamplingMode() {
        try {
            if (typeof GM_getValue === "function") {
                const mode = GM_getValue(SAMPLING_MODE_STORAGE, "recent");
                return (mode === "random" || mode === "recent") ? mode : "recent";
            }
        } catch (_) {}
        return "recent";
    }

    function setSamplingMode(value) {
        try {
            if (typeof GM_setValue === "function") {
                const mode = (value === "random" || value === "recent") ? value : "recent";
                GM_setValue(SAMPLING_MODE_STORAGE, mode);
            }
        } catch (_) {}
    }

    // In userscript menu (right-click extension icon)
    if (typeof GM_registerMenuCommand === "function") {
        GM_registerMenuCommand("WaniKani Story: Settings", openSettingsOverlay);
    }

    // ---------------------------------------------------------------------
    // Date utility functions
    // ---------------------------------------------------------------------
    const getCurrentDate = () => {
        return new Date().toLocaleDateString('en-CA'); // Returns YYYY-MM-DD
    };

    const getDateFromTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleDateString('en-CA');
    };

    // ---------------------------------------------------------------------
    // Local vocab storage helpers (FIFO Queue)
    // ---------------------------------------------------------------------
    const loadStoredVocab = () => {
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

    const enforceQueueCapacity = (queue, maxCapacity) => {
        if (queue.length <= maxCapacity) return queue;
        
        // Remove oldest items (FIFO)
        const itemsToRemove = queue.length - maxCapacity;
        log(`Queue over capacity (${queue.length}/${maxCapacity}), removing ${itemsToRemove} oldest items`);
        
        // Sort by timestamp ascending (oldest first) and remove from beginning
        const sorted = [...queue].sort((a, b) => a.timestamp - b.timestamp);
        return sorted.slice(itemsToRemove);
    };

    const getQueueStats = (queue) => {
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

    const storeVocab = (queueData, maxCapacity = 100) => {
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

    const clearStoredVocab = () => {
        localStorage.removeItem(STORAGE_KEY);
        log("Cleared vocab queue");
    };

    // ---------------------------------------------------------------------
    // SPA URL detection (works with Turbo / dashboard widgets)
    // ---------------------------------------------------------------------
    function observeUrlChanges() {
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

    function handlePageChange() {
        const path = location.pathname;
        log("handlePageChange:", path);

        if (path.startsWith("/subjects/review")) {
            initReviewPage();
        } else if (path === "/dashboard" || path === "/") {
            initDashboardPage();
        }
    }

    // ---------------------------------------------------------------------
    // REVIEW PAGE LOGIC
    // ---------------------------------------------------------------------
    function initReviewPage() {
        if (reviewInitialized) return;
        reviewInitialized = true;

        log("Initializing review capture…");

        // Load existing queue data
        let queueData = loadStoredVocab();
        // Create a Set of existing words for fast duplicate checking
        let existingWords = new Set(queueData.queue.map(item => item.word));

        function getCurrentWord() {
            const el =
                document.querySelector(".character-header__characters") ||
                document.querySelector(".subject-character__characters");
            const word = el?.textContent?.trim();
            log("Current visible word:", word);
            return word || null;
        }

        function getQueue() {
            const queueRoot = document.querySelector("#quiz-queue");
            if (!queueRoot || !queueRoot.firstElementChild) {
                log("No #quiz-queue element found.");
                return null;
            }

            try {
                const jsonText = queueRoot.firstElementChild.textContent;
                const arr = JSON.parse(jsonText);
                if (Array.isArray(arr)) {
                    return arr;
                } else {
                    log("Queue JSON is not an array:", arr);
                    return null;
                }
            } catch (e) {
                console.warn("[WK STORY] Failed to parse queue JSON:", e);
                return null;
            }
        }

        function findCurrentItem(word, queue) {
            if (!word || !queue) return null;
            const item = queue.find(
                obj =>
                    (obj.type === "Vocabulary" || obj.type === "KanaVocabulary") &&
                    obj.characters === word
            );
            log("Matched item for word:", word, "→", item);
            return item;
        }

        window.addEventListener("didAnswerQuestion", () => {
            log("didAnswerQuestion fired → matching visible word with queue…");

            const word = getCurrentWord();
            const queue = getQueue();
            const item = findCurrentItem(word, queue);

            if (!item) {
                log("No vocab item found for this answer.");
                return;
            }

            const slug = item.characters;
            if (!slug) {
                log("Item has no characters field:", item);
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
                
                log("Collected vocab:", slug, "on date:", vocabItem.date);
                
                // Store immediately with capacity enforcement
                storeVocab(queueData, getQueueCapacity());
            } else {
                log("Vocab already collected, skipping duplicate:", slug);
            }
        });

        // Mark completion → persist vocab for dashboard button
        window.addEventListener("didCompleteSession", () => {
            log("didCompleteSession fired — queue size:", queueData.queue.length);
            storeVocab(queueData, getQueueCapacity());
        });
    }

    // ---------------------------------------------------------------------
    // DASHBOARD PAGE LOGIC
    // ---------------------------------------------------------------------
    function initDashboardPage() {
        log("Initializing dashboard…");

        const queueData = loadStoredVocab();
        log("Loaded vocab from localStorage:", queueData);

        // Always setup button, even if queue is empty (will show appropriate message)
        setupDashboardButton(queueData);
    }

    function setupDashboardButton(queueData) {
        const observer = new MutationObserver(() => {
            const reviewsLink =
                document.querySelector('a[href="/subjects/review"]') ||
                document.querySelector('a[href="https://www.wanikani.com/subjects/review"]');

            if (!reviewsLink) return;
            if (document.getElementById("wk-story-btn")) {
                observer.disconnect();
                return;
            }

            log("Found Start Reviews link for button insertion.");
            insertDashboardButton(reviewsLink, queueData);
            observer.disconnect();
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    function insertDashboardButton(reviewsLink, queueData) {
        log("Inserting dashboard button…");

        const totalWords = queueData.queue.length;
        const wordsPerStory = getWordsPerStory();
        const queueCapacity = getQueueCapacity();
        
        // Calculate words that will be selected
        const wordsToSelect = Math.min(wordsPerStory, totalWords);
        
        // Generate Story button with selection/total format
        const btn = document.createElement("button");
        btn.id = "wk-story-btn";
        
        if (totalWords === 0) {
            btn.textContent = "Generate Story (no words yet)";
        } else if (totalWords < wordsPerStory) {
            btn.textContent = `Generate Story (${wordsToSelect} of ${totalWords} words)`;
        } else {
            btn.textContent = `Generate Story (${wordsToSelect} from ${totalWords} words)`;
        }
        
        btn.style.padding = "10px 20px";
        btn.style.marginTop = "12px";
        btn.style.width = "100%";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "16px";
        btn.style.background = "#0074e9";
        btn.style.color = "white";
        btn.style.border = "none";
        btn.style.borderRadius = "6px";

        btn.addEventListener("click", () => generateStory(null, btn));

        // Capacity indicator
        const capacityIndicator = document.createElement("div");
        capacityIndicator.style.fontSize = "11px";
        capacityIndicator.style.marginTop = "6px";
        capacityIndicator.style.textAlign = "center";
        
        const capacityPercent = (totalWords / queueCapacity) * 100;
        let capacityColor = "#28a745"; // green
        if (capacityPercent >= 95) {
            capacityColor = "#dc3545"; // red
        } else if (capacityPercent >= 80) {
            capacityColor = "#ffc107"; // yellow
        }
        
        capacityIndicator.innerHTML = `<span style="color: ${capacityColor}; font-weight: 500;">Queue: ${totalWords}/${queueCapacity} words</span>`;
        
        // Date range indicator
        const dateIndicator = document.createElement("div");
        dateIndicator.style.fontSize = "11px";
        dateIndicator.style.marginTop = "4px";
        dateIndicator.style.textAlign = "center";
        dateIndicator.style.color = "#666";
        
        if (queueData.stats.oldestDate && queueData.stats.newestDate) {
            const formatDate = (dateStr) => {
                const date = new Date(dateStr + "T00:00:00");
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            };
            
            const dateRange = queueData.stats.oldestDate === queueData.stats.newestDate
                ? formatDate(queueData.stats.oldestDate)
                : `${formatDate(queueData.stats.oldestDate)} - ${formatDate(queueData.stats.newestDate)}`;
            
            dateIndicator.textContent = `Words from: ${dateRange}`;
        } else {
            dateIndicator.textContent = "No vocabulary collected yet";
        }

        // Settings link
        const settingsLink = document.createElement("button");
        settingsLink.textContent = "Story settings";
        settingsLink.style.marginTop = "8px";
        settingsLink.style.display = "block";
        settingsLink.style.width = "100%";
        settingsLink.style.padding = "6px";
        settingsLink.style.fontSize = "12px";
        settingsLink.style.background = "transparent";
        settingsLink.style.color = "#0074e9";
        settingsLink.style.border = "none";
        settingsLink.style.cursor = "pointer";
        settingsLink.style.textDecoration = "underline";

        settingsLink.addEventListener("click", () => openSettingsOverlay());

        reviewsLink.insertAdjacentElement("afterend", settingsLink);
        reviewsLink.insertAdjacentElement("afterend", dateIndicator);
        reviewsLink.insertAdjacentElement("afterend", capacityIndicator);
        reviewsLink.insertAdjacentElement("afterend", btn);

        log("Dashboard button + indicators + settings link inserted.");
    }

    // ---------------------------------------------------------------------
    // VOCABULARY SELECTION LOGIC
    // ---------------------------------------------------------------------
    function selectVocabularyForStory(queue, wordsPerStory, samplingMode) {
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

    function getSelectionStats(queue, selectedWords) {
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

    // ---------------------------------------------------------------------
    // BUTTON STATE HELPERS
    // ---------------------------------------------------------------------
    function setButtonLoading(button) {
        if (!button) return;
        button.disabled = true;
        button.textContent = "Generating story...";
        button.style.opacity = "0.7";
        button.style.cursor = "wait";
    }

    function resetButtonState(button, totalWords) {
        if (!button) return;
        button.disabled = false;
        
        const wordsPerStory = getWordsPerStory();
        const wordsToSelect = Math.min(wordsPerStory, totalWords);
        
        if (totalWords === 0) {
            button.textContent = "Generate Story (no words yet)";
        } else if (totalWords < wordsPerStory) {
            button.textContent = `Generate Story (${wordsToSelect} of ${totalWords} words)`;
        } else {
            button.textContent = `Generate Story (${wordsToSelect} from ${totalWords} words)`;
        }
        
        button.style.opacity = "1";
        button.style.cursor = "pointer";
    }

    // ---------------------------------------------------------------------
    // STORY GENERATION (OpenAI API via GM_xmlhttpRequest)
    // ---------------------------------------------------------------------
    function generateStory(vocab = null, button = null) {
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
            openSettingsOverlay();
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

            showStoryOverlay(storyData);
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

    // ---------------------------------------------------------------------
    // AUDIO GENERATION (OpenAI TTS API)
    // ---------------------------------------------------------------------
    async function generateAudio(text, apiKey) {
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
                model: "gpt-4o-mini-tts", // Use tts-1 for speed, tts-1-hd for quality
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

    // ---------------------------------------------------------------------
    // STORY DISPLAY
    // ---------------------------------------------------------------------

    function showStoryOverlay(storyData) {
        const overlay = document.createElement("div");
        overlay.id = "wk-story-overlay";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0,0,0,0.7)";
        overlay.style.zIndex = "9999";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";

        const card = document.createElement("div");
        card.style.background = "var(--color-wk-panel-background)";
        card.style.color = "var(--color-text)";
        card.style.padding = "24px";
        card.style.borderRadius = "8px";
        card.style.width = "min(900px, 95vw)";
        card.style.maxHeight = "90vh";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.boxShadow = "0 10px 40px rgba(0,0,0,0.4)";

        const heading = document.createElement("h2");
        heading.textContent = "Review Story";
        heading.style.marginTop = "0";
        heading.style.marginBottom = "12px";

        const scrollArea = document.createElement("div");
        scrollArea.style.flex = "1";
        scrollArea.style.overflowY = "auto";
        scrollArea.style.padding = "12px";
        scrollArea.style.fontSize = "16px";

        // Japanese Story Section
        const storySection = document.createElement("div");
        storySection.style.marginBottom = "20px";

        const storyHeading = document.createElement("h3");
        storyHeading.textContent = "Story";
        storyHeading.style.marginTop = "0";
        storyHeading.style.marginBottom = "12px";
        storyHeading.style.fontSize = "18px";
        storyHeading.style.fontWeight = "bold";

        const storyText = document.createElement("div");
        storyText.style.whiteSpace = "pre-wrap";
        storyText.style.lineHeight = "1.8";
        storyText.style.fontSize = "16px";
        storyText.style.padding = "12px";
        storyText.style.background = "rgba(0,0,0,0.05)";
        storyText.style.borderRadius = "4px";
        storyText.textContent = storyData.japanese_story;

        storySection.appendChild(storyHeading);
        storySection.appendChild(storyText);

        // Audio Controls Section
        const audioControlsSection = document.createElement("div");
        audioControlsSection.style.marginBottom = "20px";
        audioControlsSection.style.marginTop = "20px";
        audioControlsSection.style.padding = "16px";
        audioControlsSection.style.background = "rgba(0,0,0,0.03)";
        audioControlsSection.style.borderRadius = "6px";
        audioControlsSection.style.border = "1px solid rgba(0,0,0,0.1)";
        audioControlsSection.style.display = "none"; // Hidden until audio is generated

        // Buttons row container
        const buttonsRow = document.createElement("div");
        buttonsRow.style.display = "flex";
        buttonsRow.style.gap = "8px";
        buttonsRow.style.alignItems = "center";
        buttonsRow.style.justifyContent = "center";
        buttonsRow.style.marginBottom = "12px";

        // Helper function to create control button
        const createControlButton = (text, isPrimary = false) => {
            const btn = document.createElement("button");
            btn.textContent = text;
            btn.style.padding = "10px 16px";
            btn.style.borderRadius = "6px";
            btn.style.border = isPrimary ? "none" : "1px solid #ddd";
            btn.style.cursor = "pointer";
            btn.style.background = isPrimary ? "#0074e9" : "var(--color-wk-panel-background)";
            btn.style.color = isPrimary ? "white" : "var(--color-text)";
            btn.style.fontSize = "14px";
            btn.style.fontWeight = "500";
            btn.style.transition = "background 0.2s";
            btn.style.flexShrink = "0";
            btn.style.minWidth = "44px"; // Touch-friendly

            if (isPrimary) {
                btn.addEventListener("mouseenter", () => {
                    if (!btn.disabled) btn.style.background = "#0056b3";
                });
                btn.addEventListener("mouseleave", () => {
                    if (!btn.disabled) btn.style.background = "#0074e9";
                });
            } else {
                btn.addEventListener("mouseenter", () => {
                    if (!btn.disabled) btn.style.background = "rgba(0,0,0,0.05)";
                });
                btn.addEventListener("mouseleave", () => {
                    if (!btn.disabled) btn.style.background = "var(--color-wk-panel-background)";
                });
            }

            return btn;
        };

        // Create control buttons with Font Awesome icons
        const rewindButton = createControlButton("");
        rewindButton.innerHTML = '<i class="fas fa-backward-step"></i>';
        rewindButton.title = "Restart from beginning";
        
        const skipBackButton = createControlButton("");
        skipBackButton.innerHTML = '<i class="fas fa-rotate-left"></i> 10s';
        skipBackButton.title = "Skip backward 10 seconds";
        
        const playPauseButton = createControlButton("", true);
        playPauseButton.innerHTML = '<i class="fas fa-play"></i> Play';
        playPauseButton.style.minWidth = "100px";
        
        const skipForwardButton = createControlButton("");
        skipForwardButton.innerHTML = '<i class="fas fa-rotate-right"></i> 10s';
        skipForwardButton.title = "Skip forward 10 seconds";
        
        const downloadButton = createControlButton("");
        downloadButton.innerHTML = '<i class="fas fa-download"></i>';
        downloadButton.title = "Download audio file";

        // Add buttons to row
        buttonsRow.appendChild(rewindButton);
        buttonsRow.appendChild(skipBackButton);
        buttonsRow.appendChild(playPauseButton);
        buttonsRow.appendChild(skipForwardButton);
        buttonsRow.appendChild(downloadButton);

        // Progress bar container
        const progressContainer = document.createElement("div");
        progressContainer.style.display = "flex";
        progressContainer.style.flexDirection = "column";
        progressContainer.style.gap = "8px";

        // Time display
        const timeDisplay = document.createElement("div");
        timeDisplay.style.display = "flex";
        timeDisplay.style.justifyContent = "space-between";
        timeDisplay.style.fontSize = "12px";
        timeDisplay.style.color = "#666";
        timeDisplay.style.fontFamily = "monospace";

        const currentTimeSpan = document.createElement("span");
        currentTimeSpan.textContent = "0:00";
        
        const durationSpan = document.createElement("span");
        durationSpan.textContent = "0:00";

        timeDisplay.appendChild(currentTimeSpan);
        timeDisplay.appendChild(durationSpan);

        // Progress bar track
        const progressTrack = document.createElement("div");
        progressTrack.style.position = "relative";
        progressTrack.style.width = "100%";
        progressTrack.style.height = "8px";
        progressTrack.style.background = "rgba(0,0,0,0.1)";
        progressTrack.style.borderRadius = "4px";
        progressTrack.style.cursor = "pointer";
        progressTrack.style.overflow = "hidden";

        // Progress bar filled portion
        const progressFilled = document.createElement("div");
        progressFilled.style.position = "absolute";
        progressFilled.style.left = "0";
        progressFilled.style.top = "0";
        progressFilled.style.height = "100%";
        progressFilled.style.width = "0%";
        progressFilled.style.background = "#0074e9";
        progressFilled.style.borderRadius = "4px";
        progressFilled.style.transition = "width 0.1s linear";

        // Progress bar handle
        const progressHandle = document.createElement("div");
        progressHandle.style.position = "absolute";
        progressHandle.style.left = "0";
        progressHandle.style.top = "50%";
        progressHandle.style.transform = "translate(-50%, -50%)";
        progressHandle.style.width = "16px";
        progressHandle.style.height = "16px";
        progressHandle.style.background = "#0074e9";
        progressHandle.style.borderRadius = "50%";
        progressHandle.style.border = "2px solid white";
        progressHandle.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
        progressHandle.style.cursor = "pointer";
        progressHandle.style.opacity = "0";
        progressHandle.style.transition = "opacity 0.2s";

        progressTrack.addEventListener("mouseenter", () => {
            progressHandle.style.opacity = "1";
        });
        progressTrack.addEventListener("mouseleave", () => {
            progressHandle.style.opacity = "0";
        });

        progressTrack.appendChild(progressFilled);
        progressTrack.appendChild(progressHandle);

        progressContainer.appendChild(progressTrack);
        progressContainer.appendChild(timeDisplay);

        // Add all components to audio controls section
        audioControlsSection.appendChild(buttonsRow);
        audioControlsSection.appendChild(progressContainer);

        // Audio generation state
        let audioUrl = null;
        let audioBlob = null;
        let audioElement = null;

        // Helper function to format time (seconds to MM:SS)
        const formatTime = (seconds) => {
            if (!isFinite(seconds)) return "0:00";
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Initial play button to trigger audio generation
        const initialPlayButton = document.createElement("button");
        initialPlayButton.innerHTML = '<i class="fas fa-play"></i> Generate & Play Story Audio';
        initialPlayButton.style.padding = "12px 24px";
        initialPlayButton.style.borderRadius = "6px";
        initialPlayButton.style.border = "none";
        initialPlayButton.style.cursor = "pointer";
        initialPlayButton.style.background = "#0074e9";
        initialPlayButton.style.color = "white";
        initialPlayButton.style.fontSize = "14px";
        initialPlayButton.style.fontWeight = "500";
        initialPlayButton.style.transition = "background 0.2s";
        initialPlayButton.style.margin = "20px 0";
        initialPlayButton.style.display = "flex";
        initialPlayButton.style.alignItems = "center";
        initialPlayButton.style.gap = "8px";
        initialPlayButton.style.justifyContent = "center";

        initialPlayButton.addEventListener("mouseenter", () => {
            if (!initialPlayButton.disabled) initialPlayButton.style.background = "#0056b3";
        });
        initialPlayButton.addEventListener("mouseleave", () => {
            if (!initialPlayButton.disabled) initialPlayButton.style.background = "#0074e9";
        });

        // Play/Pause button click handler
        playPauseButton.addEventListener("click", () => {
            if (!audioElement) return;
            
            if (audioElement.paused) {
                audioElement.play();
            } else {
                audioElement.pause();
            }
        });

        // Initial play button click handler with loading state
        initialPlayButton.addEventListener("click", async () => {
            const apiKey = getApiKey();
            if (!apiKey) {
                alert("No OpenAI API key configured. Please set your API key in the settings.");
                return;
            }

            // Show loading state
            const originalHTML = initialPlayButton.innerHTML;
            initialPlayButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating audio...';
            initialPlayButton.disabled = true;
            initialPlayButton.style.background = "#999";
            initialPlayButton.style.cursor = "not-allowed";

            try {
                // Generate audio
                audioBlob = await generateAudio(storyData.japanese_story, apiKey);
                audioUrl = URL.createObjectURL(audioBlob);

                // Create audio element
                audioElement = new Audio(audioUrl);
                
                // Handle playback events
                audioElement.addEventListener("ended", () => {
                    playPauseButton.innerHTML = '<i class="fas fa-play"></i> Play';
                });

                audioElement.addEventListener("pause", () => {
                    if (!audioElement.ended) {
                        playPauseButton.innerHTML = '<i class="fas fa-play"></i> Play';
                    }
                });

                audioElement.addEventListener("play", () => {
                    playPauseButton.innerHTML = '<i class="fas fa-pause"></i> Pause';
                });

                audioElement.addEventListener("loadedmetadata", () => {
                    durationSpan.textContent = formatTime(audioElement.duration);
                });

                // Update progress bar as audio plays
                audioElement.addEventListener("timeupdate", () => {
                    if (!audioElement.duration) return;
                    
                    const progress = (audioElement.currentTime / audioElement.duration) * 100;
                    progressFilled.style.width = `${progress}%`;
                    progressHandle.style.left = `${progress}%`;
                    currentTimeSpan.textContent = formatTime(audioElement.currentTime);
                });

                // Auto-play the audio
                await audioElement.play();

                // Hide initial button and show full controls
                initialPlayButton.style.display = "none";
                audioControlsSection.style.display = "block";

                log("Audio playback started successfully");
            } catch (error) {
                log("Audio generation/playback error:", error);
                alert("Failed to generate audio. Please check your API key and try again.");
                
                // Reset button state on error
                initialPlayButton.innerHTML = originalHTML;
                initialPlayButton.disabled = false;
                initialPlayButton.style.background = "#0074e9";
                initialPlayButton.style.cursor = "pointer";
            }
        });

        // Download button click handler
        downloadButton.addEventListener("click", () => {
            if (!audioBlob || !audioUrl) {
                log("No audio to download");
                return;
            }

            // Create download link
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
            const filename = `wanikani-story-${timestamp}.mp3`;
            
            const a = document.createElement("a");
            a.href = audioUrl;
            a.download = filename;
            a.style.display = "none";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            log("Audio download initiated:", filename);
        });

        // Rewind button - restart from beginning
        rewindButton.addEventListener("click", () => {
            if (!audioElement) return;
            audioElement.currentTime = 0;
            log("Audio rewound to beginning");
        });

        // Skip backward button - jump 10 seconds back
        skipBackButton.addEventListener("click", () => {
            if (!audioElement) return;
            audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
            log("Skipped backward 10 seconds");
        });

        // Skip forward button - jump 10 seconds ahead
        skipForwardButton.addEventListener("click", () => {
            if (!audioElement) return;
            audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 10);
            log("Skipped forward 10 seconds");
        });

        // Progress bar seek functionality - click to jump to position
        progressTrack.addEventListener("click", (e) => {
            if (!audioElement || !audioElement.duration) return;
            
            const rect = progressTrack.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const newTime = percentage * audioElement.duration;
            
            audioElement.currentTime = Math.max(0, Math.min(audioElement.duration, newTime));
            log(`Seeked to ${formatTime(newTime)}`);
        });

        // Progress bar drag functionality
        let isDragging = false;

        progressHandle.addEventListener("mousedown", (e) => {
            if (!audioElement || !audioElement.duration) return;
            isDragging = true;
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging || !audioElement || !audioElement.duration) return;
            
            const rect = progressTrack.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            const newTime = percentage * audioElement.duration;
            
            audioElement.currentTime = newTime;
        });

        document.addEventListener("mouseup", () => {
            if (isDragging) {
                isDragging = false;
                log("Drag seek completed");
            }
        });

        // English Translation Section (Collapsible)
        const translationSection = document.createElement("div");
        translationSection.style.marginBottom = "20px";

        const translationToggle = document.createElement("button");
        translationToggle.textContent = "Show English Translation";
        translationToggle.style.padding = "8px 16px";
        translationToggle.style.borderRadius = "6px";
        translationToggle.style.border = "1px solid #ddd";
        translationToggle.style.cursor = "pointer";
        translationToggle.style.background = "var(--color-wk-panel-background)";
        translationToggle.style.color = "var(--color-text)";
        translationToggle.style.fontSize = "14px";
        translationToggle.style.marginBottom = "8px";
        translationToggle.style.width = "100%";
        translationToggle.style.textAlign = "left";
        translationToggle.style.fontWeight = "500";

        const translationContent = document.createElement("div");
        translationContent.style.display = "none";
        translationContent.style.whiteSpace = "pre-wrap";
        translationContent.style.lineHeight = "1.6";
        translationContent.style.fontSize = "14px";
        translationContent.style.padding = "12px";
        translationContent.style.background = "rgba(0,0,0,0.05)";
        translationContent.style.borderRadius = "4px";
        translationContent.style.marginTop = "8px";
        translationContent.textContent = storyData.english_translation;

        translationToggle.addEventListener("click", () => {
            if (translationContent.style.display === "none") {
                translationContent.style.display = "block";
                translationToggle.textContent = "Hide English Translation";
            } else {
                translationContent.style.display = "none";
                translationToggle.textContent = "Show English Translation";
            }
        });

        translationSection.appendChild(translationToggle);
        translationSection.appendChild(translationContent);

        // Vocabulary List Section
        const vocabSection = document.createElement("div");
        vocabSection.style.marginBottom = "20px";

        const vocabHeading = document.createElement("h3");
        vocabHeading.textContent = "Vocabulary Used";
        vocabHeading.style.marginTop = "0";
        vocabHeading.style.marginBottom = "12px";
        vocabHeading.style.fontSize = "18px";
        vocabHeading.style.fontWeight = "bold";

        const vocabTable = document.createElement("table");
        vocabTable.style.width = "100%";
        vocabTable.style.borderCollapse = "collapse";
        vocabTable.style.fontSize = "14px";

        // Table header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        headerRow.style.background = "rgba(0,0,0,0.1)";

        const headers = ["Word", "Reading", "Meaning"];
        headers.forEach(headerText => {
            const th = document.createElement("th");
            th.textContent = headerText;
            th.style.padding = "8px";
            th.style.textAlign = "left";
            th.style.borderBottom = "2px solid #ddd";
            th.style.fontWeight = "bold";
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        vocabTable.appendChild(thead);

        // Table body
        const tbody = document.createElement("tbody");
        storyData.vocabulary_list.forEach((vocab, index) => {
            const row = document.createElement("tr");
            if (index % 2 === 0) {
                row.style.background = "rgba(0,0,0,0.03)";
            }
            row.style.transition = "background 0.2s";

            // Add hover effect
            row.addEventListener("mouseenter", () => {
                row.style.background = "rgba(0,116,233,0.1)";
            });
            row.addEventListener("mouseleave", () => {
                row.style.background = index % 2 === 0 ? "rgba(0,0,0,0.03)" : "transparent";
            });

            const wordCell = document.createElement("td");
            wordCell.textContent = vocab.word;
            wordCell.style.padding = "8px";
            wordCell.style.borderBottom = "1px solid #eee";
            wordCell.style.fontWeight = "500";

            const readingCell = document.createElement("td");
            readingCell.textContent = vocab.reading;
            readingCell.style.padding = "8px";
            readingCell.style.borderBottom = "1px solid #eee";
            readingCell.style.color = "#666";

            const meaningCell = document.createElement("td");
            meaningCell.textContent = vocab.meaning;
            meaningCell.style.padding = "8px";
            meaningCell.style.borderBottom = "1px solid #eee";

            row.appendChild(wordCell);
            row.appendChild(readingCell);
            row.appendChild(meaningCell);
            tbody.appendChild(row);
        });
        vocabTable.appendChild(tbody);

        vocabSection.appendChild(vocabHeading);
        vocabSection.appendChild(vocabTable);

        // Add all sections to scroll area
        scrollArea.appendChild(storySection);
        scrollArea.appendChild(initialPlayButton);
        scrollArea.appendChild(audioControlsSection);
        scrollArea.appendChild(translationSection);
        scrollArea.appendChild(vocabSection);

        const buttonBar = document.createElement("div");
        buttonBar.style.display = "flex";
        buttonBar.style.justifyContent = "flex-end";
        buttonBar.style.marginTop = "16px";
        buttonBar.style.gap = "8px";

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Continue to dashboard";
        closeBtn.style.padding = "8px 16px";
        closeBtn.style.borderRadius = "6px";
        closeBtn.style.border = "none";
        closeBtn.style.cursor = "pointer";
        closeBtn.style.background = "#0074e9";
        closeBtn.style.color = "white";
        closeBtn.style.fontSize = "14px";

        closeBtn.addEventListener("click", () => {
            // Cleanup: Stop audio and revoke object URL to free memory
            if (audioElement) {
                audioElement.pause();
                audioElement = null;
            }
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
                audioUrl = null;
            }
            overlay.remove();
        });

        buttonBar.appendChild(closeBtn);
        card.appendChild(heading);
        card.appendChild(scrollArea);
        card.appendChild(buttonBar);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    // ---------------------------------------------------------------------
    // SETTINGS OVERLAY
    // ---------------------------------------------------------------------
    function openSettingsOverlay() {
        // Avoid multiple overlays
        if (document.getElementById("wk-story-settings-overlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "wk-story-settings-overlay";
        overlay.style.position = "fixed";
        overlay.style.inset = "0";
        overlay.style.background = "rgba(0,0,0,0.6)";
        overlay.style.zIndex = "10000";
        overlay.style.display = "flex";
        overlay.style.alignItems = "center";
        overlay.style.justifyContent = "center";

        const card = document.createElement("div");
        card.id = "wk-story-settings-card";
        card.style.background = "var(--color-wk-panel-background)";
        card.style.color = "var(--color-text)";
        card.style.padding = "32px";
        card.style.borderRadius = "12px";
        card.style.width = "min(750px, 95vw)";
        card.style.maxHeight = "90vh";
        card.style.boxShadow = "0 10px 40px rgba(0,0,0,0.4)";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "24px";
        card.style.overflow = "hidden";

        const title = document.createElement("h2");
        title.textContent = "WaniKani Story Generator – Settings";
        title.style.margin = "0";
        title.style.fontSize = "22px";
        title.style.fontWeight = "bold";
        title.style.letterSpacing = "-0.5px";

        // Scrollable content area
        const scrollArea = document.createElement("div");
        scrollArea.id = "wk-story-settings-scroll";
        scrollArea.style.overflowY = "auto";
        scrollArea.style.display = "flex";
        scrollArea.style.flexDirection = "column";
        scrollArea.style.gap = "32px";
        scrollArea.style.paddingRight = "8px";

        // Helper function to create section headings
        const createSectionHeading = (text) => {
            const heading = document.createElement("h3");
            heading.textContent = text;
            heading.style.margin = "0 0 16px 0";
            heading.style.fontSize = "17px";
            heading.style.fontWeight = "600";
            heading.style.color = "#0074e9";
            heading.style.borderBottom = "2px solid #e0e0e0";
            heading.style.paddingBottom = "10px";
            return heading;
        };

        // Helper function to create labels
        const createLabel = (text) => {
            const label = document.createElement("label");
            label.textContent = text;
            label.style.fontSize = "14px";
            label.style.fontWeight = "500";
            label.style.display = "block";
            label.style.marginBottom = "8px";
            label.style.color = "#333";
            return label;
        };

        // ===== STORY GENERATION SECTION =====
        const storySection = document.createElement("div");
        storySection.id = "wk-story-settings-story-section";
        storySection.appendChild(createSectionHeading("Story Generation"));

        const apiKeyContainer = document.createElement("div");
        apiKeyContainer.id = "wk-story-settings-api-key-container";
        apiKeyContainer.style.marginBottom = "20px";
        apiKeyContainer.appendChild(createLabel("OpenAI API Key:"));
        const apiKeyInput = document.createElement("input");
        apiKeyInput.id = "wk-story-settings-api-key-input";
        apiKeyInput.type = "password";
        apiKeyInput.style.width = "100%";
        apiKeyInput.style.padding = "10px 12px";
        apiKeyInput.style.fontSize = "14px";
        apiKeyInput.style.borderRadius = "6px";
        apiKeyInput.style.border = "1px solid #ddd";
        apiKeyInput.style.boxSizing = "border-box";
        apiKeyInput.style.transition = "border-color 0.2s";
        apiKeyInput.addEventListener("focus", () => {
            apiKeyInput.style.borderColor = "#0074e9";
        });
        apiKeyInput.addEventListener("blur", () => {
            apiKeyInput.style.borderColor = "#ddd";
        });
        apiKeyInput.value = getApiKey();
        apiKeyContainer.appendChild(apiKeyInput);
        storySection.appendChild(apiKeyContainer);

        const promptContainer = document.createElement("div");
        promptContainer.id = "wk-story-settings-prompt-container";
        promptContainer.style.marginBottom = "20px";
        promptContainer.appendChild(createLabel("Story Prompt Template (use {{VOCAB}} for vocabulary list, {{COUNT}} for word count):"));
        const promptTextarea = document.createElement("textarea");
        promptTextarea.id = "wk-story-settings-prompt-textarea";
        promptTextarea.style.width = "100%";
        promptTextarea.style.padding = "10px 12px";
        promptTextarea.style.fontSize = "13px";
        promptTextarea.style.borderRadius = "6px";
        promptTextarea.style.border = "1px solid #ddd";
        promptTextarea.style.fontFamily = "monospace";
        promptTextarea.style.minHeight = "150px";
        promptTextarea.style.resize = "vertical";
        promptTextarea.style.boxSizing = "border-box";
        promptTextarea.style.lineHeight = "1.5";
        promptTextarea.style.transition = "border-color 0.2s";
        promptTextarea.addEventListener("focus", () => {
            promptTextarea.style.borderColor = "#0074e9";
        });
        promptTextarea.addEventListener("blur", () => {
            promptTextarea.style.borderColor = "#ddd";
        });
        promptTextarea.value = getPrompt();
        promptContainer.appendChild(promptTextarea);

        const resetPromptBtn = document.createElement("button");
        resetPromptBtn.id = "wk-story-settings-reset-prompt-btn";
        resetPromptBtn.innerHTML = '<i class="fas fa-undo"></i> Reset to default prompt';
        resetPromptBtn.style.padding = "8px 14px";
        resetPromptBtn.style.fontSize = "13px";
        resetPromptBtn.style.borderRadius = "6px";
        resetPromptBtn.style.border = "none";
        resetPromptBtn.style.cursor = "pointer";
        resetPromptBtn.style.background = "#888";
        resetPromptBtn.style.color = "white";
        resetPromptBtn.style.display = "flex";
        resetPromptBtn.style.alignItems = "center";
        resetPromptBtn.style.gap = "6px";
        resetPromptBtn.style.marginTop = "8px";
        resetPromptBtn.style.transition = "background 0.2s ease";
        resetPromptBtn.addEventListener("mouseenter", () => {
            resetPromptBtn.style.background = "#666";
        });
        resetPromptBtn.addEventListener("mouseleave", () => {
            resetPromptBtn.style.background = "#888";
        });
        resetPromptBtn.addEventListener("click", () => {
            promptTextarea.value = DEFAULT_PROMPT;
        });
        promptContainer.appendChild(resetPromptBtn);
        storySection.appendChild(promptContainer);

        // ===== VOCABULARY QUEUE SECTION =====
        const queueSection = document.createElement("div");
        queueSection.id = "wk-story-settings-queue-section";
        queueSection.appendChild(createSectionHeading("Vocabulary Queue"));

        // Queue capacity input
        const capacityContainer = document.createElement("div");
        capacityContainer.style.marginBottom = "20px";
        capacityContainer.appendChild(createLabel("Queue Capacity:"));
        
        const capacityInput = document.createElement("input");
        capacityInput.type = "number";
        capacityInput.min = "20";
        capacityInput.max = "500";
        capacityInput.step = "10";
        capacityInput.value = getQueueCapacity();
        capacityInput.style.width = "100%";
        capacityInput.style.padding = "10px 12px";
        capacityInput.style.fontSize = "14px";
        capacityInput.style.borderRadius = "6px";
        capacityInput.style.border = "1px solid #ddd";
        capacityInput.style.boxSizing = "border-box";
        capacityInput.style.transition = "border-color 0.2s";
        capacityInput.addEventListener("focus", () => {
            capacityInput.style.borderColor = "#0074e9";
        });
        capacityInput.addEventListener("blur", () => {
            capacityInput.style.borderColor = "#ddd";
        });
        capacityContainer.appendChild(capacityInput);
        
        const capacityHelp = document.createElement("div");
        capacityHelp.textContent = "Maximum vocabulary words to keep in queue (20-500)";
        capacityHelp.style.fontSize = "12px";
        capacityHelp.style.color = "#666";
        capacityHelp.style.marginTop = "6px";
        capacityContainer.appendChild(capacityHelp);
        queueSection.appendChild(capacityContainer);

        // Words per story input
        const wordsContainer = document.createElement("div");
        wordsContainer.style.marginBottom = "20px";
        wordsContainer.appendChild(createLabel("Words Per Story:"));
        
        const wordsInput = document.createElement("input");
        wordsInput.type = "number";
        wordsInput.min = "5";
        wordsInput.max = "100";
        wordsInput.step = "5";
        wordsInput.value = getWordsPerStory();
        wordsInput.style.width = "100%";
        wordsInput.style.padding = "10px 12px";
        wordsInput.style.fontSize = "14px";
        wordsInput.style.borderRadius = "6px";
        wordsInput.style.border = "1px solid #ddd";
        wordsInput.style.boxSizing = "border-box";
        wordsInput.style.transition = "border-color 0.2s";
        wordsInput.addEventListener("focus", () => {
            wordsInput.style.borderColor = "#0074e9";
        });
        wordsInput.addEventListener("blur", () => {
            wordsInput.style.borderColor = "#ddd";
        });
        wordsContainer.appendChild(wordsInput);
        
        const wordsHelp = document.createElement("div");
        wordsHelp.textContent = "Number of words to use when generating stories (5-100)";
        wordsHelp.style.fontSize = "12px";
        wordsHelp.style.color = "#666";
        wordsHelp.style.marginTop = "6px";
        wordsContainer.appendChild(wordsHelp);
        queueSection.appendChild(wordsContainer);

        // Sampling mode radio buttons
        const samplingContainer = document.createElement("div");
        samplingContainer.style.marginBottom = "20px";
        samplingContainer.appendChild(createLabel("Sampling Mode:"));
        
        const samplingGroup = document.createElement("div");
        samplingGroup.style.display = "flex";
        samplingGroup.style.flexDirection = "column";
        samplingGroup.style.gap = "12px";
        
        const currentMode = getSamplingMode();
        
        // Recent words option
        const recentOption = document.createElement("label");
        recentOption.style.display = "flex";
        recentOption.style.alignItems = "center";
        recentOption.style.gap = "8px";
        recentOption.style.cursor = "pointer";
        recentOption.style.fontSize = "14px";
        
        const recentRadio = document.createElement("input");
        recentRadio.type = "radio";
        recentRadio.name = "samplingMode";
        recentRadio.value = "recent";
        recentRadio.checked = currentMode === "recent";
        recentRadio.style.cursor = "pointer";
        
        const recentLabel = document.createElement("span");
        recentLabel.textContent = "Recent Words — Use newest vocabulary";
        
        recentOption.appendChild(recentRadio);
        recentOption.appendChild(recentLabel);
        
        // Random mix option
        const randomOption = document.createElement("label");
        randomOption.style.display = "flex";
        randomOption.style.alignItems = "center";
        randomOption.style.gap = "8px";
        randomOption.style.cursor = "pointer";
        randomOption.style.fontSize = "14px";
        
        const randomRadio = document.createElement("input");
        randomRadio.type = "radio";
        randomRadio.name = "samplingMode";
        randomRadio.value = "random";
        randomRadio.checked = currentMode === "random";
        randomRadio.style.cursor = "pointer";
        
        const randomLabel = document.createElement("span");
        randomLabel.textContent = "Random Mix — Review older + new words";
        
        randomOption.appendChild(randomRadio);
        randomOption.appendChild(randomLabel);
        
        samplingGroup.appendChild(recentOption);
        samplingGroup.appendChild(randomOption);
        samplingContainer.appendChild(samplingGroup);
        
        const samplingHelp = document.createElement("div");
        samplingHelp.textContent = "Recent mode uses newest words. Random mode mixes old and new for review.";
        samplingHelp.style.fontSize = "12px";
        samplingHelp.style.color = "#666";
        samplingHelp.style.marginTop = "8px";
        samplingContainer.appendChild(samplingHelp);
        queueSection.appendChild(samplingContainer);

        // ===== AUDIO SETTINGS SECTION =====
        const audioSection = document.createElement("div");
        audioSection.id = "wk-story-settings-audio-section";
        audioSection.appendChild(createSectionHeading("Audio Settings"));

        // Voice selection
        const voiceContainer = document.createElement("div");
        voiceContainer.style.marginBottom = "20px";
        voiceContainer.appendChild(createLabel("Voice:"));
        
        const voiceSelect = document.createElement("select");
        voiceSelect.style.width = "100%";
        voiceSelect.style.padding = "10px 12px";
        voiceSelect.style.fontSize = "14px";
        voiceSelect.style.borderRadius = "6px";
        voiceSelect.style.border = "1px solid #ddd";
        voiceSelect.style.boxSizing = "border-box";
        voiceSelect.style.transition = "border-color 0.2s ease";
        voiceSelect.style.cursor = "pointer";
        
        voiceSelect.addEventListener("focus", () => {
            voiceSelect.style.borderColor = "#0074e9";
        });
        voiceSelect.addEventListener("blur", () => {
            voiceSelect.style.borderColor = "#ddd";
        });
        
        const voices = [
            { value: "alloy", label: "Alloy (Neutral)" },
            { value: "ash", label: "Ash (Warm Male)" },
            { value: "ballad", label: "Ballad (Storytelling)" },
            { value: "coral", label: "Coral (Warm Female)" },
            { value: "echo", label: "Echo (Male)" },
            { value: "fable", label: "Fable (British Male)" },
            { value: "onyx", label: "Onyx (Deep Male)" },
            { value: "nova", label: "Nova (Female)" },
            { value: "sage", label: "Sage (Calm)" },
            { value: "shimmer", label: "Shimmer (Soft Female)" },
            { value: "verse", label: "Verse (Expressive)" }
        ];
        
        voices.forEach(voice => {
            const option = document.createElement("option");
            option.value = voice.value;
            option.textContent = voice.label;
            voiceSelect.appendChild(option);
        });
        voiceSelect.value = getTTSVoice();
        voiceContainer.appendChild(voiceSelect);
        audioSection.appendChild(voiceContainer);

        // Instructions text field
        const instructionsContainer = document.createElement("div");
        instructionsContainer.style.marginBottom = "12px";
        instructionsContainer.appendChild(createLabel("Instructions (mood/vibe for the narration):"));
        
        const instructionsInput = document.createElement("textarea");
        instructionsInput.style.width = "100%";
        instructionsInput.style.padding = "10px 12px";
        instructionsInput.style.fontSize = "13px";
        instructionsInput.style.borderRadius = "6px";
        instructionsInput.style.border = "1px solid #ddd";
        instructionsInput.style.minHeight = "120px";
        instructionsInput.style.resize = "vertical";
        instructionsInput.style.boxSizing = "border-box";
        instructionsInput.style.fontFamily = "monospace";
        instructionsInput.style.lineHeight = "1.5";
        instructionsInput.style.transition = "border-color 0.2s ease";
        instructionsInput.addEventListener("focus", () => {
            instructionsInput.style.borderColor = "#0074e9";
        });
        instructionsInput.addEventListener("blur", () => {
            instructionsInput.style.borderColor = "#ddd";
        });
        instructionsInput.value = getTTSInstructions();
        instructionsContainer.appendChild(instructionsInput);
        audioSection.appendChild(instructionsContainer);

        const resetInstructionsBtn = document.createElement("button");
        resetInstructionsBtn.innerHTML = '<i class="fas fa-undo"></i> Reset to default instructions';
        resetInstructionsBtn.style.padding = "8px 14px";
        resetInstructionsBtn.style.fontSize = "13px";
        resetInstructionsBtn.style.borderRadius = "6px";
        resetInstructionsBtn.style.border = "none";
        resetInstructionsBtn.style.cursor = "pointer";
        resetInstructionsBtn.style.background = "#888";
        resetInstructionsBtn.style.color = "white";
        resetInstructionsBtn.style.display = "flex";
        resetInstructionsBtn.style.alignItems = "center";
        resetInstructionsBtn.style.gap = "6px";
        resetInstructionsBtn.style.marginBottom = "20px";
        resetInstructionsBtn.style.transition = "background 0.2s ease";
        resetInstructionsBtn.addEventListener("mouseenter", () => {
            resetInstructionsBtn.style.background = "#666";
        });
        resetInstructionsBtn.addEventListener("mouseleave", () => {
            resetInstructionsBtn.style.background = "#888";
        });
        resetInstructionsBtn.addEventListener("click", () => {
            instructionsInput.value = DEFAULT_TTS_INSTRUCTIONS;
        });
        audioSection.appendChild(resetInstructionsBtn);

        // Speed slider
        const speedContainer = document.createElement("div");
        speedContainer.style.display = "flex";
        speedContainer.style.alignItems = "center";
        speedContainer.style.gap = "14px";
        speedContainer.style.marginBottom = "8px";
        
        const speedLabel = createLabel("Playback Speed:");
        speedLabel.style.marginBottom = "0";
        speedLabel.style.flex = "0 0 auto";
        
        const speedSlider = document.createElement("input");
        speedSlider.type = "range";
        speedSlider.min = "0.5";
        speedSlider.max = "2.0";
        speedSlider.step = "0.1";
        speedSlider.value = getTTSSpeed();
        speedSlider.style.flex = "1";
        
        const speedValue = document.createElement("span");
        speedValue.textContent = `${getTTSSpeed()}x`;
        speedValue.style.fontSize = "14px";
        speedValue.style.fontWeight = "bold";
        speedValue.style.minWidth = "45px";
        speedValue.style.textAlign = "right";
        
        speedSlider.addEventListener("input", (e) => {
            speedValue.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
        });
        
        speedContainer.appendChild(speedLabel);
        speedContainer.appendChild(speedSlider);
        speedContainer.appendChild(speedValue);
        audioSection.appendChild(speedContainer);

        // Add sections to scroll area
        scrollArea.appendChild(storySection);
        scrollArea.appendChild(queueSection);
        scrollArea.appendChild(audioSection);

        // Button bar
        const buttonBar = document.createElement("div");
        buttonBar.style.display = "flex";
        buttonBar.style.justifyContent = "flex-end";
        buttonBar.style.gap = "12px";
        buttonBar.style.paddingTop = "20px";
        buttonBar.style.marginTop = "8px";
        buttonBar.style.borderTop = "1px solid #ddd";

        const cancelBtn = document.createElement("button");
        cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
        cancelBtn.style.padding = "10px 20px";
        cancelBtn.style.borderRadius = "6px";
        cancelBtn.style.border = "none";
        cancelBtn.style.cursor = "pointer";
        cancelBtn.style.background = "#ccc";
        cancelBtn.style.color = "#222";
        cancelBtn.style.fontSize = "14px";
        cancelBtn.style.display = "flex";
        cancelBtn.style.alignItems = "center";
        cancelBtn.style.gap = "6px";
        cancelBtn.style.transition = "background 0.2s ease";
        cancelBtn.addEventListener("mouseenter", () => {
            cancelBtn.style.background = "#bbb";
        });
        cancelBtn.addEventListener("mouseleave", () => {
            cancelBtn.style.background = "#ccc";
        });

        const saveBtn = document.createElement("button");
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        saveBtn.style.padding = "10px 20px";
        saveBtn.style.borderRadius = "6px";
        saveBtn.style.border = "none";
        saveBtn.style.cursor = "pointer";
        saveBtn.style.background = "#0074e9";
        saveBtn.style.color = "white";
        saveBtn.style.fontSize = "14px";
        saveBtn.style.display = "flex";
        saveBtn.style.alignItems = "center";
        saveBtn.style.gap = "6px";
        saveBtn.style.transition = "background 0.2s ease";
        saveBtn.addEventListener("mouseenter", () => {
            saveBtn.style.background = "#0063c4";
        });
        saveBtn.addEventListener("mouseleave", () => {
            saveBtn.style.background = "#0074e9";
        });

        cancelBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            overlay.remove();
        });
        saveBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // Save story generation settings
            const key = apiKeyInput.value.trim();
            const prompt = promptTextarea.value.trim();
            setApiKey(key);
            setPrompt(prompt);
            
            // Save queue configuration settings
            const capacity = parseInt(capacityInput.value, 10);
            const wordsPerStory = parseInt(wordsInput.value, 10);
            const samplingMode = document.querySelector('input[name="samplingMode"]:checked')?.value || "recent";
            setQueueCapacity(capacity);
            setWordsPerStory(wordsPerStory);
            setSamplingMode(samplingMode);
            
            // Save TTS settings
            const voice = voiceSelect.value;
            const instructions = instructionsInput.value.trim();
            const speed = parseFloat(speedSlider.value);
            setTTSVoice(voice);
            setTTSInstructions(instructions);
            setTTSSpeed(speed);
            
            alert("Settings saved successfully!");
            overlay.remove();
        });

        buttonBar.appendChild(cancelBtn);
        buttonBar.appendChild(saveBtn);

        card.appendChild(title);
        card.appendChild(scrollArea);
        card.appendChild(buttonBar);
        overlay.appendChild(card);
        document.body.appendChild(overlay);
    }

    // ---------------------------------------------------------------------
    // Kick things off
    // ---------------------------------------------------------------------
    observeUrlChanges();
    handlePageChange();
})();