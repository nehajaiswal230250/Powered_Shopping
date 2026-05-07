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
