from __future__ import annotations

import shutil
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from xml.sax.saxutils import escape


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path(
    "/Applications/wpsoffice.app/Contents/Resources/office6/addons/knewdocs/res/blanktemplate/normal_mac.pptx"
)
OUTPUT = ROOT / "docs" / "Powered_Shopping_Classroom_Deck.pptx"
ASSETS = {
    "process": ROOT / "presentation_assets" / "int428_process_flow.png",
    "desktop": ROOT / "presentation_assets" / "ui_auth_desktop.png",
    "mobile": ROOT / "presentation_assets" / "ui_auth_mobile.png",
}

SLIDE_W = 12192000
SLIDE_H = 6858000
EMU = 914400
XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

COLORS = {
    "ink": "0F2744",
    "navy": "1E4E8C",
    "navy_dark": "153B6D",
    "blue_soft": "DCEAF7",
    "blue_line": "B9D2EB",
    "paper": "F7FAFC",
    "paper_warm": "F8F5EF",
    "orange": "F29C38",
    "teal": "1FA6C7",
    "pink": "E65B87",
    "green": "7ABD42",
    "slate": "586B8D",
    "red": "D75A4A",
    "amber": "F4C145",
    "white": "FFFFFF",
    "muted": "617489",
}


def inches(value: float) -> int:
    return int(value * EMU)


def solid_fill(color: str, alpha: int = 100000) -> str:
    alpha_xml = "" if alpha == 100000 else f"<a:alpha val=\"{alpha}\"/>"
    return f"<a:solidFill><a:srgbClr val=\"{color}\">{alpha_xml}</a:srgbClr></a:solidFill>"


def line_fill(color: str | None = None, width: int = 12700, alpha: int = 100000) -> str:
    if color is None:
        return (
            f"<a:ln w=\"{width}\">"
            "<a:solidFill><a:srgbClr val=\"000000\"><a:alpha val=\"0\"/></a:srgbClr></a:solidFill>"
            "</a:ln>"
        )
    alpha_xml = "" if alpha == 100000 else f"<a:alpha val=\"{alpha}\"/>"
    return (
        f"<a:ln w=\"{width}\">"
        f"<a:solidFill><a:srgbClr val=\"{color}\">{alpha_xml}</a:srgbClr></a:solidFill>"
        "</a:ln>"
    )


def paragraph_xml(
    text: str,
    *,
    font: str = "Calibri",
    size: int = 1800,
    color: str = COLORS["ink"],
    bold: bool = False,
    align: str = "l",
) -> str:
    safe = escape(text)
    bold_xml = ' b="1"' if bold else ""
    return (
        f"<a:p><a:pPr algn=\"{align}\"><a:buNone/></a:pPr>"
        f"<a:r><a:rPr lang=\"en-US\" sz=\"{size}\"{bold_xml}>"
        f"{solid_fill(color)}"
        f"<a:latin typeface=\"{font}\"/><a:ea typeface=\"{font}\"/>"
        f"</a:rPr><a:t>{safe}</a:t></a:r>"
        f"<a:endParaRPr lang=\"en-US\" sz=\"{size}\"{bold_xml}>"
        f"{solid_fill(color)}"
        f"<a:latin typeface=\"{font}\"/><a:ea typeface=\"{font}\"/>"
        f"</a:endParaRPr></a:p>"
    )


@dataclass
class PictureUse:
    asset_key: str
    name: str
    x: int
    y: int
    w: int
    h: int


