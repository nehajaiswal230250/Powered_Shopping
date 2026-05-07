from __future__ import annotations

import shutil
import tempfile
import zipfile
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path(
    "/Applications/wpsoffice.app/Contents/Resources/office6/addons/knewdocs/res/blanktemplate/normal_mac.pptx"
)
OUTPUT = ROOT / "docs" / "Powered_Shopping_Project_Deck.pptx"


SLIDES = [
    {
        "layout": 1,
        "title": "Powered Shopping",
        "body": [
            "Voice-powered AI shopping concierge",
            "Project analysis deck for the current codebase",
            "React + Express + Firebase + OpenAI",
            "Analyzed on April 21, 2026",
        ],
    },
    {
        "layout": 2,
        "title": "Project Goal",
        "body": [
            "Build a shopping assistant that works through voice, text, and standard UI controls.",
            "Reduce friction in product discovery, recommendations, cart actions, and checkout.",
            "Keep the experience usable when AI, speech recognition, or remote product APIs fail.",
            "Require authentication before users enter the main shopping dashboard.",
        ],
    },
    {
        "layout": 2,
        "title": "User-Facing Features",
        "body": [
            "Voice commands with continuous listening and spoken assistant replies.",
            "Typed command fallback plus quick-command buttons for faster testing.",
            "Catalog filters for query, category, brand, price, and rating.",
            "Recommendations, cart management, checkout simulation, and command history.",
            "Firebase email/password and Google sign-in on the frontend.",
        ],
    },
    {
        "layout": 2,
        "title": "Architecture Overview",
        "body": [
            "React + Vite client handles auth, dashboard state, voice capture, and preferences.",
            "Express backend exposes product, cart, and AI routes under /api.",
            "FakeStore API supplies catalog data; local JSON mock data backs it up.",
            "Firebase/Firestore supports auth and optional cart persistence.",
            "OpenAI powers tool-calling chat and audio transcription.",
        ],
    },
    {
        "layout": 2,
        "title": "Frontend Implementation",
        "body": [
            "AppRoot gates access with useFirebaseAuth, AuthScreen, and HomePage.",
            "HomePage orchestrates views, products, recommendations, cart, history, and settings.",
            "VoiceControl combines live speech recognition, manual commands, and recorder fallback.",
            "browserStorage persists theme, assistant settings, and the last selected category.",
            "Bundled demo product data keeps the UI functional if the backend is unavailable.",
        ],
    },
    {
        "layout": 2,
        "title": "Backend Implementation",
        "body": [
            "productService caches catalog data, infers brands, and converts USD prices to INR.",
            "recommendationService calculates trending and similar product lists.",
            "cartStore supports Firestore-backed carts with in-memory fallback.",
            "aiAssistantService runs a tool loop for search, recommendations, cart, and checkout.",
            "Routes and controllers separate product, cart, and AI responsibilities clearly.",
        ],
    },
    {
        "layout": 2,
        "title": "Voice and AI Flow",
        "body": [
            "Users can speak or type commands such as show Nike shoes under 2000.",
            "Browser speech recognition runs first; recorder plus /api/ai/transcribe handles fallback.",
            "/api/ai/chat sends the request to the LLM with shopping tools attached.",
            "Tool outputs return both assistant text and structured UI updates for the client.",
            "If AI mode is unavailable, the client falls back to a deterministic intent parser.",
        ],
    },
    {
        "layout": 2,
        "title": "Resilience Design",
        "body": [
            "FakeStore requests use a timeout and fall back to local mock products.",
            "Firestore configuration is optional; cart operations still work in memory.",
            "Speech failures surface clear messages for network, microphone, and quota issues.",
            "AI mode can be disabled without breaking search, cart, or checkout actions.",
            "This layered fallback strategy makes the project strong for demos and restricted networks.",
        ],
    },
    {
        "layout": 2,
        "title": "Stack and Scale",
        "body": [
            "Frontend stack: React 18, Vite 5, Firebase 11.",
            "Backend stack: Node.js, Express 4, firebase-admin.",
            "AI stack: OpenAI chat completions plus Whisper transcription endpoint.",
            "Current analysis covered 46 source files and about 10,211 lines of code.",
            "Main workflows run through npm run dev, npm run build, and npm run start.",
        ],
    },
    {
        "layout": 2,
        "title": "Risks and Gaps",
        "body": [
            "client/.env.example contains real-looking Firebase values and should be sanitized.",
            "Port expectations differ between README, env defaults, and server fallback logic.",
            "No automated test suite is present for voice, cart, product, or AI flows.",
            "External service cost and quota limits can affect voice transcription and AI mode.",
            "Some experience quality still depends on browser speech API behavior.",
        ],
    },
    {
        "layout": 2,
        "title": "Suggested Demo Flow",
        "body": [
            "Sign in and show the authenticated dashboard entry point.",
            "Run a product search with voice or a typed assistant command.",
            "Add an item, review the cart, and simulate checkout.",
            "Show fallback behavior by explaining demo data and non-AI command handling.",
            "Close on the project strength: one UX, multiple graceful fallback layers.",
        ],
    },
]


XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'


def paragraph_xml(text: str, level: int = 0) -> str:
    safe = escape(text)
    return (
        f"<a:p><a:pPr lvl=\"{level}\"/>"
        f"<a:r><a:rPr lang=\"en-US\" dirty=\"0\"/><a:t>{safe}</a:t></a:r>"
        "<a:endParaRPr lang=\"en-US\" dirty=\"0\"/></a:p>"
    )


def title_slide_xml(title: str, lines: list[str]) -> str:
    subtitle_xml = "".join(paragraph_xml(line) for line in lines)
    return (
        XML_HEADER
        + "<p:sld xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" "
        + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
        + "xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">"
        + "<p:cSld><p:spTree>"
        + "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>"
        + "<p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/>"
        + "<a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr>"
        + "<p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Title 1\"/>"
        + "<p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr>"
        + "<p:nvPr><p:ph type=\"ctrTitle\"/></p:nvPr></p:nvSpPr>"
        + "<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>"
        + paragraph_xml(title)
        + "</p:txBody></p:sp>"
        + "<p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Subtitle 2\"/>"
        + "<p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr>"
        + "<p:nvPr><p:ph type=\"subTitle\" idx=\"1\"/></p:nvPr></p:nvSpPr>"
        + "<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>"
        + subtitle_xml
        + "</p:txBody></p:sp>"
        + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
    )


def content_slide_xml(title: str, bullets: list[str]) -> str:
    body_xml = "".join(paragraph_xml(f"- {line}") for line in bullets)
    return (
        XML_HEADER
        + "<p:sld xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" "
        + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
        + "xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">"
        + "<p:cSld><p:spTree>"
        + "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>"
        + "<p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/>"
        + "<a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr>"
        + "<p:sp><p:nvSpPr><p:cNvPr id=\"2\" name=\"Title 1\"/>"
        + "<p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr>"
        + "<p:nvPr><p:ph type=\"title\"/></p:nvPr></p:nvSpPr>"
        + "<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>"
        + paragraph_xml(title)
        + "</p:txBody></p:sp>"
        + "<p:sp><p:nvSpPr><p:cNvPr id=\"3\" name=\"Content Placeholder 2\"/>"
        + "<p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr>"
        + "<p:nvPr><p:ph idx=\"1\"/></p:nvPr></p:nvSpPr>"
        + "<p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/>"
        + body_xml
