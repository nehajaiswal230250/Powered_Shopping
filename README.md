# Powered Shopping (Voice-Powered Shopping Concierge)

Full-stack shopping assistant with voice + AI-driven search, filters, and cart actions.

[![Take a look](https://img.shields.io/badge/Take%20a%20look-Live%20Website-7c3aed?style=for-the-badge)](https://aishopping-475ab.web.app/)

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Product source: FakeStore API with local JSON fallback
- Voice: Web Speech API (SpeechRecognition + SpeechSynthesis)
- Hosting: Firebase Hosting (client)

## Features
- Voice start/stop + optional continuous mode
- NLP intent detection for search, add/remove cart, checkout, trending, similar
- Product filtering by text, category, price, rating
- Cart management + checkout simulation
- Firebase Authentication starter flow (email/password + Google sign-in)
- Spoken AI responses
- Basic personalization (last category memory + recommendations)
- Conversation history panel
- AI “doing the task” UI effects (thinking chips, cursor ghost, scrolling focus, shake/search states)

## Live demo
- Website: https://aishopping-475ab.web.app/

## Voice examples
- `hello mike` (wake word)
- `show nike shoes under 2000`
- `top rated headphones under 5000`
- `add item number 2 to cart`
- `remove from cart nike`
- `checkout`

## Docs
- UI Guide: `docs/USER_INTERFACE_GUIDE.pdf`
- Project Report: `docs/PROJECT_REPORT.pdf`
- Slides/Decks: `docs/` (PPTX)

## Run locally

```bash
npm install --prefix server
npm install --prefix client
npm run dev
```

Server: `http://127.0.0.1:5050`  
Client: `http://127.0.0.1:5173` by default, or the next available localhost port if `5173` is busy

Tip: to expose the client on your LAN, run with `CLIENT_HOST=0.0.0.0` (and make sure Firebase Authorized domains include the hostname you open in the browser).

## API routes
- `GET /api/products`
- `GET /api/products/categories`
- `GET /api/products/recommendations`
- `GET /api/cart`
- `POST /api/cart/add`
- `POST /api/cart/remove`
- `POST /api/cart/checkout`
- `POST /api/ai/chat`
- `POST /api/ai/transcribe`

## Firebase process (cart persistence)

Cart data now supports Firebase Firestore persistence on the backend.

1. Install server deps (includes `firebase-admin`):

```bash
npm install --prefix server
```

2. Create `server/.env` from `server/.env.example` and set:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (keep `\n` in the value)
- Optional: `DEFAULT_CART_ID`
- Optional AI:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (default: `gpt-4o-mini`)
  - `OPENAI_TRANSCRIBE_MODEL` (default: `whisper-1`)
  - OpenAI keys must be in `server/.env`, not `client/.env`. If `/api/ai/transcribe` returns a `429` quota/billing error, add billing/quota or use a different valid server key, then restart the server.

3. Start server/client:

```bash
npm run dev
```

4. Optional multi-cart support:
- Send `x-cart-id` header (or `cartId` query/body value) to isolate carts per user/session.

If Firebase env vars are missing, the server automatically falls back to in-memory cart storage.

## Firebase web app config (client)

The frontend now initializes Firebase using Vite env vars from `client/.env`.

1. Copy `client/.env.example` to `client/.env`
2. In Firebase Console, open Authentication > Settings > Authorized domains and add every host you use to open the app:
   - `localhost`
   - `127.0.0.1` only if you explicitly open the app with that host
   - Your Firebase Hosting domain, for example `your-project.web.app`
   - Any custom domain you use in the browser
3. In Authentication > Sign-in method, enable Email/Password and Google if you use both login buttons.
4. Start client/server:

```bash
npm run dev
```

If Google sign-in shows `auth/unauthorized-domain`, the browser hostname in the address bar is missing from Firebase Authorized domains.

`initAnalytics()` runs on app startup and safely skips when analytics is unavailable.
Firebase Auth UI now appears first; users must sign in before the shopping dashboard loads.

## AI voice assistant mode

When `OPENAI_API_KEY` is set on the server, voice/manual commands can run through an LLM assistant with tool-calling for:
- Product search/filter
- Recommendations
- Cart add/remove/read
- Checkout

If AI is unavailable, the app automatically falls back to the deterministic intent parser.

When browser speech recognition fails on network-restricted environments, the assistant can use fallback recording:
- Record short mic clip
- Send audio to `/api/ai/transcribe`
- Run transcribed command automatically
