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
        + "</p:txBody></p:sp>"
        + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
    )


def slide_rels_xml(layout_number: int) -> str:
    return (
        XML_HEADER
        + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        + f"<Relationship Id=\"rId1\" "
        + "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout\" "
        + f"Target=\"../slideLayouts/slideLayout{layout_number}.xml\"/>"
        + "</Relationships>"
    )


def presentation_xml(slide_count: int) -> str:
    slide_ids = "".join(
        f"<p:sldId id=\"{256 + index}\" r:id=\"rId{3 + index}\"/>" for index in range(slide_count)
    )
    return (
        XML_HEADER
        + "<p:presentation xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" "
        + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
        + "xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">"
        + "<p:sldMasterIdLst><p:sldMasterId id=\"2147483648\" r:id=\"rId1\"/></p:sldMasterIdLst>"
        + "<p:notesMasterIdLst><p:notesMasterId r:id=\"rId4\"/></p:notesMasterIdLst>"
        + "<p:handoutMasterIdLst><p:handoutMasterId r:id=\"rId5\"/></p:handoutMasterIdLst>"
        + f"<p:sldIdLst>{slide_ids}</p:sldIdLst>"
        + "<p:sldSz cx=\"12192000\" cy=\"6858000\"/>"
        + "<p:notesSz cx=\"7103745\" cy=\"10234295\"/>"
        + "<p:defaultTextStyle>"
        + "<a:defPPr><a:defRPr lang=\"en-US\"/></a:defPPr>"
        + "<a:lvl1pPr marL=\"0\" algn=\"l\" defTabSz=\"914400\">"
        + "<a:defRPr sz=\"1800\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill>"
        + "<a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr>"
        + "</a:lvl1pPr>"
        + "<a:lvl2pPr marL=\"457200\" algn=\"l\" defTabSz=\"914400\">"
        + "<a:defRPr sz=\"1800\"><a:solidFill><a:schemeClr val=\"tx1\"/></a:solidFill>"
        + "<a:latin typeface=\"+mn-lt\"/><a:ea typeface=\"+mn-ea\"/><a:cs typeface=\"+mn-cs\"/></a:defRPr>"
        + "</a:lvl2pPr>"
        + "</p:defaultTextStyle>"
        + "</p:presentation>"
    )


def presentation_rels_xml(slide_count: int) -> str:
    slide_rels = "".join(
        f"<Relationship Id=\"rId{3 + index}\" "
        + "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\" "
        + f"Target=\"slides/slide{index + 1}.xml\"/>"
        for index in range(slide_count)
    )
    return (
        XML_HEADER
        + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        + "<Relationship Id=\"rId8\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles\" Target=\"tableStyles.xml\"/>"
        + "<Relationship Id=\"rId7\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps\" Target=\"viewProps.xml\"/>"
        + "<Relationship Id=\"rId6\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps\" Target=\"presProps.xml\"/>"
        + "<Relationship Id=\"rId5\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/handoutMaster\" Target=\"handoutMasters/handoutMaster1.xml\"/>"
        + "<Relationship Id=\"rId4\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster\" Target=\"notesMasters/notesMaster1.xml\"/>"
        + slide_rels
        + "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme\" Target=\"theme/theme1.xml\"/>"
        + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster\" Target=\"slideMasters/slideMaster1.xml\"/>"
        + "</Relationships>"
    )


def content_types_xml(slide_count: int) -> str:
    slide_overrides = "".join(
        f"<Override PartName=\"/ppt/slides/slide{index + 1}.xml\" "
        + "ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>"
        for index in range(slide_count)
    )
    return (
        XML_HEADER
        + "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">"
        + "<Default Extension=\"jpeg\" ContentType=\"image/jpeg\"/>"
        + "<Default Extension=\"JPG\" ContentType=\"image/.jpg\"/>"
        + "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>"
        + "<Default Extension=\"xml\" ContentType=\"application/xml\"/>"
        + "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>"
        + "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>"
        + "<Override PartName=\"/docProps/custom.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.custom-properties+xml\"/>"
        + "<Override PartName=\"/ppt/handoutMasters/handoutMaster1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.handoutMaster+xml\"/>"
        + "<Override PartName=\"/ppt/notesMasters/notesMaster1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml\"/>"
        + "<Override PartName=\"/ppt/notesSlides/notesSlide1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml\"/>"
        + "<Override PartName=\"/ppt/presProps.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.presProps+xml\"/>"
        + "<Override PartName=\"/ppt/presentation.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout10.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout2.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout3.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout4.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout5.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout6.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout7.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout8.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideLayouts/slideLayout9.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml\"/>"
        + "<Override PartName=\"/ppt/slideMasters/slideMaster1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml\"/>"
        + slide_overrides
        + "<Override PartName=\"/ppt/tableStyles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml\"/>"
        + "<Override PartName=\"/ppt/theme/theme1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/>"
        + "<Override PartName=\"/ppt/theme/theme2.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/>"
        + "<Override PartName=\"/ppt/theme/theme3.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.theme+xml\"/>"
        + "<Override PartName=\"/ppt/viewProps.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml\"/>"
        + "</Types>"
    )


def replace_slides(workdir: Path) -> None:
    slides_dir = workdir / "ppt" / "slides"
    rels_dir = slides_dir / "_rels"

    for path in slides_dir.glob("slide*.xml"):
        path.unlink()
    for path in rels_dir.glob("slide*.xml.rels"):
        path.unlink()

    for index, slide in enumerate(SLIDES, start=1):
        slide_path = slides_dir / f"slide{index}.xml"
        rels_path = rels_dir / f"slide{index}.xml.rels"
        if slide["layout"] == 1:
            xml = title_slide_xml(slide["title"], slide["body"])
        else:
            xml = content_slide_xml(slide["title"], slide["body"])
        slide_path.write_text(xml, encoding="utf-8")
        rels_path.write_text(slide_rels_xml(slide["layout"]), encoding="utf-8")


def write_archive(source_dir: Path, output_file: Path) -> None:
    with zipfile.ZipFile(output_file, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_dir():
                continue
            archive.write(path, path.relative_to(source_dir).as_posix())


def generate() -> Path:
    if not TEMPLATE.exists():
        raise FileNotFoundError(f"Template not found: {TEMPLATE}")

    with tempfile.TemporaryDirectory(prefix="powered-shopping-pptx-") as tmp:
        workdir = Path(tmp)
        with zipfile.ZipFile(TEMPLATE) as archive:
            archive.extractall(workdir)

        replace_slides(workdir)
        (workdir / "ppt" / "presentation.xml").write_text(
            presentation_xml(len(SLIDES)),
            encoding="utf-8",
        )
        (workdir / "ppt" / "_rels" / "presentation.xml.rels").write_text(
            presentation_rels_xml(len(SLIDES)),
            encoding="utf-8",
        )
        (workdir / "[Content_Types].xml").write_text(
            content_types_xml(len(SLIDES)),
            encoding="utf-8",
        )

        if OUTPUT.exists():
            OUTPUT.unlink()
        write_archive(workdir, OUTPUT)

    return OUTPUT


if __name__ == "__main__":
    deck = generate()
    print(deck)
