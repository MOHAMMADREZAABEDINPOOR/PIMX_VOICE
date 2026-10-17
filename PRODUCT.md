# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Assumption for this session: dependency-free JavaScript, HTML, CSS; Chromium Manifest V3 extension. Lightweight implementation follows the explicit performance requirement.

## Users
Persian and English speakers watching videos in other languages.

## Product Purpose
PIMXVOICE translates current-tab speech into selectable narrator dubbing and independently selected one- or two-language subtitles using the user's Gemini keys.

## Operating Context
The toolbar opens a popup, never an application tab. Explain API key creation with direct Google AI Studio links. Persian/English interface and light/dark themes are required.

Fresh installs start in English. Preserve an explicitly saved interface language. Multiple API keys are managed in the API keys tab, with the additional-key form expanded by default.

## Capabilities and Constraints
Discover models from Google's API. Support specialized live transcription, live translation, and conversational audio models with separate compatible configurations. Keep audio processing outside the popup. Send audio directly to Google. No bundled credentials. Language coverage depends on the chosen model, not every human language.

## Confirmed Output
The user explicitly requested the PIMXVOICE brand and logo, narrator voice selection, automatic switching to backup API keys on quota exhaustion, independent subtitle languages, dual subtitles, font uploads and complete subtitle styling. Dubbing-only, subtitles-only and both are selectable. Native voice remains available; selected narrators use Gemini TTS. Uploaded fonts stay local.

## Brand Commitments
PIMXVOICE is the user-confirmed name. The generated P/X speech-ribbon logo is in assets/pimxvoice-logo.png; its provenance and exact prompt are in assets/logo-prompt.txt. Preserve the established marine/porcelain popup world and bilingual accessibility.

## Open Decisions
Chrome/Edge 116+. Quotas can be shared by keys in the same Google project. Failover does not create additional quota and may briefly interrupt the stream.

## Product Principles
Clear setup, visible recording state, explicit stop, minimal permissions, bounded audio and transcript buffers, no server dependency.
