# WaniKani Review Story Generator

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-username/wkstory)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A Tampermonkey userscript that enhances the WaniKani vocabulary review experience by collecting reviewed vocabulary and generating personalized Japanese stories with AI-powered audio narration.

## ✨ Features

- **📝 Automatic Vocabulary Collection**: Captures vocabulary during reviews in a persistent FIFO queue
- **🤖 AI Story Generation**: Creates engaging Japanese stories using your learned vocabulary via OpenAI's API
- **🎙️ Audio Narration**: Generates natural Japanese TTS with customizable voice, speed, and mood
- **🎨 Interactive UI**: Beautiful overlays with collapsible sections and audio controls
- **⚙️ Configurable Settings**: Customize queue capacity, story length, sampling modes, and audio preferences
- **📊 Smart Selection**: Choose between recent words or random mix for vocabulary review

## 📦 Installation

### For Users

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Download the latest release: [wkstory.user.js](dist/wkstory.user.js)
3. Click the file to install in Tampermonkey
4. Get an [OpenAI API key](https://platform.openai.com/api-keys)
5. Open WaniKani and configure your API key in the script settings

### For Developers

See the [Development](#-development) section below.

## 🚀 Usage

1. **Complete Reviews**: Do vocabulary reviews on WaniKani as usual
2. **Generate Story**: Click the "Generate Story" button on your dashboard
3. **Enjoy**: Read the Japanese story, listen to the narration, and review the vocabulary

### Settings

Access settings via:
- Dashboard "Story settings" link
- Tampermonkey menu → "WaniKani Story: Settings"

**Story Generation:**
- OpenAI API key (required)
- Custom prompt template (optional)

**Vocabulary Queue:**
- Queue capacity: 20-500 words (default: 100)
- Words per story: 5-100 words (default: 20)
- Sampling mode: Recent or Random mix

**Audio Settings:**
- Voice selection: 11 voices (alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse)
- TTS instructions: Customize narration mood/vibe
- Playback speed: 0.5x - 2.0x

## 🏗️ Development

### Architecture

The project uses a modular architecture with ES6 modules bundled via Rollup:

```
src/
├── core.js          # Constants, utilities, Font Awesome loader
├── storage.js       # GM_getValue/GM_setValue wrappers
├── queue.js         # FIFO queue management & vocabulary selection
├── navigation.js    # SPA URL change detection & routing
├── review.js        # Vocabulary collection during reviews
├── dashboard.js     # Dashboard UI (button, indicators)
├── api.js           # OpenAI story generation (Responses API)
├── audio.js         # OpenAI TTS generation (Audio API)
├── ui-story.js      # Story overlay with audio controls
├── ui-settings.js   # Settings overlay UI
└── main.js          # Entry point & initialization
```

**Key Patterns:**
- **Circular Dependency Resolution**: Registration functions (`registerPageInitializers`, `registerDashboardCallbacks`, `registerApiCallbacks`) resolve circular dependencies
- **Inline Styles**: All UI uses inline styles for userscript isolation
- **FIFO Queue**: Persistent vocabulary storage in `localStorage` with capacity enforcement
- **Structured JSON**: OpenAI Responses API with strict schema validation via `json_schema` format

### Building from Source

```bash
# Install dependencies
npm install

# Development build (with inline source maps)
npm run build:dev

# Production build (minified)
npm run build:prod

# Shorthand for production
npm run build

# Lint code for issues
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

**Output**: `dist/wkstory.user.js` (ready to install in Tampermonkey)

### Module Details

#### Core Modules
- **core.js**: Storage key constants, JSON schema, default prompts, logging utility
- **storage.js**: Getter/setter functions for GM storage with validation and defaults
- **queue.js**: FIFO queue operations, date utilities, vocabulary selection algorithms

#### Page-Specific Modules
- **navigation.js**: MutationObserver for SPA routing, handles `/subjects/review` and `/dashboard`
- **review.js**: Event listeners for `didAnswerQuestion` and `didCompleteSession`, duplicate detection
- **dashboard.js**: Button creation, capacity indicators, date range display

#### API Modules
- **api.js**: OpenAI Responses API integration with schema enforcement, error handling
- **audio.js**: OpenAI Audio API (TTS) with configurable voice/speed/instructions

#### UI Modules
- **ui-story.js**: Story overlay with collapsible sections, audio player with seek controls
- **ui-settings.js**: Three-section settings UI (Story, Queue, Audio)

#### Entry Point
- **main.js**: Loads Font Awesome, registers callbacks, starts navigation observer, adds Tampermonkey menu command

### Development Workflow

1. Make changes to source files in `src/`
2. Build with `npm run build:dev` for debugging (includes source maps)
3. Reload script in Tampermonkey
4. Test on WaniKani site
5. Build production version with `npm run build:prod` before release

### Technical Notes

**Circular Dependencies**: There's a harmless circular dependency between `queue.js` ↔ `storage.js` (runtime only, not initialization).

**OpenAI APIs**:
- Responses API (`/v1/responses`) with `gpt-4o-mini` model for story generation
- Audio API (`/v1/audio/speech`) with `gpt-4o-mini-tts` model for narration

**WaniKani Integration**:
- Custom events: `didAnswerQuestion`, `didCompleteSession`
- DOM elements: `#quiz-queue` (JSON data), `.character-header__characters`
- SPA navigation via MutationObserver on `document.body`

**Code Quality**: ESLint configured with recommended rules for ES6+ JavaScript, enforcing single quotes, semicolons, and best practices.

## 📋 Requirements

- Modern browser with Tampermonkey support
- Active WaniKani subscription
- OpenAI API key (required for story generation)

## 🐛 Known Issues

- Queue persists after story generation (by design, vocabulary not cleared)
- TTS text limited to 4096 characters (OpenAI API constraint)
- Rollup build shows circular dependency warning (harmless, runtime-only)

## 📜 License

ISC License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [WaniKani](https://www.wanikani.com/) - Japanese learning platform
- [OpenAI](https://openai.com/) - AI story generation and TTS
- [Font Awesome](https://fontawesome.com/) - Icons
- [Rollup](https://rollupjs.org/) - Module bundler

## AI Disclosure

Almost entirely vibe-coded with Claude Sonnet 4.5. Code guided and checked by a human (me).