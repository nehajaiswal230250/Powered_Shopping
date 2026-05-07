import fs from "node:fs";
import path from "node:path";

const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN_X = 44;
const MARGIN_BOTTOM = 44;
const BODY_START_Y = 84;
const BODY_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const FONT_REGULAR = "F1";
const FONT_BOLD = "F2";

const COLORS = {
  bg: [0.972, 0.98, 0.988],
  header: [0.055, 0.184, 0.318],
  accent: [0.086, 0.62, 0.62],
  titleLight: [0.95, 0.98, 1],
  sectionChip: [0.89, 0.94, 0.99],
  sectionChipEdge: [0.086, 0.62, 0.62],
  text: [0.176, 0.215, 0.266],
  muted: [0.38, 0.44, 0.5],
  white: [1, 1, 1]
};

const INPUT_FILE = path.resolve("docs/USER_INTERFACE_GUIDE.md");
const OUTPUT_FILE = path.resolve("docs/USER_INTERFACE_GUIDE_DESIGNED.pdf");

const raw = fs.readFileSync(INPUT_FILE, "utf8").replace(/\r\n/g, "\n");

const escapePdfText = (text) =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const textWidthApprox = (text, fontSize, bold = false) =>
  text.length * fontSize * (bold ? 0.54 : 0.5);

const wrapText = (text, maxWidth, fontSize, bold = false) => {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return [""];
  }

  const lines = [];
  let current = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (textWidthApprox(next, fontSize, bold) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }

  lines.push(current);
  return lines;
};

const tokens = [];
const sections = [];
let activeSection = null;

