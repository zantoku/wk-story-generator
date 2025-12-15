// ==============================================================
// Story overlay UI with audio controls
// ==============================================================

import { log } from './core.js';
import { getApiKey } from './storage.js';
import { generateAudio } from './audio.js';

/**
 * Display the story overlay with audio controls
 * @param {Object} storyData - Story data with japanese_story, english_translation, vocabulary_list
 */
export function showStoryOverlay(storyData) {
    const overlay = document.createElement('div');
    overlay.id = 'wk-story-overlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.zIndex = '9999';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';

    const card = document.createElement('div');
    card.style.background = 'var(--color-wk-panel-background)';
    card.style.color = 'var(--color-text)';
    card.style.padding = '24px';
    card.style.borderRadius = '8px';
    card.style.width = 'min(900px, 95vw)';
    card.style.maxHeight = '90vh';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.boxShadow = '0 10px 40px rgba(0,0,0,0.4)';

    const heading = document.createElement('h2');
    heading.textContent = 'Review Story';
    heading.style.marginTop = '0';
    heading.style.marginBottom = '12px';

    const scrollArea = document.createElement('div');
    scrollArea.style.flex = '1';
    scrollArea.style.overflowY = 'auto';
    scrollArea.style.padding = '12px';
    scrollArea.style.fontSize = '16px';

    // Japanese Story Section
    const storySection = document.createElement('div');
    storySection.style.marginBottom = '20px';

    const storyHeading = document.createElement('h3');
    storyHeading.textContent = 'Story';
    storyHeading.style.marginTop = '0';
    storyHeading.style.marginBottom = '12px';
    storyHeading.style.fontSize = '18px';
    storyHeading.style.fontWeight = 'bold';

    const storyText = document.createElement('div');
    storyText.style.whiteSpace = 'pre-wrap';
    storyText.style.lineHeight = '1.8';
    storyText.style.fontSize = '16px';
    storyText.style.padding = '12px';
    storyText.style.background = 'rgba(0,0,0,0.05)';
    storyText.style.borderRadius = '4px';
    storyText.textContent = storyData.japanese_story;

    storySection.appendChild(storyHeading);
    storySection.appendChild(storyText);

    // Audio Controls Section
    const audioControlsSection = createAudioControlsSection(storyData);

    // English Translation Section (Collapsible)
    const translationSection = createTranslationSection(storyData);

    // Vocabulary List Section
    const vocabSection = createVocabularySection(storyData);

    // Add all sections to scroll area
    scrollArea.appendChild(storySection);
    scrollArea.appendChild(audioControlsSection.initialButton);
    scrollArea.appendChild(audioControlsSection.controlsContainer);
    scrollArea.appendChild(translationSection);
    scrollArea.appendChild(vocabSection);

    const buttonBar = document.createElement('div');
    buttonBar.style.display = 'flex';
    buttonBar.style.justifyContent = 'flex-end';
    buttonBar.style.marginTop = '16px';
    buttonBar.style.gap = '8px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Continue to dashboard';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.borderRadius = '6px';
    closeBtn.style.border = 'none';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.background = '#0074e9';
    closeBtn.style.color = 'white';
    closeBtn.style.fontSize = '14px';

    closeBtn.addEventListener('click', () => {
        // Cleanup: Stop audio and revoke object URL to free memory
        if (audioControlsSection.cleanup) {
            audioControlsSection.cleanup();
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

/**
 * Create the audio controls section with play/pause, progress bar, etc.
 * @param {Object} storyData - Story data
 * @returns {Object} Object with initialButton, controlsContainer, and cleanup function
 */
function createAudioControlsSection(storyData) {
    // Audio Controls Section
    const audioControlsSection = document.createElement('div');
    audioControlsSection.style.marginBottom = '20px';
    audioControlsSection.style.marginTop = '20px';
    audioControlsSection.style.padding = '16px';
    audioControlsSection.style.background = 'rgba(0,0,0,0.03)';
    audioControlsSection.style.borderRadius = '6px';
    audioControlsSection.style.border = '1px solid rgba(0,0,0,0.1)';
    audioControlsSection.style.display = 'none'; // Hidden until audio is generated

    // Audio state
    let audioUrl = null;
    let audioBlob = null;
    let audioElement = null;

    // Helper function to format time (seconds to MM:SS)
    const formatTime = (seconds) => {
        if (!isFinite(seconds)) {return '0:00';}
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Helper function to create control button
    const createControlButton = (text, isPrimary = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.padding = '10px 16px';
        btn.style.borderRadius = '6px';
        btn.style.border = isPrimary ? 'none' : '1px solid #ddd';
        btn.style.cursor = 'pointer';
        btn.style.background = isPrimary ? '#0074e9' : 'var(--color-wk-panel-background)';
        btn.style.color = isPrimary ? 'white' : 'var(--color-text)';
        btn.style.fontSize = '14px';
        btn.style.fontWeight = '500';
        btn.style.transition = 'background 0.2s';
        btn.style.flexShrink = '0';
        btn.style.minWidth = '44px';

        if (isPrimary) {
            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {btn.style.background = '#0056b3';}
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.disabled) {btn.style.background = '#0074e9';}
            });
        } else {
            btn.addEventListener('mouseenter', () => {
                if (!btn.disabled) {btn.style.background = 'rgba(0,0,0,0.05)';}
            });
            btn.addEventListener('mouseleave', () => {
                if (!btn.disabled) {btn.style.background = 'var(--color-wk-panel-background)';}
            });
        }

        return btn;
    };

    // Buttons row container
    const buttonsRow = document.createElement('div');
    buttonsRow.style.display = 'flex';
    buttonsRow.style.gap = '8px';
    buttonsRow.style.alignItems = 'center';
    buttonsRow.style.justifyContent = 'center';
    buttonsRow.style.marginBottom = '12px';

    // Create control buttons with Font Awesome icons
    const rewindButton = createControlButton('');
    rewindButton.innerHTML = '<i class="fas fa-backward-step"></i>';
    rewindButton.title = 'Restart from beginning';
    
    const skipBackButton = createControlButton('');
    skipBackButton.innerHTML = '<i class="fas fa-rotate-left"></i> 10s';
    skipBackButton.title = 'Skip backward 10 seconds';
    
    const playPauseButton = createControlButton('', true);
    playPauseButton.innerHTML = '<i class="fas fa-play"></i> Play';
    playPauseButton.style.minWidth = '100px';
    
    const skipForwardButton = createControlButton('');
    skipForwardButton.innerHTML = '<i class="fas fa-rotate-right"></i> 10s';
    skipForwardButton.title = 'Skip forward 10 seconds';
    
    const downloadButton = createControlButton('');
    downloadButton.innerHTML = '<i class="fas fa-download"></i>';
    downloadButton.title = 'Download audio file';

    // Add buttons to row
    buttonsRow.appendChild(rewindButton);
    buttonsRow.appendChild(skipBackButton);
    buttonsRow.appendChild(playPauseButton);
    buttonsRow.appendChild(skipForwardButton);
    buttonsRow.appendChild(downloadButton);

    // Progress bar container
    const { progressContainer, currentTimeSpan, durationSpan, progressFilled, progressHandle, progressTrack } = createProgressBar();

    // Add all components to audio controls section
    audioControlsSection.appendChild(buttonsRow);
    audioControlsSection.appendChild(progressContainer);

    // Initial play button to trigger audio generation
    const initialPlayButton = document.createElement('button');
    initialPlayButton.innerHTML = '<i class="fas fa-play"></i> Generate & Play Story Audio';
    initialPlayButton.style.padding = '12px 24px';
    initialPlayButton.style.borderRadius = '6px';
    initialPlayButton.style.border = 'none';
    initialPlayButton.style.cursor = 'pointer';
    initialPlayButton.style.background = '#0074e9';
    initialPlayButton.style.color = 'white';
    initialPlayButton.style.fontSize = '14px';
    initialPlayButton.style.fontWeight = '500';
    initialPlayButton.style.transition = 'background 0.2s';
    initialPlayButton.style.margin = '20px 0';
    initialPlayButton.style.display = 'flex';
    initialPlayButton.style.alignItems = 'center';
    initialPlayButton.style.gap = '8px';
    initialPlayButton.style.justifyContent = 'center';

    initialPlayButton.addEventListener('mouseenter', () => {
        if (!initialPlayButton.disabled) {initialPlayButton.style.background = '#0056b3';}
    });
    initialPlayButton.addEventListener('mouseleave', () => {
        if (!initialPlayButton.disabled) {initialPlayButton.style.background = '#0074e9';}
    });

    // Setup audio event handlers
    setupAudioEventHandlers({
        audioControlsSection,
        initialPlayButton,
        playPauseButton,
        rewindButton,
        skipBackButton,
        skipForwardButton,
        downloadButton,
        progressTrack,
        progressFilled,
        progressHandle,
        currentTimeSpan,
        durationSpan,
        formatTime,
        storyData,
        getAudioState: () => ({ audioUrl, audioBlob, audioElement }),
        setAudioState: (state) => {
            if (state.audioUrl !== undefined) {audioUrl = state.audioUrl;}
            if (state.audioBlob !== undefined) {audioBlob = state.audioBlob;}
            if (state.audioElement !== undefined) {audioElement = state.audioElement;}
        }
    });

    // Cleanup function
    const cleanup = () => {
        if (audioElement) {
            audioElement.pause();
            audioElement = null;
        }
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            audioUrl = null;
        }
    };

    return {
        initialButton: initialPlayButton,
        controlsContainer: audioControlsSection,
        cleanup
    };
}

/**
 * Create progress bar with seek functionality
 * @returns {Object} Progress bar elements
 */
function createProgressBar() {
    const progressContainer = document.createElement('div');
    progressContainer.style.display = 'flex';
    progressContainer.style.flexDirection = 'column';
    progressContainer.style.gap = '8px';

    // Time display
    const timeDisplay = document.createElement('div');
    timeDisplay.style.display = 'flex';
    timeDisplay.style.justifyContent = 'space-between';
    timeDisplay.style.fontSize = '12px';
    timeDisplay.style.color = '#666';
    timeDisplay.style.fontFamily = 'monospace';

    const currentTimeSpan = document.createElement('span');
    currentTimeSpan.textContent = '0:00';
    
    const durationSpan = document.createElement('span');
    durationSpan.textContent = '0:00';

    timeDisplay.appendChild(currentTimeSpan);
    timeDisplay.appendChild(durationSpan);

    // Progress bar track
    const progressTrack = document.createElement('div');
    progressTrack.style.position = 'relative';
    progressTrack.style.width = '100%';
    progressTrack.style.height = '8px';
    progressTrack.style.background = 'rgba(0,0,0,0.1)';
    progressTrack.style.borderRadius = '4px';
    progressTrack.style.cursor = 'pointer';
    progressTrack.style.overflow = 'hidden';

    // Progress bar filled portion
    const progressFilled = document.createElement('div');
    progressFilled.style.position = 'absolute';
    progressFilled.style.left = '0';
    progressFilled.style.top = '0';
    progressFilled.style.height = '100%';
    progressFilled.style.width = '0%';
    progressFilled.style.background = '#0074e9';
    progressFilled.style.borderRadius = '4px';
    progressFilled.style.transition = 'width 0.1s linear';

    // Progress bar handle
    const progressHandle = document.createElement('div');
    progressHandle.style.position = 'absolute';
    progressHandle.style.left = '0';
    progressHandle.style.top = '50%';
    progressHandle.style.transform = 'translate(-50%, -50%)';
    progressHandle.style.width = '16px';
    progressHandle.style.height = '16px';
    progressHandle.style.background = '#0074e9';
    progressHandle.style.borderRadius = '50%';
    progressHandle.style.border = '2px solid white';
    progressHandle.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
    progressHandle.style.cursor = 'pointer';
    progressHandle.style.opacity = '0';
    progressHandle.style.transition = 'opacity 0.2s';

    progressTrack.addEventListener('mouseenter', () => {
        progressHandle.style.opacity = '1';
    });
    progressTrack.addEventListener('mouseleave', () => {
        progressHandle.style.opacity = '0';
    });

    progressTrack.appendChild(progressFilled);
    progressTrack.appendChild(progressHandle);

    progressContainer.appendChild(progressTrack);
    progressContainer.appendChild(timeDisplay);

    return {
        progressContainer,
        currentTimeSpan,
        durationSpan,
        progressFilled,
        progressHandle,
        progressTrack
    };
}

/**
 * Setup all audio event handlers
 * @param {Object} params - Parameters object with all necessary elements and functions
 */
function setupAudioEventHandlers(params) {
    const {
        audioControlsSection,
        initialPlayButton,
        playPauseButton,
        rewindButton,
        skipBackButton,
        skipForwardButton,
        downloadButton,
        progressTrack,
        progressFilled,
        progressHandle,
        currentTimeSpan,
        durationSpan,
        formatTime,
        storyData,
        getAudioState,
        setAudioState
    } = params;

    // Play/Pause button click handler
    playPauseButton.addEventListener('click', () => {
        const { audioElement } = getAudioState();
        if (!audioElement) {return;}
        
        if (audioElement.paused) {
            audioElement.play();
        } else {
            audioElement.pause();
        }
    });

    // Initial play button click handler with loading state
    initialPlayButton.addEventListener('click', async () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            alert('No OpenAI API key configured. Please set your API key in the settings.');
            return;
        }

        // Show loading state
        const originalHTML = initialPlayButton.innerHTML;
        initialPlayButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating audio...';
        initialPlayButton.disabled = true;
        initialPlayButton.style.background = '#999';
        initialPlayButton.style.cursor = 'not-allowed';

        try {
            // Generate audio
            const audioBlob = await generateAudio(storyData.japanese_story, apiKey);
            const audioUrl = URL.createObjectURL(audioBlob);

            // Create audio element
            const audioElement = new Audio(audioUrl);
            
            // Store state
            setAudioState({ audioUrl, audioBlob, audioElement });
            
            // Handle playback events
            audioElement.addEventListener('ended', () => {
                playPauseButton.innerHTML = '<i class="fas fa-play"></i> Play';
            });

            audioElement.addEventListener('pause', () => {
                if (!audioElement.ended) {
                    playPauseButton.innerHTML = '<i class="fas fa-play"></i> Play';
                }
            });

            audioElement.addEventListener('play', () => {
                playPauseButton.innerHTML = '<i class="fas fa-pause"></i> Pause';
            });

            audioElement.addEventListener('loadedmetadata', () => {
                durationSpan.textContent = formatTime(audioElement.duration);
            });

            // Update progress bar as audio plays
            audioElement.addEventListener('timeupdate', () => {
                if (!audioElement.duration) {return;}
                
                const progress = (audioElement.currentTime / audioElement.duration) * 100;
                progressFilled.style.width = `${progress}%`;
                progressHandle.style.left = `${progress}%`;
                currentTimeSpan.textContent = formatTime(audioElement.currentTime);
            });

            // Auto-play the audio
            await audioElement.play();

            // Hide initial button and show full controls
            initialPlayButton.style.display = 'none';
            audioControlsSection.style.display = 'block';

            log('Audio playback started successfully');
        } catch (error) {
            log('Audio generation/playback error:', error);
            alert('Failed to generate audio. Please check your API key and try again.');
            
            // Reset button state on error
            initialPlayButton.innerHTML = originalHTML;
            initialPlayButton.disabled = false;
            initialPlayButton.style.background = '#0074e9';
            initialPlayButton.style.cursor = 'pointer';
        }
    });

    // Download button click handler
    downloadButton.addEventListener('click', () => {
        const { audioBlob, audioUrl } = getAudioState();
        if (!audioBlob || !audioUrl) {
            log('No audio to download');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `wanikani-story-${timestamp}.mp3`;
        
        const a = document.createElement('a');
        a.href = audioUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        log('Audio download initiated:', filename);
    });

    // Rewind button - restart from beginning
    rewindButton.addEventListener('click', () => {
        const { audioElement } = getAudioState();
        if (!audioElement) {return;}
        audioElement.currentTime = 0;
        log('Audio rewound to beginning');
    });

    // Skip backward button - jump 10 seconds back
    skipBackButton.addEventListener('click', () => {
        const { audioElement } = getAudioState();
        if (!audioElement) {return;}
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
        log('Skipped backward 10 seconds');
    });

    // Skip forward button - jump 10 seconds ahead
    skipForwardButton.addEventListener('click', () => {
        const { audioElement } = getAudioState();
        if (!audioElement) {return;}
        audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 10);
        log('Skipped forward 10 seconds');
    });

    // Progress bar seek functionality
    setupProgressBarSeek(progressTrack, progressHandle, formatTime, getAudioState);
}

