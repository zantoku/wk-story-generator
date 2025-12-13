# WaniKani Review Story Generator - AI Agent Instructions

## Project Overview

This is a **Tampermonkey/Greasemonkey userscript** (v5.0) for WaniKani (a Japanese learning platform) that enhances the vocabulary review experience by collecting reviewed vocabulary in a persistent FIFO queue and generating personalized Japanese stories with audio narration using OpenAI's APIs.

## Architecture & Key Components

### 1. Vocabulary Collection (Review Page)
- Monitors `/subjects/review` URL
- Listens for `didAnswerQuestion` window events
- Extracts vocabulary from `#quiz-queue` element (JSON data)
- Filters for `Vocabulary` and `KanaVocabulary` types only
- Stores collected words in **FIFO queue** in `localStorage` under key `wk_story_vocab`
- Queue structure: `{ version, queue: [{word, date, timestamp}], stats: {totalCollected, oldestDate, newestDate} }`
- Enforces configurable capacity limit (20-500, default: 100) with automatic FIFO eviction
- Uses `Set` for fast duplicate checking

### 2. Story Generation
- Triggered manually via dashboard button
- Selects vocabulary using configurable sampling mode:
  - **Recent mode**: Uses N newest words from queue (sorted by timestamp)
  - **Random mode**: All today's words + random older words to fill quota
  - **Minimum guarantee**: All words from current date always included
- Configurable words per story (5-100, default: 20)
- Uses OpenAI's **Responses API** (`/v1/responses`) with `gpt-4o-mini` model
- Structured JSON output with guaranteed schema adherence via `text.format`
- Returns: `japanese_story`, `english_translation`, `vocabulary_list` (with word, reading, meaning)
- Queue persists after generation (vocabulary not cleared)

### 3. Audio Generation (TTS)
- Uses OpenAI's **TTS API** (`/v1/audio/speech`) with `gpt-4o-mini-tts` model
- Generates Japanese audio narration of the story
- Configurable voice (11 options: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse)
- Customizable instructions for narration mood/vibe (default: suspenseful storytelling)
- Adjustable playback speed (0.5x - 2.0x)
- Audio cached in memory for the session, downloadable as MP3 with timestamp

### 4. UI Components
- **Dashboard button**: Shows selection/total word counts (e.g., "20 from 85 words"), triggers story generation
  - Capacity indicator: Color-coded queue utilization (green/yellow/red)
  - Date range indicator: Shows vocabulary date span
- **Settings overlay**: Large, airy design (750px) with three sections:
  - Story Generation: API key, custom prompt template with reset button
  - Vocabulary Queue: Queue capacity, words per story, sampling mode (recent/random)
  - Audio Settings: Voice selection, TTS instructions with reset, speed slider
- **Story overlay**: Interactive display with collapsible sections:
  - Japanese story (always visible)
  - Audio controls (generate, play/pause, rewind, skip, progress bar, download)
  - English translation (collapsible)
  - Vocabulary list (collapsible, formatted table)
- All UI uses inline styles, WaniKani CSS variables, Font Awesome 6.5.1 icons, smooth transitions

### 5. State Management
- **GM Storage** (persistent): API key, custom prompt, queue capacity, words per story, sampling mode, TTS voice, TTS instructions, TTS speed
- **localStorage**: FIFO vocabulary queue with metadata (persists across sessions, not cleared after generation)
- **Memory**: Generated audio blob (session only, cleared on new generation)

## Code Style & Conventions

### General Guidelines
- Pure vanilla JavaScript (no frameworks)
- ES6+ syntax (arrow functions, const/let, template literals)
- Functional approach where possible
- Inline styles for all UI elements
- Comprehensive logging with `[WK STORY]` prefix

### Naming Conventions
- `camelCase` for functions and variables
- `SCREAMING_SNAKE_CASE` for constants
- Descriptive names (e.g., `generateStory`, `showStoryOverlay`)

### Error Handling
- Always log errors to console with context
- Show user-friendly alerts for failures
- Reset UI state on errors (especially button states)
- Handle both HTTP errors and network failures

### Button State Management
- Use `setButtonLoading(button)` when starting async operations
- Use `resetButtonState(button, vocabCount)` when operation completes
- Reset in `.then()` after response received (for HTTP errors)
- Reset in `.catch()` for network failures

