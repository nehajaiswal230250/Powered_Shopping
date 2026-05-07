# Powered Shopping

## Slide 1 - Powered Shopping
- Voice-powered AI shopping concierge
- Project analysis deck for the current codebase
- React + Express + Firebase + OpenAI
- Analyzed on April 21, 2026

## Slide 2 - Project Goal
- Build a shopping assistant that works through voice, text, and standard UI controls.
- Reduce friction in product discovery, recommendations, cart actions, and checkout.
- Keep the experience usable when AI, speech recognition, or remote product APIs fail.
- Require authentication before users enter the main shopping dashboard.

## Slide 3 - User-Facing Features
- Voice commands with continuous listening and spoken assistant replies.
- Typed command fallback plus quick-command buttons for faster testing.
- Catalog filters for query, category, brand, price, and rating.
- Recommendations, cart management, checkout simulation, and command history.
- Firebase email/password and Google sign-in on the frontend.

## Slide 4 - Architecture Overview
- React + Vite client handles auth, dashboard state, voice capture, and preferences.
- Express backend exposes product, cart, and AI routes under `/api`.
- FakeStore API supplies catalog data; local JSON mock data backs it up.
- Firebase/Firestore supports auth and optional cart persistence.
- OpenAI powers tool-calling chat and audio transcription.

## Slide 5 - Frontend Implementation
- `AppRoot` gates access with `useFirebaseAuth`, `AuthScreen`, and `HomePage`.
- `HomePage` orchestrates views, products, recommendations, cart, history, and settings.
- `VoiceControl` combines live speech recognition, manual commands, and recorder fallback.
- `browserStorage` persists theme, assistant settings, and the last selected category.
- Bundled demo product data keeps the UI functional if the backend is unavailable.

## Slide 6 - Backend Implementation
- `productService` caches catalog data, infers brands, and converts USD prices to INR.
- `recommendationService` calculates trending and similar product lists.
- `cartStore` supports Firestore-backed carts with in-memory fallback.
- `aiAssistantService` runs a tool loop for search, recommendations, cart, and checkout.
- Routes and controllers separate product, cart, and AI responsibilities clearly.

## Slide 7 - Voice and AI Flow
- Users can speak or type commands such as `show Nike shoes under 2000`.
- Browser speech recognition runs first; recorder plus `/api/ai/transcribe` handles fallback.
- `/api/ai/chat` sends the request to the LLM with shopping tools attached.
- Tool outputs return both assistant text and structured UI updates for the client.
- If AI mode is unavailable, the client falls back to a deterministic intent parser.

## Slide 8 - Resilience Design
- FakeStore requests use a timeout and fall back to local mock products.
- Firestore configuration is optional; cart operations still work in memory.
- Speech failures surface clear messages for network, microphone, and quota issues.
- AI mode can be disabled without breaking search, cart, or checkout actions.
- This layered fallback strategy makes the project strong for demos and restricted networks.

## Slide 9 - Stack and Scale
- Frontend stack: React 18, Vite 5, Firebase 11.
- Backend stack: Node.js, Express 4, `firebase-admin`.
- AI stack: OpenAI chat completions plus Whisper transcription endpoint.
- Current analysis covered 46 source files and about 10,211 lines of code.
- Main workflows run through `npm run dev`, `npm run build`, and `npm run start`.

## Slide 10 - Risks and Gaps
- `client/.env.example` contains real-looking Firebase values and should be sanitized.
- Port expectations differ between README, env defaults, and server fallback logic.
- No automated test suite is present for voice, cart, product, or AI flows.
- External service cost and quota limits can affect voice transcription and AI mode.
- Some experience quality still depends on browser speech API behavior.

## Slide 11 - Suggested Demo Flow
- Sign in and show the authenticated dashboard entry point.
- Run a product search with voice or a typed assistant command.
- Add an item, review the cart, and simulate checkout.
- Show fallback behavior by explaining demo data and non-AI command handling.
- Close on the project strength: one UX, multiple graceful fallback layers.