/**
 * Setup progress bar click and drag seek functionality
 * @param {HTMLElement} progressTrack - Progress bar track element
 * @param {HTMLElement} progressHandle - Progress bar handle element
 * @param {Function} formatTime - Time formatting function
 * @param {Function} getAudioState - Function to get audio state
 */
function setupProgressBarSeek(progressTrack, progressHandle, formatTime, getAudioState) {
    // Progress bar seek functionality - click to jump to position
    progressTrack.addEventListener('click', (e) => {
        const { audioElement } = getAudioState();
        if (!audioElement || !audioElement.duration) {return;}
        
        const rect = progressTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * audioElement.duration;
        
        audioElement.currentTime = Math.max(0, Math.min(audioElement.duration, newTime));
        log(`Seeked to ${formatTime(newTime)}`);
    });

    // Progress bar drag functionality
    let isDragging = false;

    progressHandle.addEventListener('mousedown', (e) => {
        const { audioElement } = getAudioState();
        if (!audioElement || !audioElement.duration) {return;}
        isDragging = true;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        const { audioElement } = getAudioState();
        if (!isDragging || !audioElement || !audioElement.duration) {return;}
        
        const rect = progressTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const newTime = percentage * audioElement.duration;
        
        audioElement.currentTime = newTime;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            log('Drag seek completed');
        }
    });
}

