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