class SlideBuilder:
    def __init__(self, name: str):
        self.name = name
        self.next_id = 2
        self.shape_xml: list[str] = []
        self.pictures: list[PictureUse] = []

    def add_shape(
        self,
        *,
        x: int,
        y: int,
        w: int,
        h: int,
        fill: str | None = None,
        fill_alpha: int = 100000,
        line: str | None = None,
        line_width: int = 12700,
        line_alpha: int = 100000,
        geom: str = "rect",
        text: list[str] | None = None,
        font: str = "Calibri",
        size: int = 1800,
        color: str = COLORS["ink"],
        bold: bool = False,
        align: str = "l",
        name: str = "Shape",
        inset: tuple[int, int, int, int] | None = None,
        valign: str = "t",
        txbox: bool = False,
    ) -> None:
        shape_id = self.next_id
        self.next_id += 1
        fill_xml = solid_fill(fill, fill_alpha) if fill else "<a:noFill/>"
        line_xml = line_fill(line, line_width, line_alpha)
        body = ""
        if text:
            body_pr = "<a:bodyPr wrap=\"square\" rtlCol=\"0\""
            if valign:
                body_pr += f" anchor=\"{valign}\""
            if inset:
                l_ins, t_ins, r_ins, b_ins = inset
                body_pr += (
                    f" lIns=\"{l_ins}\" tIns=\"{t_ins}\" rIns=\"{r_ins}\" bIns=\"{b_ins}\""
                )
            body_pr += "><a:spAutoFit/></a:bodyPr>"
            paragraphs = "".join(
                paragraph_xml(line_text, font=font, size=size, color=color, bold=bold, align=align)
                for line_text in text
            )
            body = f"<p:txBody>{body_pr}<a:lstStyle/>{paragraphs}</p:txBody>"
        else:
            body = "<p:txBody><a:bodyPr/><a:lstStyle/><a:p/></p:txBody>"

        txbox_xml = ' txBox="1"' if txbox else ""
        self.shape_xml.append(
            "<p:sp>"
            f"<p:nvSpPr><p:cNvPr id=\"{shape_id}\" name=\"{escape(name)}\"/>"
            f"<p:cNvSpPr{txbox_xml}/><p:nvPr/></p:nvSpPr>"
            f"<p:spPr><a:xfrm><a:off x=\"{x}\" y=\"{y}\"/><a:ext cx=\"{w}\" cy=\"{h}\"/></a:xfrm>"
            f"<a:prstGeom prst=\"{geom}\"><a:avLst/></a:prstGeom>{fill_xml}{line_xml}</p:spPr>"
            f"{body}</p:sp>"
        )

    def add_picture(self, asset_key: str, *, x: int, y: int, w: int, h: int, name: str) -> None:
        self.pictures.append(PictureUse(asset_key=asset_key, name=name, x=x, y=y, w=w, h=h))

    def render(self, media_targets: dict[str, str]) -> tuple[str, str]:
        picture_xml_parts: list[str] = []
        rels: list[str] = [
            "<Relationship Id=\"rId1\" "
            "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout\" "
            "Target=\"../slideLayouts/slideLayout7.xml\"/>"
        ]

        for index, picture in enumerate(self.pictures, start=2):
            pic_id = self.next_id
            self.next_id += 1
            rels.append(
                f"<Relationship Id=\"rId{index}\" "
                "Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" "
                f"Target=\"../media/{media_targets[picture.asset_key]}\"/>"
            )
            picture_xml_parts.append(
                "<p:pic>"
                f"<p:nvPicPr><p:cNvPr id=\"{pic_id}\" name=\"{escape(picture.name)}\" descr=\"{escape(picture.name)}\"/>"
                "<p:cNvPicPr><a:picLocks noChangeAspect=\"1\"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>"
                f"<p:blipFill><a:blip r:embed=\"rId{index}\"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>"
                f"<p:spPr><a:xfrm><a:off x=\"{picture.x}\" y=\"{picture.y}\"/><a:ext cx=\"{picture.w}\" cy=\"{picture.h}\"/></a:xfrm>"
                "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></p:spPr></p:pic>"
            )

        slide_xml = (
            XML_HEADER
            + "<p:sld xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" "
            + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
            + "xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">"
            + "<p:cSld><p:spTree>"
            + "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>"
            + "<p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/>"
            + "<a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr>"
            + "".join(self.shape_xml)
            + "".join(picture_xml_parts)
            + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
        )
        rels_xml = (
            XML_HEADER
            + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
            + "".join(rels)
            + "</Relationships>"
        )
        return slide_xml, rels_xml


def media_registry() -> dict[str, str]:
    return {
        "process": "image1.png",
        "desktop": "image2.png",
        "mobile": "image3.png",
    }


def add_footer(slide: SlideBuilder, number: str) -> None:
    slide.add_shape(
        x=inches(0.45),
        y=inches(7.02),
        w=inches(2.5),
        h=inches(0.26),
        fill=None,
        line=None,
        text=[f"{number}  |  Powered Shopping  |  INT428 format"],
        font="Calibri",
        size=1100,
        color=COLORS["muted"],
        align="l",
        txbox=True,
        name="Footer",
    )