### UI Design Principles
- **Spacious Layout**: Large overlays (750px+), generous padding (32px), ample gaps (24-32px)
- **Container Pattern**: Wrap form elements in divs with `marginBottom: "20px"` for breathing room
- **Focus States**: Blue border (#0074e9) on focus, transitions for smooth changes
- **Hover Effects**: Darken buttons on hover, use `transition: "background 0.2s ease"`
- **Consistent Sizing**: 10-12px padding, 6px border radius, 14px font size for inputs
- **Visual Hierarchy**: Section headings, proper spacing, collapsible content
- **Icon Usage**: Font Awesome 6.5.1 for all interactive elements

## Key Technical Patterns

### SPA Navigation Detection
- Uses `MutationObserver` to detect URL changes in Turbo-powered SPA
- `handlePageChange()` routes to appropriate initialization functions

### Event Handling
WaniKani fires custom window events:
- `didAnswerQuestion`: Fired after each review answer
- `didCompleteSession`: Fired when review session ends

### Queue Data Structure
```javascript
// #quiz-queue contains JSON array of items like:
{
  type: "Vocabulary" | "KanaVocabulary" | "Radical" | "Kanji",
  characters: "単語",
  // ... other fields
}
```

### Storage Keys
- `wk_story_vocab`: FIFO queue object with metadata (localStorage, structure: `{version, queue: [{word, date, timestamp}], stats}`)
- `wk_story_api_key`: OpenAI API key (GM storage)
- `wk_story_prompt`: Custom prompt template (GM storage)
- `wk_story_queue_capacity`: Max queue size (GM storage, default: 100, range: 20-500)
- `wk_story_words_per_story`: Words to select for stories (GM storage, default: 20, range: 5-100)
- `wk_story_sampling_mode`: Selection mode (GM storage, default: "recent", values: "recent" | "random")
- `wk_story_tts_voice`: Selected TTS voice (GM storage, default: "alloy")
- `wk_story_tts_instructions`: TTS narration instructions (GM storage, default: suspenseful)
- `wk_story_tts_speed`: Playback speed multiplier (GM storage, default: 1.0)

### Story Response Schema
Defined in `STORY_SCHEMA` constant with strict validation:
```javascript
{
  japanese_story: string,      // The complete story in Japanese
  english_translation: string, // English translation
  vocabulary_list: [           // Array of vocabulary items
    {
      word: string,            // Japanese word (kanji/kana)
      reading: string,         // Hiragana reading
      meaning: string          // English meaning
    }
  ]
}
```

### Responses API Pattern
```javascript
fetch("https://api.openai.com/v1/responses", {
  body: JSON.stringify({
    model: "gpt-4o-mini",
    input: [/* messages */],
    text: {
      format: {
        type: "json_schema",
        name: "schema_name",
        strict: true,
        schema: STORY_SCHEMA
      }
    }
  })
});

// Response structure:
// json.output[].content[] where type === "output_text"
// Parse content[].text as JSON for structured data
// Check for type === "refusal" for safety rejections
```

## Common Tasks

### Adding New UI Elements
1. Create element with `document.createElement()`
2. Apply inline styles matching WaniKani theme
3. Use CSS variables: `var(--color-wk-panel-background)`, `var(--color-text)`
4. Append to DOM at appropriate location

### Modifying Story Generation
- Update `DEFAULT_PROMPT` constant or user's custom prompt via settings
- Prompt uses placeholders: `{{VOCAB}}` (word list), `{{COUNT}}` (word count)
- Schema is defined in `STORY_SCHEMA` constant (strict validation)
- No need for JSON format instructions in prompt (schema enforces structure)
- Consider token limits and response time
- Model: `gpt-4o-mini` in Responses API call

### Adding Settings
1. Add storage key constant
2. Create getter/setter functions (like `getApiKey`)
3. Add UI controls in `openSettingsOverlay()`
4. Use `GM_setValue`/`GM_getValue` for persistence

### Modifying Audio Generation
- Update `DEFAULT_TTS_INSTRUCTIONS` constant for default narration style
- Voice options hardcoded in `openSettingsOverlay()` (11 voices from OpenAI)
- Speed range: 0.5x to 2.0x (slider in settings)
- Audio cached in `currentAudioBlob` variable (cleared on new generation)
- Download uses `URL.createObjectURL()` and dynamic `<a>` element

### Known Limitations
- Requires OpenAI API key (user must configure)
- Only collects vocabulary (not radicals or kanji)
- Depends on WaniKani's DOM structure and events

## Current Features (v5.0)

### Completed Implementation
- ✅ **FIFO Vocabulary Queue**: Persistent queue with configurable capacity (20-500 words)
- ✅ **Smart Vocabulary Selection**: Recent mode (newest words) or Random mode (mix old + new)
- ✅ **Date-Based Clustering**: Vocabulary grouped by collection date
- ✅ **Configurable Story Size**: 5-100 words per story, always includes today's vocabulary
- ✅ **Enhanced Dashboard UI**: Shows selection/total counts, capacity indicator, date range
- ✅ **Structured JSON API**: Uses OpenAI Responses API with strict schema validation
- ✅ **Interactive Story UI**: Collapsible sections for translation and vocabulary
- ✅ **Audio Generation**: Full TTS integration with OpenAI's audio API
- ✅ **Playback Controls**: Play/pause, rewind, skip forward, progress bar with seek
- ✅ **Audio Configuration**: Voice selection (11 voices), custom instructions, speed control
- ✅ **Modern UI**: Font Awesome icons, smooth transitions, focus states, hover effects

### Key Functions Reference
- `selectVocabularyForStory(queue, wordsPerStory, samplingMode)`: Selects vocabulary based on mode (recent/random)
- `getSelectionStats(queue, selectedWords)`: Returns statistics about vocabulary selection
- `generateStory()`: Loads queue, selects vocabulary, calls Responses API, validates schema
- `generateAudio(text)`: Calls TTS API, returns audio blob with configured voice/speed
- `showStoryOverlay(data)`: Displays interactive story with all sections and controls
- `openSettingsOverlay()`: Shows large configuration UI with Story, Queue, and Audio sections
- `setButtonLoading(button)`: Sets loading state with animated spinner
- `resetButtonState(button, totalWords)`: Restores normal button state with selection/total format

## Extension Ideas

If extending functionality:
- Add vocabulary filtering/exclusion options
- Support multiple AI providers
- Add story length/difficulty preferences
- Add story history/favorites
- Export stories as study materials (PDF, Anki cards)
- Support other review types (kanji, radicals)
- Add pronunciation practice mode with recording
- Implement story difficulty levels or genre selection

## Debugging Tips

- Check console for `[WK STORY]` prefixed logs
- Verify `#quiz-queue` element exists on review page
- Check localStorage for `wk_story_vocab` queue object (not array)
- Test with small vocab sets first
- Monitor network tab for OpenAI API calls
- Verify userscript manager grants match the URL
- Check queue capacity and words per story settings if selection seems wrong
