/**
 * Settings Overlay UI Module
 * 
 * Displays a configuration overlay for:
 * - Story generation settings (API key, custom prompt)
 * - Vocabulary queue settings (capacity, words per story, sampling mode)
 * - Audio settings (voice, TTS instructions, playback speed)
 */

import { log, DEFAULT_PROMPT, DEFAULT_TTS_INSTRUCTIONS } from './core.js';
import {
    getApiKey, setApiKey,
    getPrompt, setPrompt,
    getQueueCapacity, setQueueCapacity,
    getWordsPerStory, setWordsPerStory,
    getSamplingMode, setSamplingMode,
    getTTSVoice, setTTSVoice,
    getTTSInstructions, setTTSInstructions,
    getTTSSpeed, setTTSSpeed
} from './storage.js';

/**
 * Helper: Creates a section heading with consistent styling
 * @param {string} text - Section heading text
 * @returns {HTMLElement} Styled heading element
 */
function createSectionHeading(text) {
    const heading = document.createElement('h3');
    heading.textContent = text;
    heading.style.fontSize = '16px';
    heading.style.fontWeight = 'bold';
    heading.style.marginBottom = '16px';
    heading.style.paddingBottom = '10px';
    heading.style.borderBottom = '2px solid #0074e9';
    heading.style.color = '#0074e9';
    return heading;
}

/**
 * Helper: Creates a label with consistent styling
 * @param {string} text - Label text
 * @returns {HTMLElement} Styled label element
 */
function createLabel(text) {
    const label = document.createElement('label');
    label.textContent = text;
    label.style.display = 'block';
    label.style.fontSize = '14px';
    label.style.fontWeight = '600';
    label.style.marginBottom = '8px';
    label.style.color = 'var(--color-text, #333)';
    return label;
}

/**
 * Opens the settings overlay UI with all configuration options
 */
