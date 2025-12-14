# WaniKani Story Generator - Refactoring Plan

**Goal:** Refactor the 2,104-line monolithic userscript into modular JavaScript files with a Rollup build system.

**Current Status:** v4.1 (single file: 64KB, ~2,100 lines)  
**Target Output:** `dist/wkstory.user.js` (bundled & minified)

---

## Phase 1: Build System Setup

### 1.1 Initialize Project Structure
- [x] Initialize npm project (`package.json`)
- [x] Install Rollup and plugins:
  - [x] `rollup`
  - [x] `@rollup/plugin-node-resolve`
  - [x] `@rollup/plugin-terser` (for minification)
  - [x] `rollup-plugin-userscript-metablock` (for Tampermonkey header)
- [x] Create directory structure:
  ```
  src/
    core.js
    storage.js
    queue.js
    api.js
    audio.js
    navigation.js
    review.js
    dashboard.js
    ui-story.js
    ui-settings.js
    main.js
  dist/
  ```

### 1.2 Configure Rollup
- [x] Create `rollup.config.js` with two builds:
  - [x] Development build (with inline source maps)
  - [x] Production build (minified)
- [x] Configure userscript metablock injection (preserve all `@grant` directives)
- [x] Set up output to `dist/wkstory.user.js`

### 1.3 Add Build Scripts
- [x] Add npm script: `build:dev` (development with source maps)
- [x] Add npm script: `build:prod` (production minified)
- [x] Add npm script: `build` (alias for `build:prod`)
- [x] Update `.gitignore` to exclude `node_modules/` and `dist/`

---

## Phase 2: Extract Core Modules

### 2.1 Create `src/core.js` (Constants & Configuration)
- [x] Extract all storage key constants (lines 15-17, 143-145, 207-209)
- [x] Extract `STORY_SCHEMA` constant (lines 58-90)
- [x] Extract `DEFAULT_PROMPT` (lines 92-140)
- [x] Extract `DEFAULT_TTS_INSTRUCTIONS` (lines 152-166)
- [x] Extract `log()` utility function (line 23)
- [x] Add `loadFontAwesome()` function (lines 26-34)
- [x] Export all constants and utilities

### 2.2 Create `src/storage.js` (Storage Management)
- [x] Extract API key getter/setter (lines 37-52)
- [x] Extract custom prompt getter/setter (lines 117-138)
- [x] Extract queue capacity getter/setter (lines 168-183)
- [x] Extract words per story getter/setter (lines 185-200)
- [x] Extract sampling mode getter/setter (lines 202-217)
- [x] Extract TTS voice getter/setter (lines 219-234)
- [x] Extract TTS instructions getter/setter (lines 236-260)
- [x] Extract TTS speed getter/setter (lines 262-283)
- [x] Export all storage functions

### 2.3 Create `src/queue.js` (FIFO Queue Logic)
- [ ] Extract date utilities (lines 298-305):
  - [ ] `getTodayDateString()`
  - [ ] `timestampToDateString()`
- [ ] Extract `loadQueue()` function (lines 310-330)
- [ ] Extract `evictOldestWords()` helper (lines 332-343)
- [ ] Extract `calculateQueueStats()` helper (lines 345-361)
- [ ] Extract `saveQueue()` function (lines 363-382)
- [ ] Extract `clearQueue()` function (lines 384-387)
- [ ] Extract `selectVocabularyForStory()` function (lines 677-738)
- [ ] Extract `getSelectionStats()` function (lines 740-774)
- [ ] Export all queue functions

---

## Phase 3: Extract Page-Specific Modules

### 3.1 Create `src/navigation.js` (SPA Routing)
- [ ] Extract `observeUrlChanges()` function (lines 392-402)
- [ ] Extract `handlePageChange()` function (lines 404-414)
- [ ] Import and call page initializers (to be defined in other modules)
- [ ] Export navigation functions

### 3.2 Create `src/review.js` (Review Page Logic)
- [ ] Extract `initReviewPage()` main function (lines 430-538)
- [ ] Extract `loadQueueFromStorage()` helper (lines 442-449)
- [ ] Extract `extractVocabFromQueue()` helper (lines 451-468)
- [ ] Extract `getQueueElement()` helper (lines 470-481)
- [ ] Import queue functions from `src/queue.js`
- [ ] Import storage functions from `src/storage.js`
- [ ] Export `initReviewPage`

### 3.3 Create `src/dashboard.js` (Dashboard UI)
- [ ] Extract `initDashboardPage()` function (lines 543-552)
- [ ] Extract `getStatsElement()` helper (lines 554-572)
- [ ] Extract `createGenerateButton()` function (lines 574-652)
- [ ] Extract button state management (lines 783-806):
  - [ ] `setButtonLoading()`
  - [ ] `resetButtonState()`
- [ ] Import queue and storage functions
- [ ] Import `generateStory()` from `src/api.js` (forward reference)
- [ ] Import `openSettingsOverlay()` from `src/ui-settings.js` (forward reference)
- [ ] Export `initDashboardPage`

---

## Phase 4: Extract API & Audio Modules

### 4.1 Create `src/api.js` (OpenAI API Calls)
- [ ] Extract `generateStory()` function (lines 811-941)
- [ ] Import queue selection functions
- [ ] Import storage functions (API key, prompt)
- [ ] Import `showStoryOverlay()` from `src/ui-story.js` (forward reference)
- [ ] Import button state management from `src/dashboard.js`
- [ ] Export `generateStory`

