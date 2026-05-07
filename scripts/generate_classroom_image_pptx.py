from __future__ import annotations

import shutil
import tempfile
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path(
    "/Applications/wpsoffice.app/Contents/Resources/office6/addons/knewdocs/res/blanktemplate/normal_mac.pptx"
)
OUTPUT = ROOT / "docs" / "Powered_Shopping_Classroom_Deck_FIXED.pptx"
ASSET_DIR = ROOT / "presentation_assets"
SLIDE_COUNT = 11

XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
SLIDE_W = 12192000
SLIDE_H = 6858000


def slide_xml(rel_id: str) -> str:
    return (
        XML_HEADER
        + "<p:sld xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" "
        + "xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" "
        + "xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\">"
        + "<p:cSld><p:spTree>"
        + "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>"
        + "<p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/><a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr>"
        + "<p:pic>"
        + "<p:nvPicPr><p:cNvPr id=\"2\" name=\"SlideImage\" descr=\"SlideImage\"/>"
        + "<p:cNvPicPr><a:picLocks noChangeAspect=\"1\"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>"
        + f"<p:blipFill><a:blip r:embed=\"{rel_id}\"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>"
        + f"<p:spPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"{SLIDE_W}\" cy=\"{SLIDE_H}\"/></a:xfrm>"
        + "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></p:spPr>"
        + "</p:pic>"
        + "</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>"
    )


def slide_rels_xml(image_name: str) -> str:
    return (
        XML_HEADER
        + "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        + "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout\" Target=\"../slideLayouts/slideLayout7.xml\"/>"
        + f"<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/image\" Target=\"../media/{image_name}\"/>"
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

    image_paths = [ASSET_DIR / f"classroom_slide_{i}.png" for i in range(1, SLIDE_COUNT + 1)]
    missing = [str(p) for p in image_paths if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing slide images: " + ", ".join(missing))

    with tempfile.TemporaryDirectory(prefix="powered-shopping-image-pptx-") as tmp:
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

        for index, image_path in enumerate(image_paths, start=1):
            target_name = f"image_slide_{index}.png"
            shutil.copyfile(image_path, media_dir / target_name)
            (slides_dir / f"slide{index}.xml").write_text(slide_xml("rId2"), encoding="utf-8")
            (rels_dir / f"slide{index}.xml.rels").write_text(
                slide_rels_xml(target_name),
                encoding="utf-8",
            )

        (workdir / "ppt" / "presentation.xml").write_text(
            presentation_xml(SLIDE_COUNT),
            encoding="utf-8",
        )
        (workdir / "ppt" / "_rels" / "presentation.xml.rels").write_text(
            presentation_rels_xml(SLIDE_COUNT),
            encoding="utf-8",
        )
        (workdir / "[Content_Types].xml").write_text(
            content_types_xml(SLIDE_COUNT),
            encoding="utf-8",
        )

        if OUTPUT.exists():
            OUTPUT.unlink()
        write_archive(workdir, OUTPUT)

    return OUTPUT


if __name__ == "__main__":
    deck = generate()
    print(deck)