for (const rawLine of raw.split("\n")) {
  const line = rawLine.trimEnd();

  if (line.startsWith("# ")) {
    tokens.push({ type: "doc-title", text: line.replace(/^#\s+/, "").trim() });
    continue;
  }

  if (line.startsWith("## ")) {
    activeSection = {
      title: line.replace(/^##\s+/, "").trim(),
      items: []
    };
    sections.push(activeSection);
    continue;
  }

  if (!line.trim()) {
    if (activeSection) {
      activeSection.items.push({ type: "space" });
    } else {
      tokens.push({ type: "space" });
    }
    continue;
  }

  const bullet = line.match(/^\-\s+(.+)$/);
  if (bullet) {
    if (activeSection) {
      activeSection.items.push({ type: "bullet", text: bullet[1].trim() });
    } else {
      tokens.push({ type: "meta", text: bullet[1].trim() });
    }
    continue;
  }

  const numbered = line.match(/^(\d+)\.\s+(.+)$/);
  if (numbered) {
    if (activeSection) {
      activeSection.items.push({
        type: "number",
        index: numbered[1],
        text: numbered[2].trim()
      });
    } else {
      tokens.push({ type: "meta", text: line.trim() });
    }
    continue;
  }

  if (activeSection) {
    activeSection.items.push({ type: "paragraph", text: line.trim() });
  } else {
    tokens.push({ type: "meta", text: line.trim() });
  }
}

const pages = [];
let currentPage = null;
let y = BODY_START_Y;

const pushCommand = (cmd) => {
  currentPage.commands.push(cmd);
};

const drawRect = (x, yTop, w, h, rgb) => {
  const yBottom = PAGE_HEIGHT - yTop - h;
  pushCommand(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg`);
  pushCommand(`${x} ${yBottom} ${w} ${h} re f`);
};

const drawText = ({
  text,
  x,
  yTop,
  size = 11,
  font = FONT_REGULAR,
  rgb = COLORS.text
}) => {
  const yPdf = PAGE_HEIGHT - yTop;
  pushCommand("BT");
  pushCommand(`/${font} ${size} Tf`);
  pushCommand(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg`);
  pushCommand(`1 0 0 1 ${x} ${yPdf} Tm`);
  pushCommand(`(${escapePdfText(text)}) Tj`);
  pushCommand("ET");
};

const drawHeader = (pageNumber) => {
  drawRect(0, 0, PAGE_WIDTH, 54, COLORS.header);
  drawRect(0, 50, PAGE_WIDTH, 4, COLORS.accent);

  drawText({
    text: "Powered Shopping  |  User Interaction Guide",
    x: MARGIN_X,
    yTop: 32,
    size: 12,
    font: FONT_BOLD,
    rgb: COLORS.titleLight
  });

  drawText({
    text: `Page ${pageNumber}`,
    x: PAGE_WIDTH - MARGIN_X - 48,
    yTop: 32,
    size: 10,
    font: FONT_REGULAR,
    rgb: COLORS.titleLight
  });
};

const addPage = (kind = "content") => {
  currentPage = { commands: [], kind };
  pages.push(currentPage);

  if (kind === "cover") {
    y = 0;
    return;
  }

  drawRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.bg);
  drawHeader(pages.length);
  y = BODY_START_Y;
};

const ensureSpace = (heightNeeded) => {
  const usableBottom = PAGE_HEIGHT - MARGIN_BOTTOM;
  if (y + heightNeeded > usableBottom) {
    addPage("content");
  }
};

const drawSectionTitle = (title) => {
  ensureSpace(30);
  drawRect(MARGIN_X - 4, y - 16, BODY_WIDTH + 8, 24, COLORS.sectionChip);
  drawRect(MARGIN_X - 4, y - 16, 6, 24, COLORS.sectionChipEdge);
  drawText({
    text: title,
    x: MARGIN_X + 10,
    yTop: y,
    size: 13,
    font: FONT_BOLD,
    rgb: COLORS.header
  });
  y += 28;
};

const drawParagraph = (text) => {
  const lines = wrapText(text, BODY_WIDTH - 8, 11, false);
  ensureSpace(lines.length * 16 + 4);
  for (const line of lines) {
    drawText({
      text: line,
      x: MARGIN_X + 4,
      yTop: y,
      size: 11,
      font: FONT_REGULAR,
      rgb: COLORS.text
    });
    y += 15;
  }
  y += 2;
};

const drawBullet = (text) => {
  const bulletX = MARGIN_X + 8;
  const textX = MARGIN_X + 20;
  const lines = wrapText(text, BODY_WIDTH - 26, 11, false);
  ensureSpace(lines.length * 16 + 4);

  drawRect(bulletX, y - 8, 5, 5, COLORS.accent);
  drawText({
    text: lines[0],
    x: textX,
    yTop: y,
    size: 11,
    font: FONT_REGULAR,
    rgb: COLORS.text
  });
  y += 15;

  for (let i = 1; i < lines.length; i += 1) {
    drawText({
      text: lines[i],
      x: textX,
      yTop: y,
      size: 11,
      font: FONT_REGULAR,
      rgb: COLORS.text
    });
    y += 15;
  }
  y += 1;
};

const drawNumbered = (index, text) => {
  const prefix = `${index}.`;
  const prefixWidth = textWidthApprox(prefix, 11, true) + 8;
  const lines = wrapText(text, BODY_WIDTH - 8 - prefixWidth, 11, false);
  ensureSpace(lines.length * 16 + 4);

  drawText({
    text: prefix,
    x: MARGIN_X + 4,
    yTop: y,
    size: 11,
    font: FONT_BOLD,
    rgb: COLORS.header
  });

  drawText({
    text: lines[0],
    x: MARGIN_X + 4 + prefixWidth,
    yTop: y,
    size: 11,
    font: FONT_REGULAR,
    rgb: COLORS.text
  });
  y += 15;

  for (let i = 1; i < lines.length; i += 1) {
    drawText({
      text: lines[i],
      x: MARGIN_X + 4 + prefixWidth,
      yTop: y,
      size: 11,
      font: FONT_REGULAR,
      rgb: COLORS.text
    });
    y += 15;
  }
  y += 1;
};

// Cover page
addPage("cover");
drawRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, COLORS.header);
drawRect(0, 0, PAGE_WIDTH, 10, COLORS.accent);
drawRect(0, PAGE_HEIGHT - 26, PAGE_WIDTH, 26, COLORS.accent);
drawRect(MARGIN_X, 174, PAGE_WIDTH - MARGIN_X * 2, 2, COLORS.accent);

const titleToken = tokens.find((t) => t.type === "doc-title");
const titleText = titleToken?.text || "Powered Shopping";

drawText({
  text: titleText,
  x: MARGIN_X,
  yTop: 210,
  size: 33,
  font: FONT_BOLD,
  rgb: COLORS.white
});

drawText({
  text: "User Interface Interaction Guide",
  x: MARGIN_X,
  yTop: 248,
  size: 19,
  font: FONT_REGULAR,
  rgb: COLORS.titleLight
});

drawText({
  text: "A visual walkthrough of how users interact with the app",
  x: MARGIN_X,
  yTop: 286,
  size: 12,
  font: FONT_REGULAR,
  rgb: COLORS.titleLight
});

let coverMetaY = 344;
for (const token of tokens) {
  if (token.type !== "meta") continue;
  drawText({
    text: token.text,
    x: MARGIN_X,
    yTop: coverMetaY,
    size: 11,
    font: FONT_REGULAR,
    rgb: COLORS.titleLight
  });
  coverMetaY += 18;
}

drawText({
  text: "Designed report version generated automatically",
  x: MARGIN_X,
  yTop: PAGE_HEIGHT - 70,
  size: 10,
  font: FONT_REGULAR,
  rgb: COLORS.titleLight
});

// Content pages
addPage("content");

for (const section of sections) {
  drawSectionTitle(section.title);

  for (const item of section.items) {
    if (item.type === "space") {
      y += 8;
      continue;
    }
    if (item.type === "paragraph") {
      drawParagraph(item.text);
      continue;
    }
    if (item.type === "bullet") {
      drawBullet(item.text);
      continue;
    }
    if (item.type === "number") {
      drawNumbered(item.index, item.text);
    }
  }
  y += 10;
}

// Build PDF objects
const objects = [];
const addObject = (content) => {
  objects.push(content);
  return objects.length;
};

const fontRegularId = addObject(
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
);
const fontBoldId = addObject(
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
);
const pagesId = addObject("");
const pageObjectIds = [];

for (const page of pages) {
  const streamContent = page.commands.join("\n");
  const contentId = addObject(
    `<< /Length ${Buffer.byteLength(streamContent, "utf8")} >>\nstream\n${streamContent}\nendstream`
  );

  const pageId = addObject(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /${FONT_REGULAR} ${fontRegularId} 0 R /${FONT_BOLD} ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`
  );
  pageObjectIds.push(pageId);
}

objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageObjectIds
  .map((id) => `${id} 0 R`)
  .join(" ")}] /Count ${pageObjectIds.length} >>`;

const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
const offsets = [0];

for (let i = 0; i < objects.length; i += 1) {
  offsets.push(Buffer.byteLength(pdf, "binary"));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}

const xrefStart = Buffer.byteLength(pdf, "binary");
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (let i = 1; i <= objects.length; i += 1) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

fs.writeFileSync(OUTPUT_FILE, pdf, "binary");
console.log(`Created ${OUTPUT_FILE} (${pages.length} pages).`);