/**
 * Create the collapsible English translation section
 * @param {Object} storyData - Story data
 * @returns {HTMLElement} Translation section element
 */
function createTranslationSection(storyData) {
    const translationSection = document.createElement('div');
    translationSection.style.marginBottom = '20px';

    const translationToggle = document.createElement('button');
    translationToggle.textContent = 'Show English Translation';
    translationToggle.style.padding = '8px 16px';
    translationToggle.style.borderRadius = '6px';
    translationToggle.style.border = '1px solid #ddd';
    translationToggle.style.cursor = 'pointer';
    translationToggle.style.background = 'var(--color-wk-panel-background)';
    translationToggle.style.color = 'var(--color-text)';
    translationToggle.style.fontSize = '14px';
    translationToggle.style.marginBottom = '8px';
    translationToggle.style.width = '100%';
    translationToggle.style.textAlign = 'left';
    translationToggle.style.fontWeight = '500';

    const translationContent = document.createElement('div');
    translationContent.style.display = 'none';
    translationContent.style.whiteSpace = 'pre-wrap';
    translationContent.style.lineHeight = '1.6';
    translationContent.style.fontSize = '14px';
    translationContent.style.padding = '12px';
    translationContent.style.background = 'rgba(0,0,0,0.05)';
    translationContent.style.borderRadius = '4px';
    translationContent.style.marginTop = '8px';
    translationContent.textContent = storyData.english_translation;

    translationToggle.addEventListener('click', () => {
        if (translationContent.style.display === 'none') {
            translationContent.style.display = 'block';
            translationToggle.textContent = 'Hide English Translation';
        } else {
            translationContent.style.display = 'none';
            translationToggle.textContent = 'Show English Translation';
        }
    });

    translationSection.appendChild(translationToggle);
    translationSection.appendChild(translationContent);

    return translationSection;
}