def build_cover() -> SlideBuilder:
    slide = SlideBuilder("Cover")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper"], line=None, name="BG")
    slide.add_shape(
        x=0,
        y=0,
        w=inches(6.55),
        h=SLIDE_H,
        fill=COLORS["navy_dark"],
        line=None,
        name="Left Panel",
    )
    slide.add_shape(
        x=inches(0.65),
        y=inches(0.68),
        w=inches(1.7),
        h=inches(0.42),
        fill=COLORS["orange"],
        line=None,
        geom="roundRect",
        text=["CLASSROOM PRESENTATION"],
        font="Calibri",
        size=1250,
        color=COLORS["white"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Label",
    )
    slide.add_shape(
        x=inches(0.65),
        y=inches(1.35),
        w=inches(5.0),
        h=inches(1.6),
        fill=None,
        line=None,
        text=["Powered Shopping", "AI voice assistant for easier online shopping"],
        font="Calibri Light",
        size=2600,
        color=COLORS["white"],
        bold=True,
        align="l",
        txbox=True,
        name="Title",
    )
    slide.add_shape(
        x=inches(0.67),
        y=inches(3.05),
        w=inches(5.1),
        h=inches(1.0),
        fill=None,
        line=None,
        text=[
            "This deck explains what the project does, how it works,",
            "which technologies were used, and why the implementation matters.",
        ],
        font="Calibri",
        size=1450,
        color=COLORS["blue_soft"],
        align="l",
        txbox=True,
        name="Subtitle",
    )
    for idx, label in enumerate(
        ["Voice Search", "Smart Cart", "AI Assistant"]
    ):
        slide.add_shape(
            x=inches(0.67 + idx * 1.72),
            y=inches(5.75),
            w=inches(1.52),
            h=inches(0.52),
            fill=COLORS["white"],
            fill_alpha=12000,
            line=COLORS["blue_line"],
            geom="roundRect",
            text=[label],
            font="Calibri",
            size=1200,
            color=COLORS["white"],
            bold=True,
            align="ctr",
            valign="ctr",
            inset=(0, 0, 0, 0),
            name=f"Chip {idx+1}",
        )
    slide.add_shape(
        x=inches(7.0),
        y=inches(0.7),
        w=inches(5.6),
        h=inches(5.8),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Screenshot Frame",
    )
    slide.add_picture(
        "desktop",
        x=inches(7.18),
        y=inches(0.95),
        w=inches(5.25),
        h=inches(4.8),
        name="Desktop UI",
    )
    slide.add_shape(
        x=inches(7.2),
        y=inches(5.95),
        w=inches(5.1),
        h=inches(0.42),
        fill=None,
        line=None,
        text=["Live UI snapshot from the running project"],
        font="Calibri",
        size=1200,
        color=COLORS["muted"],
        align="ctr",
        txbox=True,
        name="Caption",
    )
    return slide


def build_problem_slide() -> SlideBuilder:
    slide = SlideBuilder("Problem Objective Novelty")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper_warm"], line=None, name="BG")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=inches(0.55), fill=COLORS["navy_dark"], line=None, name="Top Bar")
    slide.add_shape(
        x=inches(0.6),
        y=inches(0.82),
        w=inches(4.7),
        h=inches(0.55),
        fill=None,
        line=None,
        text=["Problem statement"],
        font="Calibri Light",
        size=2400,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    cards = [
        ("PROBLEM", COLORS["orange"], "Traditional online shopping needs too many manual clicks, searches, and filters."),
        ("PAIN POINT", COLORS["teal"], "Users must repeatedly type queries, compare products, and manage the cart manually."),
        ("NEED", COLORS["pink"], "A smarter shopping system should understand natural voice or text commands."),
        ("GOAL", COLORS["green"], "Make shopping faster, simpler, and more interactive through AI assistance."),
    ]
    positions = [(0.72, 1.7), (6.75, 1.7), (0.72, 4.0), (6.75, 4.0)]
    for idx, ((label, color, text), (x, y)) in enumerate(zip(cards, positions), start=1):
        slide.add_shape(
            x=inches(x),
            y=inches(y),
            w=inches(5.1),
            h=inches(1.7),
            fill=COLORS["white"],
            line=COLORS["blue_line"],
            geom="roundRect",
            name=f"Card {idx}",
        )
        slide.add_shape(
            x=inches(x + 0.22),
            y=inches(y + 0.2),
            w=inches(1.28),
            h=inches(0.42),
            fill=color,
            line=None,
            geom="roundRect",
            text=[label],
            font="Calibri",
            size=1200,
            color=COLORS["white"],
            bold=True,
            align="ctr",
            valign="ctr",
            inset=(0, 0, 0, 0),
            name=f"Label {idx}",
        )
        slide.add_shape(
            x=inches(x + 0.25),
            y=inches(y + 0.8),
            w=inches(4.55),
            h=inches(0.65),
            fill=None,
            line=None,
            text=[text],
            font="Calibri",
            size=1500,
            color=COLORS["ink"],
            txbox=True,
            name=f"Body {idx}",
        )
    add_footer(slide, "02")
    return slide


def build_scope_slide() -> SlideBuilder:
    slide = SlideBuilder("Scope")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.55),
        y=inches(0.72),
        w=inches(3.6),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["Proposed solution and user journey"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    slide.add_shape(
        x=inches(0.6),
        y=inches(1.45),
        w=inches(5.9),
        h=inches(4.95),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Mandatory Panel",
    )
    slide.add_shape(
        x=inches(0.82),
        y=inches(1.72),
        w=inches(1.9),
        h=inches(0.42),
        fill=COLORS["navy"],
        geom="roundRect",
        line=None,
        text=["USER JOURNEY"],
        font="Calibri",
        size=1200,
        color=COLORS["white"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Mandatory Label",
    )
    left_items = [
        "1. User logs in with email/password or Google.",
        "2. User speaks or types a command such as show shoes under 2000.",
        "3. App returns products, recommendations, or cart updates.",
        "4. User adds items and completes checkout in the same flow.",
    ]
    for idx, item in enumerate(left_items):
        slide.add_shape(
            x=inches(0.92),
            y=inches(2.35 + idx * 0.82),
            w=inches(5.05),
            h=inches(0.5),
            fill=COLORS["blue_soft"],
            line=None,
            geom="roundRect",
            text=[item],
            font="Calibri",
            size=1350,
            color=COLORS["ink"],
            bold=False,
            align="l",
            valign="ctr",
            inset=(inches(0.12), 0, inches(0.08), 0),
            name=f"Mandatory Item {idx+1}",
        )

    slide.add_shape(
        x=inches(6.8),
        y=inches(1.45),
        w=inches(5.9),
        h=inches(4.95),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Enhancement Panel",
    )
    slide.add_shape(
        x=inches(7.02),
        y=inches(1.72),
        w=inches(2.25),
        h=inches(0.42),
        fill=COLORS["teal"],
        geom="roundRect",
        line=None,
        text=["SOLUTION MODULES"],
        font="Calibri",
        size=1200,
        color=COLORS["white"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Optional Label",
    )
    right_items = [
        "Authentication and protected dashboard",
        "Voice and text shopping assistant",
        "Catalog, filters, and recommendation engine",
        "Cart, checkout, and persistence layer",
    ]
    for idx, item in enumerate(right_items):
        slide.add_shape(
            x=inches(7.12),
            y=inches(2.35 + idx * 0.82),
            w=inches(5.05),
            h=inches(0.5),
            fill=COLORS["paper_warm"],
            line=None,
            geom="roundRect",
            text=[item],
            font="Calibri",
            size=1350,
            color=COLORS["ink"],
            align="l",
            valign="ctr",
            inset=(inches(0.12), 0, inches(0.08), 0),
            name=f"Optional Item {idx+1}",
        )
    add_footer(slide, "03")
    return slide


def build_process_slide() -> SlideBuilder:
    slide = SlideBuilder("Process")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.58),
        y=inches(0.72),
        w=inches(4.0),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["How the project works internally"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    slide.add_shape(
        x=inches(0.62),
        y=inches(1.55),
        w=inches(4.55),
        h=inches(4.9),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Narrative Panel",
    )
    lines = [
        "01  User gives input by voice or text",
        "02  Frontend captures the request and sends it forward",
        "03  Backend routes it to product, cart, or AI services",
        "04  AI tools or fallback parser decide the correct action",
        "05  UI updates products, cart, recommendations, or checkout state",
    ]
    for idx, line in enumerate(lines):
        slide.add_shape(
            x=inches(0.9),
            y=inches(1.95 + idx * 0.82),
            w=inches(4.0),
            h=inches(0.48),
            fill=COLORS["blue_soft"] if idx % 2 == 0 else COLORS["paper_warm"],
            line=None,
            geom="roundRect",
            text=[line],
            font="Calibri",
            size=1400,
            color=COLORS["ink"],
            bold=idx == 0,
            valign="ctr",
            inset=(inches(0.12), 0, inches(0.08), 0),
            name=f"Stage {idx+1}",
        )
    slide.add_shape(
        x=inches(0.92),
        y=inches(5.95),
        w=inches(3.8),
        h=inches(0.3),
        fill=None,
        line=None,
        text=["Process-style visual adapted from the uploaded INT428 manual."],
        font="Calibri",
        size=1100,
        color=COLORS["muted"],
        txbox=True,
        name="Note",
    )
    slide.add_shape(
        x=inches(5.8),
        y=inches(1.3),
        w=inches(6.25),
        h=inches(5.35),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Image Frame",
    )
    slide.add_picture(
        "process",
        x=inches(6.05),
        y=inches(1.55),
        w=inches(5.75),
        h=inches(4.95),
        name="INT428 Process Flow",
    )
    add_footer(slide, "04")
    return slide


def build_architecture_slide() -> SlideBuilder:
    slide = SlideBuilder("Architecture")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper_warm"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.58),
        y=inches(0.7),
        w=inches(4.2),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["System architecture and technology roles"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    columns = [
        ("CLIENT", COLORS["navy"], ["React + Vite interface", "Speech hooks + UI state", "Firebase authentication"]),
        ("BACKEND", COLORS["teal"], ["Express APIs", "Controllers + services", "Cart, product, and AI logic"]),
        ("AI LAYER", COLORS["pink"], ["OpenAI chat + tool calling", "Whisper transcription", "Intent parser fallback"]),
        ("DATA", COLORS["green"], ["FakeStore + mock JSON", "Firestore or memory cart", "Browser storage preferences"]),
    ]
    for idx, (label, color, lines) in enumerate(columns):
        x = 0.62 + idx * 3.13
        slide.add_shape(
            x=inches(x),
            y=inches(1.65),
            w=inches(2.75),
            h=inches(4.45),
            fill=COLORS["white"],
            line=COLORS["blue_line"],
            geom="roundRect",
            name=f"Column {idx+1}",
        )
        slide.add_shape(
            x=inches(x + 0.18),
            y=inches(1.88),
            w=inches(1.38),
            h=inches(0.4),
            fill=color,
            geom="roundRect",
            line=None,
            text=[label],
            font="Calibri",
            size=1150,
            color=COLORS["white"],
            bold=True,
            align="ctr",
            valign="ctr",
            inset=(0, 0, 0, 0),
            name=f"Column Label {idx+1}",
        )
        for line_idx, line in enumerate(lines):
            slide.add_shape(
                x=inches(x + 0.18),
                y=inches(2.55 + line_idx * 0.92),
                w=inches(2.35),
                h=inches(0.62),
                fill=COLORS["blue_soft"] if line_idx != 1 else COLORS["paper_warm"],
                line=None,
                geom="roundRect",
                text=[line],
                font="Calibri",
                size=1250,
                color=COLORS["ink"],
                valign="ctr",
                inset=(inches(0.1), 0, inches(0.08), 0),
                name=f"Column {idx+1} Item {line_idx+1}",
            )
        if idx < 3:
            slide.add_shape(
                x=inches(x + 2.78),
                y=inches(3.35),
                w=inches(0.22),
                h=inches(0.12),
                fill=COLORS["slate"],
                line=None,
                name=f"Arrow Line {idx+1}",
            )
            slide.add_shape(
                x=inches(x + 2.97),
                y=inches(3.27),
                w=inches(0.16),
                h=inches(0.28),
                fill=COLORS["slate"],
                line=None,
                geom="chevron",
                name=f"Arrow Head {idx+1}",
            )
    add_footer(slide, "05")
    return slide


def build_features_slide() -> SlideBuilder:
    slide = SlideBuilder("Features")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.58),
        y=inches(0.72),
        w=inches(3.6),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["Main features"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    cards = [
        ("Secure access", COLORS["orange"], "Users enter through Firebase login before reaching the dashboard."),
        ("Voice commands", COLORS["teal"], "Start listening, use continuous mode, and hear spoken replies."),
        ("Manual control", COLORS["navy"], "Typed prompts and quick commands make the demo easy to drive."),
        ("Smart discovery", COLORS["pink"], "Search, filter, and request trending or similar products."),
        ("Cart flow", COLORS["green"], "Add items, remove items, track totals, and simulate checkout."),
        ("Recovery mode", COLORS["slate"], "Fallbacks keep the app usable during network or service failure."),
    ]
    for idx, (title, color, body) in enumerate(cards):
        col = idx % 3
        row = idx // 3
        x = 0.72 + col * 4.15
        y = 1.65 + row * 2.2
        slide.add_shape(
            x=inches(x),
            y=inches(y),
            w=inches(3.62),
            h=inches(1.68),
            fill=COLORS["white"],
            line=COLORS["blue_line"],
            geom="roundRect",
            name=f"Feature Card {idx+1}",
        )
        slide.add_shape(
            x=inches(x + 0.18),
            y=inches(y + 0.18),
            w=inches(1.22),
            h=inches(0.38),
            fill=color,
            line=None,
            geom="roundRect",
            text=[title],
            font="Calibri",
            size=1120,
            color=COLORS["white"],
            bold=True,
            align="ctr",
            valign="ctr",
            inset=(0, 0, 0, 0),
            name=f"Feature Label {idx+1}",
        )
        slide.add_shape(
            x=inches(x + 0.2),
            y=inches(y + 0.72),
            w=inches(3.05),
            h=inches(0.62),
            fill=None,
            line=None,
            text=[body],
            font="Calibri",
            size=1320,
            color=COLORS["ink"],
            txbox=True,
            name=f"Feature Body {idx+1}",
        )
    add_footer(slide, "06")
    return slide


def build_model_slide() -> SlideBuilder:
    slide = SlideBuilder("Model Details")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper_warm"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.58),
        y=inches(0.72),
        w=inches(5.2),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["Technology stack and why I used it"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    slide.add_shape(
        x=inches(0.7),
        y=inches(1.65),
        w=inches(5.7),
        h=inches(4.9),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Left Panel",
    )
    slide.add_shape(
        x=inches(6.6),
        y=inches(1.65),
        w=inches(5.7),
        h=inches(4.9),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Right Panel",
    )
    left_lines = [
        "React 18 + Vite 5 for the frontend interface",
        "Node.js + Express 4 for REST APIs and business logic",
        "Firebase Auth for email/password and Google sign-in",
        "OpenAI gpt-4o-mini + whisper-1 for assistant features",
        "FakeStore API + local mock JSON for product data",
    ]
    right_lines = [
        "React + Vite made the UI fast to build and run locally",
        "Express kept product, cart, and AI routes simple and modular",
        "Firebase gave secure login without building auth from scratch",
        "OpenAI let the assistant trigger real shopping actions with tools",
        "Fallback data sources made the project safer for live demos",
    ]
    slide.add_shape(
        x=inches(0.95),
        y=inches(1.95),
        w=inches(4.8),
        h=inches(0.45),
        fill=COLORS["navy"],
        line=None,
        geom="roundRect",
        text=["CORE TECHNOLOGIES"],
        font="Calibri",
        size=1200,
        color=COLORS["white"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Left Label",
    )
    slide.add_shape(
        x=inches(6.85),
        y=inches(1.95),
        w=inches(4.8),
        h=inches(0.45),
        fill=COLORS["teal"],
        line=None,
        geom="roundRect",
        text=["WHY THEY MATTER"],
        font="Calibri",
        size=1200,
        color=COLORS["white"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Right Label",
    )
    for idx, line in enumerate(left_lines):
        slide.add_shape(
            x=inches(1.0),
            y=inches(2.6 + idx * 0.7),
            w=inches(4.85),
            h=inches(0.45),
            fill=COLORS["paper_warm"] if idx % 2 else COLORS["blue_soft"],
            line=None,
            geom="roundRect",
            text=[line],
            font="Calibri",
            size=1280,
            color=COLORS["ink"],
            valign="ctr",
            inset=(inches(0.1), 0, inches(0.08), 0),
            name=f"Left Item {idx+1}",
        )
    for idx, line in enumerate(right_lines):
        slide.add_shape(
            x=inches(6.9),
            y=inches(2.6 + idx * 0.7),
            w=inches(4.85),
            h=inches(0.45),
            fill=COLORS["paper_warm"] if idx % 2 else COLORS["blue_soft"],
            line=None,
            geom="roundRect",
            text=[line],
            font="Calibri",
            size=1280,
            color=COLORS["ink"],
            valign="ctr",
            inset=(inches(0.1), 0, inches(0.08), 0),
            name=f"Right Item {idx+1}",
        )
    add_footer(slide, "07")
    return slide


def build_ui_slide() -> SlideBuilder:
    slide = SlideBuilder("UI")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.58),
        y=inches(0.72),
        w=inches(4.0),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["Application screens"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    slide.add_shape(
        x=inches(0.72),
        y=inches(1.45),
        w=inches(8.0),
        h=inches(4.95),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Desktop Frame",
    )
    slide.add_picture(
        "desktop",
        x=inches(0.92),
        y=inches(1.7),
        w=inches(7.6),
        h=inches(4.45),
        name="Desktop Screenshot",
    )
    slide.add_shape(
        x=inches(8.95),
        y=inches(2.05),
        w=inches(2.18),
        h=inches(4.25),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Mobile Frame",
    )
    slide.add_picture(
        "mobile",
        x=inches(9.12),
        y=inches(2.22),
        w=inches(1.85),
        h=inches(4.0),
        name="Mobile Screenshot",
    )
    for idx, label in enumerate(
        ["Desktop view", "Mobile view", "Live project proof"]
    ):
        slide.add_shape(
            x=inches(0.85 + idx * 2.55),
            y=inches(6.05),
            w=inches(2.2),
            h=inches(0.42),
            fill=[COLORS["navy"], COLORS["teal"], COLORS["pink"]][idx],
            line=None,
            geom="roundRect",
            text=[label],
            font="Calibri",
            size=1120,
            color=COLORS["white"],
            bold=True,
            align="ctr",
            valign="ctr",
            inset=(0, 0, 0, 0),
            name=f"UI Chip {idx+1}",
        )
    add_footer(slide, "08")
    return slide


def build_stack_slide() -> SlideBuilder:
    slide = SlideBuilder("Stack")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper_warm"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.58),
        y=inches(0.72),
        w=inches(4.3),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["What makes the project special"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    stats = [
        ("Voice", "natural user input", COLORS["navy"]),
        ("AI", "smart action handling", COLORS["orange"]),
        ("Fallback", "better reliability", COLORS["teal"]),
    ]
    for idx, (num, label, color) in enumerate(stats):
        slide.add_shape(
            x=inches(0.8 + idx * 2.65),
            y=inches(1.65),
            w=inches(2.25),
            h=inches(1.15),
            fill=color,
            line=None,
            geom="roundRect",
            text=[num, label],
            font="Calibri",
            size=2200 if idx == 0 else 1800,
            color=COLORS["white"],
            bold=True,
            align="ctr",
            valign="ctr",
            inset=(0, inches(0.05), 0, 0),
            name=f"Stat {idx+1}",
        )
    stacks = [
        ("Strength 1", COLORS["navy"], "Users can interact through both voice and manual text commands."),
        ("Strength 2", COLORS["teal"], "Fallback logic keeps the app running if speech or AI services fail."),
        ("Strength 3", COLORS["pink"], "The project connects UI, backend, auth, data, and AI in one flow."),
        ("Strength 4", COLORS["green"], "The app is structured for classroom demo and real feature explanation."),
    ]
    for idx, (title, color, line) in enumerate(stacks):
        col = idx % 2
        row = idx // 2
        x = 0.82 + col * 5.95
        y = 3.25 + row * 1.45
        slide.add_shape(
            x=inches(x),
            y=inches(y),
            w=inches(5.15),
            h=inches(0.95),
            fill=COLORS["white"],
            line=COLORS["blue_line"],
            geom="roundRect",
            name=f"Stack Card {idx+1}",
        )
        slide.add_shape(
            x=inches(x + 0.18),
            y=inches(y + 0.2),
            w=inches(1.05),
            h=inches(0.36),
            fill=color,
            line=None,
            geom="roundRect",
            text=[title],
            font="Calibri",
            size=1120,
            color=COLORS["white"],
            bold=True,
            align="ctr",
            valign="ctr",
            inset=(0, 0, 0, 0),
            name=f"Stack Label {idx+1}",
        )
        slide.add_shape(
            x=inches(x + 1.38),
            y=inches(y + 0.16),
            w=inches(3.45),
            h=inches(0.45),
            fill=None,
            line=None,
            text=[line],
            font="Calibri",
            size=1280,
            color=COLORS["ink"],
            txbox=True,
            name=f"Stack Body {idx+1}",
        )
    add_footer(slide, "09")
    return slide


def build_evaluation_slide() -> SlideBuilder:
    slide = SlideBuilder("Evaluation")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["paper"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.58),
        y=inches(0.72),
        w=inches(5.2),
        h=inches(0.5),
        fill=None,
        line=None,
        text=["Live demo plan"],
        font="Calibri Light",
        size=2300,
        color=COLORS["ink"],
        bold=True,
        txbox=True,
        name="Title",
    )
    slide.add_shape(
        x=inches(0.72),
        y=inches(1.6),
        w=inches(5.85),
        h=inches(4.9),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Strengths",
    )
    slide.add_shape(
        x=inches(6.72),
        y=inches(1.6),
        w=inches(5.45),
        h=inches(4.9),
        fill=COLORS["white"],
        line=COLORS["blue_line"],
        geom="roundRect",
        name="Gaps",
    )
    slide.add_shape(
        x=inches(0.95),
        y=inches(1.86),
        w=inches(1.6),
        h=inches(0.4),
        fill=COLORS["green"],
        geom="roundRect",
        line=None,
        text=["WHAT I WILL SHOW"],
        font="Calibri",
        size=1120,
        color=COLORS["white"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Strengths Label",
    )
    strengths = [
        "Login and protected entry into the dashboard",
        "Product search through voice or typed command",
        "Add to cart, view totals, and remove item",
        "Checkout flow and final confirmation state",
    ]
    for idx, item in enumerate(strengths):
        slide.add_shape(
            x=inches(0.98),
            y=inches(2.45 + idx * 0.82),
            w=inches(5.15),
            h=inches(0.52),
            fill=COLORS["paper_warm"] if idx % 2 else COLORS["blue_soft"],
            line=None,
            geom="roundRect",
            text=[item],
            font="Calibri",
            size=1300,
            color=COLORS["ink"],
            valign="ctr",
            inset=(inches(0.1), 0, inches(0.08), 0),
            name=f"Strength {idx+1}",
        )
    slide.add_shape(
        x=inches(6.95),
        y=inches(1.86),
        w=inches(1.35),
        h=inches(0.4),
        fill=COLORS["amber"],
        geom="roundRect",
        line=None,
        text=["WHAT IT PROVES"],
        font="Calibri",
        size=1120,
        color=COLORS["ink"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Gaps Label",
    )
    gaps = [
        "The project has secure authentication and clear user flow",
        "The assistant is connected to real shopping actions, not only chat",
        "Frontend and backend state stay synchronized during interactions",
        "The application is complete enough for full end-to-end explanation",
    ]
    for idx, item in enumerate(gaps):
        slide.add_shape(
            x=inches(7.0),
            y=inches(2.45 + idx * 0.82),
            w=inches(4.7),
            h=inches(0.52),
            fill="FCEFE8" if idx % 2 == 0 else "FFF7E2",
            line=None,
            geom="roundRect",
            text=[item],
            font="Calibri",
            size=1300,
            color=COLORS["ink"],
            valign="ctr",
            inset=(inches(0.1), 0, inches(0.08), 0),
            name=f"Gap {idx+1}",
        )
    add_footer(slide, "10")
    return slide


def build_close_slide() -> SlideBuilder:
    slide = SlideBuilder("Close")
    slide.add_shape(x=0, y=0, w=SLIDE_W, h=SLIDE_H, fill=COLORS["navy_dark"], line=None, name="BG")
    slide.add_shape(
        x=inches(0.8),
        y=inches(0.88),
        w=inches(2.1),
        h=inches(0.45),
        fill=COLORS["orange"],
        geom="roundRect",
        line=None,
        text=["CONCLUSION"],
        font="Calibri",
        size=1200,
        color=COLORS["white"],
        bold=True,
        align="ctr",
        valign="ctr",
        inset=(0, 0, 0, 0),
        name="Close Label",
    )
    slide.add_shape(
        x=inches(0.8),
        y=inches(1.75),
        w=inches(6.0),
        h=inches(1.7),
        fill=None,
        line=None,
        text=["Powered Shopping", "A smarter and more natural shopping experience"],
        font="Calibri Light",
        size=2650,
        color=COLORS["white"],
        bold=True,
        txbox=True,
        name="Close Title",
    )
    slide.add_shape(
        x=inches(0.82),
        y=inches(3.65),
        w=inches(5.8),
        h=inches(1.0),
        fill=None,
        line=None,
        text=[
            "This project combines AI, voice interaction, and full-stack development.",
            "It shows how technology can improve shopping while staying reliable and demo-ready.",
        ],
        font="Calibri",
        size=1500,
        color=COLORS["blue_soft"],
        txbox=True,
        name="Close Subtitle",
    )
    slide.add_shape(
        x=inches(8.1),
        y=inches(1.2),
        w=inches(3.4),
        h=inches(3.9),
        fill=COLORS["white"],
        fill_alpha=14000,
        line=COLORS["white"],
        line_alpha=28000,
        geom="roundRect",
        name="Right Card",
    )
    right_lines = ["Questions", "Project flow", "Technology used", "Live demo", "Future scope"]
    for idx, line in enumerate(right_lines):
        slide.add_shape(
            x=inches(8.45),
            y=inches(1.6 + idx * 0.6),
            w=inches(2.75),
            h=inches(0.4),
            fill=COLORS["white"],
            fill_alpha=14000,
            line=None,
            geom="roundRect",
            text=[line],
            font="Calibri",
            size=1320,
            color=COLORS["white"],
            bold=idx == 0,
            align="ctr",
            valign="ctr",
            inset=(0, 0, 0, 0),
            name=f"Close Item {idx+1}",
        )
    slide.add_shape(
        x=inches(0.82),
        y=inches(6.2),
        w=inches(3.0),
        h=inches(0.26),
        fill=None,
        line=None,
        text=["Powered Shopping | Classroom presentation version"],
        font="Calibri",
        size=1100,
        color=COLORS["blue_soft"],
        txbox=True,
        name="Footer",
    )
    return slide


def build_slides() -> list[SlideBuilder]:
    return [
        build_cover(),
        build_problem_slide(),
        build_scope_slide(),
        build_process_slide(),
        build_architecture_slide(),
        build_features_slide(),
        build_model_slide(),
        build_ui_slide(),
        build_stack_slide(),
        build_evaluation_slide(),
        build_close_slide(),
    ]


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
        + f"<p:sldSz cx=\"{SLIDE_W}\" cy=\"{SLIDE_H}\"/>"
        + "<p:notesSz cx=\"7103745\" cy=\"10234295\"/>"
        + "<p:defaultTextStyle><a:defPPr><a:defRPr lang=\"en-US\"/></a:defPPr></p:defaultTextStyle>"
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
        + "<Default Extension=\"png\" ContentType=\"image/png\"/>"
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


def write_archive(source_dir: Path, output_file: Path) -> None:
    with zipfile.ZipFile(output_file, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_dir():
                continue
            archive.write(path, path.relative_to(source_dir).as_posix())


def generate() -> Path:
    if not TEMPLATE.exists():
        raise FileNotFoundError(f"Template not found: {TEMPLATE}")

    for asset in ASSETS.values():
        if not asset.exists():
            raise FileNotFoundError(f"Missing presentation asset: {asset}")

    slides = build_slides()
    media_targets = media_registry()

    with tempfile.TemporaryDirectory(prefix="powered-shopping-styled-pptx-") as tmp:
        workdir = Path(tmp)
        with zipfile.ZipFile(TEMPLATE) as archive:
            archive.extractall(workdir)

        slides_dir = workdir / "ppt" / "slides"
        rels_dir = slides_dir / "_rels"
        media_dir = workdir / "ppt" / "media"
        media_dir.mkdir(exist_ok=True)

        for path in slides_dir.glob("slide*.xml"):
            path.unlink()
        for path in rels_dir.glob("slide*.xml.rels"):
            path.unlink()

        for key, target_name in media_targets.items():
            shutil.copyfile(ASSETS[key], media_dir / target_name)

        for index, slide in enumerate(slides, start=1):
            slide_xml, rels_xml = slide.render(media_targets)
            (slides_dir / f"slide{index}.xml").write_text(slide_xml, encoding="utf-8")
            (rels_dir / f"slide{index}.xml.rels").write_text(rels_xml, encoding="utf-8")

        (workdir / "ppt" / "presentation.xml").write_text(
            presentation_xml(len(slides)),
            encoding="utf-8",
        )
        (workdir / "ppt" / "_rels" / "presentation.xml.rels").write_text(
            presentation_rels_xml(len(slides)),
            encoding="utf-8",
        )
        (workdir / "[Content_Types].xml").write_text(
            content_types_xml(len(slides)),
            encoding="utf-8",
        )

        if OUTPUT.exists():
            OUTPUT.unlink()
        write_archive(workdir, OUTPUT)

    return OUTPUT


if __name__ == "__main__":
    deck = generate()
    print(deck)