export function openSettingsOverlay() {
    log('Opening settings overlay...');

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'wk-story-settings-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '10000';
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });

    // Card container
    const card = document.createElement('div');
    card.id = 'wk-story-settings-card';
    card.style.background = 'var(--color-wk-panel-background, #fff)';
    card.style.padding = '32px';
    card.style.borderRadius = '10px';
    card.style.width = '750px';
    card.style.maxWidth = '90vw';
    card.style.maxHeight = '90vh';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    card.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Title
    const title = document.createElement('h2');
    title.textContent = 'WaniKani Story Settings';
    title.style.fontSize = '24px';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '24px';
    title.style.color = 'var(--color-text, #222)';

    // Scroll area for form sections
    const scrollArea = document.createElement('div');
    scrollArea.style.flex = '1';
    scrollArea.style.overflowY = 'auto';
    scrollArea.style.marginBottom = '16px';
    scrollArea.style.display = 'flex';
    scrollArea.style.flexDirection = 'column';
    scrollArea.style.gap = '32px';

    // ===== STORY GENERATION SECTION =====
    const storySection = document.createElement('div');
    storySection.id = 'wk-story-settings-story-section';
    storySection.appendChild(createSectionHeading('Story Generation'));

    // API key input (password type)
    const apiKeyContainer = document.createElement('div');
    apiKeyContainer.style.marginBottom = '20px';
    apiKeyContainer.appendChild(createLabel('OpenAI API Key:'));

    const apiKeyInput = document.createElement('input');
    apiKeyInput.type = 'password';
    apiKeyInput.placeholder = 'sk-...';
    apiKeyInput.value = getApiKey();
    apiKeyInput.style.width = '100%';
    apiKeyInput.style.padding = '10px 12px';
    apiKeyInput.style.fontSize = '14px';
    apiKeyInput.style.borderRadius = '6px';
    apiKeyInput.style.border = '1px solid #ddd';
    apiKeyInput.style.boxSizing = 'border-box';
    apiKeyInput.style.transition = 'border-color 0.2s ease';
    apiKeyInput.addEventListener('focus', () => {
        apiKeyInput.style.borderColor = '#0074e9';
    });
    apiKeyInput.addEventListener('blur', () => {
        apiKeyInput.style.borderColor = '#ddd';
    });
    apiKeyContainer.appendChild(apiKeyInput);

    const apiKeyHelp = document.createElement('div');
    apiKeyHelp.textContent = 'Get your API key from OpenAI dashboard';
    apiKeyHelp.style.fontSize = '12px';
    apiKeyHelp.style.color = '#666';
    apiKeyHelp.style.marginTop = '6px';
    apiKeyContainer.appendChild(apiKeyHelp);
    storySection.appendChild(apiKeyContainer);

    // Custom prompt template
    const promptContainer = document.createElement('div');
    promptContainer.style.marginBottom = '12px';
    promptContainer.appendChild(createLabel('Custom Prompt Template:'));

    const promptTextarea = document.createElement('textarea');
    promptTextarea.value = getPrompt();
    promptTextarea.placeholder = 'Use {{VOCAB}} for word list and {{COUNT}} for word count';
    promptTextarea.style.width = '100%';
    promptTextarea.style.padding = '10px 12px';
    promptTextarea.style.fontSize = '13px';
    promptTextarea.style.borderRadius = '6px';
    promptTextarea.style.border = '1px solid #ddd';
    promptTextarea.style.minHeight = '150px';
    promptTextarea.style.resize = 'vertical';
    promptTextarea.style.boxSizing = 'border-box';
    promptTextarea.style.fontFamily = 'monospace';
    promptTextarea.style.lineHeight = '1.5';
    promptTextarea.style.transition = 'border-color 0.2s ease';
    promptTextarea.addEventListener('focus', () => {
        promptTextarea.style.borderColor = '#0074e9';
    });
    promptTextarea.addEventListener('blur', () => {
        promptTextarea.style.borderColor = '#ddd';
    });
    promptContainer.appendChild(promptTextarea);

    // Reset prompt button
    const resetPromptBtn = document.createElement('button');
    resetPromptBtn.id = 'wk-story-settings-reset-prompt-btn';
    resetPromptBtn.innerHTML = '<i class="fas fa-undo"></i> Reset to default prompt';
    resetPromptBtn.style.padding = '8px 14px';
    resetPromptBtn.style.fontSize = '13px';
    resetPromptBtn.style.borderRadius = '6px';
    resetPromptBtn.style.border = 'none';
    resetPromptBtn.style.cursor = 'pointer';
    resetPromptBtn.style.background = '#888';
    resetPromptBtn.style.color = 'white';
    resetPromptBtn.style.display = 'flex';
    resetPromptBtn.style.alignItems = 'center';
    resetPromptBtn.style.gap = '6px';
    resetPromptBtn.style.marginTop = '8px';
    resetPromptBtn.style.transition = 'background 0.2s ease';
    resetPromptBtn.addEventListener('mouseenter', () => {
        resetPromptBtn.style.background = '#666';
    });
    resetPromptBtn.addEventListener('mouseleave', () => {
        resetPromptBtn.style.background = '#888';
    });
    resetPromptBtn.addEventListener('click', () => {
        promptTextarea.value = DEFAULT_PROMPT;
    });
    promptContainer.appendChild(resetPromptBtn);
    storySection.appendChild(promptContainer);

    // ===== VOCABULARY QUEUE SECTION =====
    const queueSection = document.createElement('div');
    queueSection.id = 'wk-story-settings-queue-section';
    queueSection.appendChild(createSectionHeading('Vocabulary Queue'));

    // Queue capacity input
    const capacityContainer = document.createElement('div');
    capacityContainer.style.marginBottom = '20px';
    capacityContainer.appendChild(createLabel('Queue Capacity:'));

    const capacityInput = document.createElement('input');
    capacityInput.type = 'number';
    capacityInput.min = '20';
    capacityInput.max = '500';
    capacityInput.step = '10';
    capacityInput.value = getQueueCapacity();
    capacityInput.style.width = '100%';
    capacityInput.style.padding = '10px 12px';
    capacityInput.style.fontSize = '14px';
    capacityInput.style.borderRadius = '6px';
    capacityInput.style.border = '1px solid #ddd';
    capacityInput.style.boxSizing = 'border-box';
    capacityInput.style.transition = 'border-color 0.2s';
    capacityInput.addEventListener('focus', () => {
        capacityInput.style.borderColor = '#0074e9';
    });
    capacityInput.addEventListener('blur', () => {
        capacityInput.style.borderColor = '#ddd';
    });
    capacityContainer.appendChild(capacityInput);

    const capacityHelp = document.createElement('div');
    capacityHelp.textContent = 'Maximum vocabulary words to keep in queue (20-500)';
    capacityHelp.style.fontSize = '12px';
    capacityHelp.style.color = '#666';
    capacityHelp.style.marginTop = '6px';
    capacityContainer.appendChild(capacityHelp);
    queueSection.appendChild(capacityContainer);

    // Words per story input
    const wordsContainer = document.createElement('div');
    wordsContainer.style.marginBottom = '20px';
    wordsContainer.appendChild(createLabel('Words Per Story:'));

    const wordsInput = document.createElement('input');
    wordsInput.type = 'number';
    wordsInput.min = '5';
    wordsInput.max = '100';
    wordsInput.step = '5';
    wordsInput.value = getWordsPerStory();
    wordsInput.style.width = '100%';
    wordsInput.style.padding = '10px 12px';
    wordsInput.style.fontSize = '14px';
    wordsInput.style.borderRadius = '6px';
    wordsInput.style.border = '1px solid #ddd';
    wordsInput.style.boxSizing = 'border-box';
    wordsInput.style.transition = 'border-color 0.2s';
    wordsInput.addEventListener('focus', () => {
        wordsInput.style.borderColor = '#0074e9';
    });
    wordsInput.addEventListener('blur', () => {
        wordsInput.style.borderColor = '#ddd';
    });
    wordsContainer.appendChild(wordsInput);

    const wordsHelp = document.createElement('div');
    wordsHelp.textContent = 'Number of words to use when generating stories (5-100)';
    wordsHelp.style.fontSize = '12px';
    wordsHelp.style.color = '#666';
    wordsHelp.style.marginTop = '6px';
    wordsContainer.appendChild(wordsHelp);
    queueSection.appendChild(wordsContainer);

    // Sampling mode radio buttons
    const samplingContainer = document.createElement('div');
    samplingContainer.style.marginBottom = '20px';
    samplingContainer.appendChild(createLabel('Sampling Mode:'));

    const samplingGroup = document.createElement('div');
    samplingGroup.style.display = 'flex';
    samplingGroup.style.flexDirection = 'column';
    samplingGroup.style.gap = '12px';

    const currentMode = getSamplingMode();

    // Recent words option
    const recentOption = document.createElement('label');
    recentOption.style.display = 'flex';
    recentOption.style.alignItems = 'center';
    recentOption.style.gap = '8px';
    recentOption.style.cursor = 'pointer';
    recentOption.style.fontSize = '14px';

    const recentRadio = document.createElement('input');
    recentRadio.type = 'radio';
    recentRadio.name = 'samplingMode';
    recentRadio.value = 'recent';
    recentRadio.checked = currentMode === 'recent';
    recentRadio.style.cursor = 'pointer';

    const recentLabel = document.createElement('span');
    recentLabel.textContent = 'Recent Words — Use newest vocabulary';

    recentOption.appendChild(recentRadio);
    recentOption.appendChild(recentLabel);

    // Random mix option
    const randomOption = document.createElement('label');
    randomOption.style.display = 'flex';
    randomOption.style.alignItems = 'center';
    randomOption.style.gap = '8px';
    randomOption.style.cursor = 'pointer';
    randomOption.style.fontSize = '14px';

    const randomRadio = document.createElement('input');
    randomRadio.type = 'radio';
    randomRadio.name = 'samplingMode';
    randomRadio.value = 'random';
    randomRadio.checked = currentMode === 'random';
    randomRadio.style.cursor = 'pointer';

    const randomLabel = document.createElement('span');
    randomLabel.textContent = 'Random Mix — Review older + new words';

    randomOption.appendChild(randomRadio);
    randomOption.appendChild(randomLabel);

    samplingGroup.appendChild(recentOption);
    samplingGroup.appendChild(randomOption);
    samplingContainer.appendChild(samplingGroup);

    const samplingHelp = document.createElement('div');
    samplingHelp.textContent = 'Recent mode uses newest words. Random mode mixes old and new for review.';
    samplingHelp.style.fontSize = '12px';
    samplingHelp.style.color = '#666';
    samplingHelp.style.marginTop = '8px';
    samplingContainer.appendChild(samplingHelp);
    queueSection.appendChild(samplingContainer);

    // ===== AUDIO SETTINGS SECTION =====
    const audioSection = document.createElement('div');
    audioSection.id = 'wk-story-settings-audio-section';
    audioSection.appendChild(createSectionHeading('Audio Settings'));

    // Voice selection dropdown
    const voiceContainer = document.createElement('div');
    voiceContainer.style.marginBottom = '20px';
    voiceContainer.appendChild(createLabel('Voice:'));

    const voiceSelect = document.createElement('select');
    voiceSelect.style.width = '100%';
    voiceSelect.style.padding = '10px 12px';
    voiceSelect.style.fontSize = '14px';
    voiceSelect.style.borderRadius = '6px';
    voiceSelect.style.border = '1px solid #ddd';
    voiceSelect.style.boxSizing = 'border-box';
    voiceSelect.style.transition = 'border-color 0.2s ease';
    voiceSelect.style.cursor = 'pointer';

    voiceSelect.addEventListener('focus', () => {
        voiceSelect.style.borderColor = '#0074e9';
    });
    voiceSelect.addEventListener('blur', () => {
        voiceSelect.style.borderColor = '#ddd';
    });

    const voices = [
        { value: 'alloy', label: 'Alloy (Neutral)' },
        { value: 'ash', label: 'Ash (Warm Male)' },
        { value: 'ballad', label: 'Ballad (Storytelling)' },
        { value: 'coral', label: 'Coral (Warm Female)' },
        { value: 'echo', label: 'Echo (Male)' },
        { value: 'fable', label: 'Fable (British Male)' },
        { value: 'onyx', label: 'Onyx (Deep Male)' },
        { value: 'nova', label: 'Nova (Female)' },
        { value: 'sage', label: 'Sage (Calm)' },
        { value: 'shimmer', label: 'Shimmer (Soft Female)' },
        { value: 'verse', label: 'Verse (Expressive)' }
    ];

    voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.value;
        option.textContent = voice.label;
        voiceSelect.appendChild(option);
    });
    voiceSelect.value = getTTSVoice();
    voiceContainer.appendChild(voiceSelect);
    audioSection.appendChild(voiceContainer);

    // TTS instructions textarea
    const instructionsContainer = document.createElement('div');
    instructionsContainer.style.marginBottom = '12px';
    instructionsContainer.appendChild(createLabel('Instructions (mood/vibe for the narration):'));

    const instructionsInput = document.createElement('textarea');
    instructionsInput.style.width = '100%';
    instructionsInput.style.padding = '10px 12px';
    instructionsInput.style.fontSize = '13px';
    instructionsInput.style.borderRadius = '6px';
    instructionsInput.style.border = '1px solid #ddd';
    instructionsInput.style.minHeight = '120px';
    instructionsInput.style.resize = 'vertical';
    instructionsInput.style.boxSizing = 'border-box';
    instructionsInput.style.fontFamily = 'monospace';
    instructionsInput.style.lineHeight = '1.5';
    instructionsInput.style.transition = 'border-color 0.2s ease';
    instructionsInput.addEventListener('focus', () => {
        instructionsInput.style.borderColor = '#0074e9';
    });
    instructionsInput.addEventListener('blur', () => {
        instructionsInput.style.borderColor = '#ddd';
    });
    instructionsInput.value = getTTSInstructions();
    instructionsContainer.appendChild(instructionsInput);
    audioSection.appendChild(instructionsContainer);

    // Reset instructions button
    const resetInstructionsBtn = document.createElement('button');
    resetInstructionsBtn.innerHTML = '<i class="fas fa-undo"></i> Reset to default instructions';
    resetInstructionsBtn.style.padding = '8px 14px';
    resetInstructionsBtn.style.fontSize = '13px';
    resetInstructionsBtn.style.borderRadius = '6px';
    resetInstructionsBtn.style.border = 'none';
    resetInstructionsBtn.style.cursor = 'pointer';
    resetInstructionsBtn.style.background = '#888';
    resetInstructionsBtn.style.color = 'white';
    resetInstructionsBtn.style.display = 'flex';
    resetInstructionsBtn.style.alignItems = 'center';
    resetInstructionsBtn.style.gap = '6px';
    resetInstructionsBtn.style.marginBottom = '20px';
    resetInstructionsBtn.style.transition = 'background 0.2s ease';
    resetInstructionsBtn.addEventListener('mouseenter', () => {
        resetInstructionsBtn.style.background = '#666';
    });
    resetInstructionsBtn.addEventListener('mouseleave', () => {
        resetInstructionsBtn.style.background = '#888';
    });
    resetInstructionsBtn.addEventListener('click', () => {
        instructionsInput.value = DEFAULT_TTS_INSTRUCTIONS;
    });
    audioSection.appendChild(resetInstructionsBtn);

    // Playback speed slider
    const speedContainer = document.createElement('div');
    speedContainer.style.display = 'flex';
    speedContainer.style.alignItems = 'center';
    speedContainer.style.gap = '14px';
    speedContainer.style.marginBottom = '8px';

    const speedLabel = createLabel('Playback Speed:');
    speedLabel.style.marginBottom = '0';
    speedLabel.style.flex = '0 0 auto';

    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '0.5';
    speedSlider.max = '2.0';
    speedSlider.step = '0.1';
    speedSlider.value = getTTSSpeed();
    speedSlider.style.flex = '1';

    const speedValue = document.createElement('span');
    speedValue.textContent = `${getTTSSpeed()}x`;
    speedValue.style.fontSize = '14px';
    speedValue.style.fontWeight = 'bold';
    speedValue.style.minWidth = '45px';
    speedValue.style.textAlign = 'right';

    speedSlider.addEventListener('input', (e) => {
        speedValue.textContent = `${parseFloat(e.target.value).toFixed(1)}x`;
    });

    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(speedSlider);
    speedContainer.appendChild(speedValue);
    audioSection.appendChild(speedContainer);

    // Add all sections to scroll area
    scrollArea.appendChild(storySection);
    scrollArea.appendChild(queueSection);
    scrollArea.appendChild(audioSection);

    // ===== BUTTON BAR =====
    const buttonBar = document.createElement('div');
    buttonBar.style.display = 'flex';
    buttonBar.style.justifyContent = 'flex-end';
    buttonBar.style.gap = '12px';
    buttonBar.style.paddingTop = '20px';
    buttonBar.style.marginTop = '8px';
    buttonBar.style.borderTop = '1px solid #ddd';

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
    cancelBtn.style.padding = '10px 20px';
    cancelBtn.style.borderRadius = '6px';
    cancelBtn.style.border = 'none';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.background = '#ccc';
    cancelBtn.style.color = '#222';
    cancelBtn.style.fontSize = '14px';
    cancelBtn.style.display = 'flex';
    cancelBtn.style.alignItems = 'center';
    cancelBtn.style.gap = '6px';
    cancelBtn.style.transition = 'background 0.2s ease';
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#bbb';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = '#ccc';
    });
    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        overlay.remove();
    });

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
    saveBtn.style.padding = '10px 20px';
    saveBtn.style.borderRadius = '6px';
    saveBtn.style.border = 'none';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.background = '#0074e9';
    saveBtn.style.color = 'white';
    saveBtn.style.fontSize = '14px';
    saveBtn.style.display = 'flex';
    saveBtn.style.alignItems = 'center';
    saveBtn.style.gap = '6px';
    saveBtn.style.transition = 'background 0.2s ease';
    saveBtn.addEventListener('mouseenter', () => {
        saveBtn.style.background = '#0063c4';
    });
    saveBtn.addEventListener('mouseleave', () => {
        saveBtn.style.background = '#0074e9';
    });
    saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();

        // Save story generation settings
        const key = apiKeyInput.value.trim();
        const prompt = promptTextarea.value.trim();
        setApiKey(key);
        setPrompt(prompt);

        // Save queue configuration settings
        const capacity = parseInt(capacityInput.value, 10);
        const wordsPerStory = parseInt(wordsInput.value, 10);
        const samplingMode = document.querySelector('input[name="samplingMode"]:checked')?.value || 'recent';
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

        alert('Settings saved successfully!');
        overlay.remove();
    });

    buttonBar.appendChild(cancelBtn);
    buttonBar.appendChild(saveBtn);

    // Assemble and display
    card.appendChild(title);
    card.appendChild(scrollArea);
    card.appendChild(buttonBar);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
}