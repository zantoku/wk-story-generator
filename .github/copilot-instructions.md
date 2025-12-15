# WaniKani Review Story Generator - AI Agent Instructions

## Project Overview

Tampermonkey userscript (v5.0) for WaniKani that collects vocabulary during reviews in a FIFO queue and generates Japanese stories with audio narration using OpenAI APIs.

## Modular Architecture

Built with Rollup from 11 ES6 modules in `src/`:

- **core.js**: Constants (storage keys, STORY_SCHEMA, DEFAULT_PROMPT, DEFAULT_TTS_INSTRUCTIONS), utilities (log, loadFontAwesome)
- **storage.js**: GM storage wrappers for API key, prompts, TTS config, queue settings
- **queue.js**: FIFO queue operations, vocabulary selection (recent/random modes)
- **navigation.js**: MutationObserver for SPA routing, handlePageChange()
- **review.js**: Vocabulary collection from `didAnswerQuestion` events
- **dashboard.js**: UI button with capacity/date indicators
- **api.js**: generateStory() using OpenAI Responses API
- **audio.js**: generateAudio() using OpenAI TTS API
- **ui-story.js**: Story overlay with audio player, collapsible sections
- **ui-settings.js**: Settings overlay with Story/Queue/Audio sections
- **main.js**: Entry point, registers callbacks, starts navigation observer

**Circular Dependencies**: Resolved via registration pattern (registerPageInitializers, registerDashboardCallbacks, registerApiCallbacks) called from main.js

**Build System**: Rollup with plugins: node-resolve, terser, userscript-metablock. **Critical**: metablock MUST run AFTER terser to preserve header.

## Key APIs

**OpenAI Responses API**: `gpt-4o-mini` model with json_schema format for STORY_SCHEMA validation
**OpenAI Audio API**: `gpt-4o-mini-tts` model with 11 voice options, speed 0.5x-2.0x

**WaniKani Integration**: Custom events (didAnswerQuestion, didCompleteSession), DOM (#quiz-queue JSON, .character-header__characters)

**Storage**:
- GM storage: Settings (API key, prompts, TTS config, queue params)
- localStorage: FIFO queue at `wk_story_vocab` with structure `{version, queue: [{word, date, timestamp}], stats}`

## Code Conventions

- ES6+ vanilla JavaScript, no frameworks
- camelCase functions/variables, SCREAMING_SNAKE_CASE constants
- Inline styles with WaniKani CSS variables
- Log with `[WK STORY]` prefix
- Button states: setButtonLoading() on start, resetButtonState() on complete/error
- UI: 750px overlays, 32px padding, Font Awesome 6.5.1 icons

## Development Workflow

```bash
npm install
npm run build:dev   # With source maps
npm run build:prod  # Minified
```

Output: `dist/wkstory.user.js` (dev: 798KB, prod: 40KB)