/**
 * Create the vocabulary list section with table
 * @param {Object} storyData - Story data
 * @returns {HTMLElement} Vocabulary section element
 */
function createVocabularySection(storyData) {
    const vocabSection = document.createElement('div');
    vocabSection.style.marginBottom = '20px';

    const vocabHeading = document.createElement('h3');
    vocabHeading.textContent = 'Vocabulary Used';
    vocabHeading.style.marginTop = '0';
    vocabHeading.style.marginBottom = '12px';
    vocabHeading.style.fontSize = '18px';
    vocabHeading.style.fontWeight = 'bold';

    const vocabTable = document.createElement('table');
    vocabTable.style.width = '100%';
    vocabTable.style.borderCollapse = 'collapse';
    vocabTable.style.fontSize = '14px';

    // Table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.background = 'rgba(0,0,0,0.1)';

    const headers = ['Word', 'Reading', 'Meaning'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        th.style.padding = '8px';
        th.style.textAlign = 'left';
        th.style.borderBottom = '2px solid #ddd';
        th.style.fontWeight = 'bold';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    vocabTable.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    storyData.vocabulary_list.forEach((vocab, index) => {
        const row = document.createElement('tr');
        if (index % 2 === 0) {
            row.style.background = 'rgba(0,0,0,0.03)';
        }
        row.style.transition = 'background 0.2s';

        // Add hover effect
        row.addEventListener('mouseenter', () => {
            row.style.background = 'rgba(0,116,233,0.1)';
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = index % 2 === 0 ? 'rgba(0,0,0,0.03)' : 'transparent';
        });

        const wordCell = document.createElement('td');
        wordCell.textContent = vocab.word;
        wordCell.style.padding = '8px';
        wordCell.style.borderBottom = '1px solid #eee';
        wordCell.style.fontWeight = '500';

        const readingCell = document.createElement('td');
        readingCell.textContent = vocab.reading;
        readingCell.style.padding = '8px';
        readingCell.style.borderBottom = '1px solid #eee';
        readingCell.style.color = '#666';

        const meaningCell = document.createElement('td');
        meaningCell.textContent = vocab.meaning;
        meaningCell.style.padding = '8px';
        meaningCell.style.borderBottom = '1px solid #eee';

        row.appendChild(wordCell);
        row.appendChild(readingCell);
        row.appendChild(meaningCell);
        tbody.appendChild(row);
    });
    vocabTable.appendChild(tbody);

    vocabSection.appendChild(vocabHeading);
    vocabSection.appendChild(vocabTable);

    return vocabSection;
}