### 4.2 Create `src/audio.js` (TTS Generation)
- [ ] Extract `generateAudio()` function (lines 946-1017)
- [ ] Import storage functions (TTS settings)
- [ ] Import `log()` from `src/core.js`
- [ ] Export `generateAudio`

---

## Phase 5: Extract UI Modules

### 5.1 Create `src/ui-story.js` (Story Overlay)
- [ ] Extract `showStoryOverlay()` function (lines 1022-1583)
- [ ] Import `generateAudio()` from `src/audio.js`
- [ ] Import storage functions for TTS settings
- [ ] Manage audio state (`currentAudioBlob`, `currentAudioUrl`, `audioElement`)
- [ ] Export `showStoryOverlay`

### 5.2 Create `src/ui-settings.js` (Settings Overlay)
- [ ] Extract `openSettingsOverlay()` function (lines 1588-2052)
- [ ] Import all storage getter/setter functions
- [ ] Import queue functions (for capacity enforcement)
- [ ] Import `log()` from `src/core.js`
- [ ] Export `openSettingsOverlay`

---

## Phase 6: Create Entry Point & Integration

### 6.1 Create `src/main.js` (Entry Point)
- [ ] Import `loadFontAwesome()` from `src/core.js`
- [ ] Import `observeUrlChanges()` and `handlePageChange()` from `src/navigation.js`
- [ ] Import `initReviewPage()` from `src/review.js`
- [ ] Import `initDashboardPage()` from `src/dashboard.js`
- [ ] Export page initializers for navigation module
- [ ] Add initialization code:
  ```javascript
  loadFontAwesome();
  observeUrlChanges();
  handlePageChange();
  ```
- [ ] Wrap in IIFE if needed for scope isolation

### 6.2 Create Tampermonkey Metadata
- [ ] Create `meta.js` or configure in `rollup.config.js`:
  ```javascript
  {
    name: 'WaniKani Review Story Generator',
    namespace: 'karsten.wanikani.story',
    version: '5.0',
    description: 'Collect vocab during reviews and generate a story afterward',
    match: 'https://www.wanikani.com/*',
    grant: ['GM_getValue', 'GM_setValue', 'GM_registerMenuCommand'],
    'run-at': 'document-end'
  }
  ```

---

## Phase 7: Testing & Validation

### 7.1 Build & Smoke Test
- [ ] Run `npm run build:dev` (verify build completes)
- [ ] Run `npm run build:prod` (verify minification works)
- [ ] Check `dist/wkstory.user.js` has Tampermonkey header
- [ ] Verify file size is reasonable (~30-40KB minified)

### 7.2 Functional Testing
- [ ] Install bundled script in Tampermonkey
- [ ] Test review page:
  - [ ] Vocabulary collection during reviews
  - [ ] FIFO queue storage in localStorage
  - [ ] Duplicate detection
- [ ] Test dashboard page:
  - [ ] Button displays correct counts
  - [ ] Capacity indicator shows correct color
  - [ ] Date range displays properly
- [ ] Test story generation:
  - [ ] API call succeeds with valid key
  - [ ] Story overlay displays correctly
  - [ ] Japanese story, translation, vocabulary list all render
- [ ] Test audio features:
  - [ ] Audio generation with configured voice/speed
  - [ ] Play/pause controls work
  - [ ] Progress bar and seek work
  - [ ] Download button creates MP3 file
- [ ] Test settings:
  - [ ] All settings save properly
  - [ ] Queue capacity enforcement works
  - [ ] Reset buttons restore defaults
  - [ ] TTS voice/speed/instructions persist

### 7.3 Edge Case Testing
- [ ] Test with empty queue
- [ ] Test with queue at capacity
- [ ] Test with invalid API key
- [ ] Test with network errors
- [ ] Test vocabulary selection with different modes (recent/random)
- [ ] Test with today's vocabulary only
- [ ] Test settings overlay cancel vs save

---

## Phase 8: Documentation & Cleanup

### 8.1 Update Documentation
- [ ] Update `README.md` with new build instructions
- [ ] Add "Development" section explaining module structure
- [ ] Document how to build from source
- [ ] Update version number to 5.0 in all files

### 8.2 Final Cleanup
- [ ] Remove original `wkstory.user.js` or move to `wkstory.user.js.backup`
- [ ] Update `.gitignore` (add `node_modules/`, `dist/`, optionally `*.backup`)
- [ ] Verify all console logs use `log()` utility
- [ ] Check for any hardcoded values that should be constants

### 8.3 Optional Enhancements
- [ ] Add ESLint configuration for code quality
- [ ] Add Prettier for code formatting
- [ ] Create GitHub Actions workflow for automated builds
- [ ] Add TypeScript type checking (JSDoc comments)

---

## Success Criteria

✅ **Build system produces single-file userscript**  
✅ **All Tampermonkey metadata preserved**  
✅ **All features work identically to v4.1**  
✅ **Source maps enable debugging of original modules**  
✅ **Codebase is maintainable and modular**  
✅ **Production build is minified and optimized**

---

## Notes

- **Circular Dependencies:** Watch for circular imports between modules (e.g., `dashboard.js` ↔ `api.js`). Use forward references or refactor if needed.
- **Global State:** Currently relies on `currentAudioBlob` and `currentAudioUrl` in closure. Consider moving to module-level state in `audio.js` or `ui-story.js`.
- **Font Awesome:** CDN injection must happen in `main.js` before any UI renders.
- **Error Handling:** Preserve all existing error handling and logging throughout refactoring.
- **Testing:** Test on actual WaniKani site during reviews to ensure event listeners work correctly.
