# PIMXVOICE 2.2 validation — 2026-10-17

## 2.2 default language and multiple keys

- Fresh extension profiles open in English; saved Persian remains supported. Invalid locale values fall back to English.
- The API keys tab exposes the additional-key form without expanding a disclosure. The submit action identifies adding a key after onboarding.
- Chromium regression validates adding a second synthetic key without replacing the first, changing priority, masked public metadata, and both keys surviving popup reload. All 19 Node tests, both UI regression scripts, and syntax/assets checks pass. Live audio behavior is unchanged from the earlier tested release.

## 2.1 popup and dropdown regression

- Root and body explicitly measure 420px at a 220px bootstrap viewport, removing the circular `100vw` dependency that matched the user's narrow toolbar screenshot. The onboarding Connect button fits within 420×600.
- All 12 select fields use custom searchable menus. Chromium checks cover search, language aliases, keyboard selection, Escape focus restoration, Tab navigation, no-result feedback, placement near the bottom edge, and English/light plus Persian/dark rendering.
- Live model selection is visible outside the advanced disclosure. Missing cached catalogs reload automatically; failed refreshes preserve the cached choices and show an error. A real Google models request returned 9 Live choices, all present in the custom menu. The key was supplied at runtime and forgotten afterward.
- `scripts/browser-dropdowns.py --live`, the existing complete `scripts/browser-v2.py` UI regression, 18 Node tests, and syntax/assets/credential checks pass without page errors. Current screenshots are `artifacts/pimx21-*.png`.
- The independent scoped UI review returned `disposition: ship`, with no material visual or ergonomic findings across all six current popup captures. Its toolbar-sizing evidence limit is recorded below.
- Headless Chromium did not expose a native toolbar action-popup target. The intrinsic sizing and popup document were verified in an extension page at 420×600; a physical toolbar click remains a manual check. The actual user capture takes precedence over the prior staged viewport sizing evidence.

## Automated verification

- 18 Node tests cover protocol differences, PCM format, model discovery, settings bounds, three output modes, independent subtitle languages, selected TTS narrator, short-fragment buffering, bounded text segmentation, credential redaction, REST quota failover, WebSocket setup failover, exhaustion of all keys, and avoiding key rotation on model errors.
- JavaScript syntax, manifest references, required runtime assets, and embedded-credential checks pass.
- Isolated Chromium 153 regression passes without page errors: Persian/English, light/dark, 31 narrator options (model default + 30 named voices), three output modes, two separate subtitle languages, actual WOFF2 upload/FontFace validation, style changes, persistence, key addition, key preference and masked metadata.
- Six viewport captures at 420×600 are in artifacts/pimx-*.png. A separate UI review found one model-disclosure affordance issue; the chevron was added and the reviewer scored it resolved. Design records were updated from the shipped CSS.

## Real Google API and tab audio

The user-supplied key was passed at runtime only. No key is embedded in source or release files.

Both of these paths produced Persian dubbing using Puck, English/French subtitle lines, and real captured audio from a local synthetic-English audio tab:

- Gemini 3.5 Transcribe Live → independent text translations → Gemini 3.8 Flash Lite TTS (Puck).
- Gemini 3.5 Live Translate → source transcript → independent translations → selected TTS voice (Puck).

The uploaded Vazirmatn font and custom subtitle colors/sizes were applied on the captured webpage. Closing and reopening the popup kept capture active. Stop removed the offscreen context and released capture. The dedicated transcription path had a longer startup delay than Live Translate in this sample; no zero-latency claim is made.

Headless automation cannot physically click the toolbar, so audio tests use a disposable extension copy with localhost-only permission and Chromium's capture allowlist. The production manifest retains its original minimal permissions. Playwright's default mute-audio switch is removed to capture actual sound.

Quota errors and backup-key retry behavior are tested with simulated 429 REST and WebSocket responses; the test does not intentionally exhaust the user's real Google quota. Key management was exercised with synthetic keys using a models-list stub before the real-key audio phase.

## Scope

No exhaustive provider/DRM/fullscreen compatibility, long-session endurance, human listening evaluation across all 30 voices, every language, or real multi-project exhausted-key sequence was performed. Model listing may include retired or inaccessible generation models. Performance, language support, quota and latency depend on Google and the selected models. Frames during key re-authentication can be lost; the engine does not record an unbounded backlog.
