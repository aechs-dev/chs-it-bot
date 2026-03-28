/**
 * core/document-generator.js
 * CHS.ai — Word Document Generator v3
 *
 * DOCUMENT TYPES & BEHAVIOR:
 *   test        → prepend Test_Cover_Page.docx  | no header | no title
 *   exam        → prepend Exam_Cover_Page.docx  | no header | no title
 *   quiz        → prepend Quiz_Title_Page.docx  | no header | no title
 *   worksheet   → no cover | no header | title at top
 *   lesson_plan → no cover | no header | title at top
 *   letter      → no cover | no header | title at top
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, ShadingType, LevelFormat,
  UnderlineType, Footer
} = require('docx');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const OUTPUT_DIR = path.join(__dirname, '..', 'generated_docs');
const COVER_DIR  = path.join(__dirname, '..', 'assets', 'Cover Pages');

// Debug: log resolved paths once
console.log('[CHS.ai] Cover dir:', COVER_DIR);
console.log('[CHS.ai] Files exist:',
  Object.entries({
    test: path.join(COVER_DIR, 'Test_Cover_Page.docx'),
    exam: path.join(COVER_DIR, 'Exam_Cover_Page.docx'),
    quiz: path.join(COVER_DIR, 'Quiz_Title_Page.docx'),
  }).map(([k,v]) => k + '=' + fs.existsSync(v)).join(', ')
);

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Cover page paths ──────────────────────────────────────────────────────────
const COVER_PAGES = {
  test: path.join(COVER_DIR, 'Test_Cover_Page.docx'),
  exam: path.join(COVER_DIR, 'Exam_Cover_Page.docx'),
  quiz: path.join(COVER_DIR, 'Quiz_Title_Page.docx'),
};

// ── Colors ────────────────────────────────────────────────────────────────────
const DKGREEN = '1f5e2e';
const MDGREEN = '2f7d3b';
const LGGREEN = 'dfeee2';
const WHITE   = 'FFFFFF';
const GRAY    = '888888';
const BLACK   = '000000';

// ── Page sizing (A4, 2.5cm margins) ──────────────────────────────────────────
const MARGIN    = 720;    // Narrow margins (1.27cm / 0.5in)
const CONTENT_W = 10466;  // 11906 - 720*2
const CONTENT_L = 15398;  // 16838 - 720*2

// ── Borders ───────────────────────────────────────────────────────────────────
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: 'c8e0c4' };
const allThin    = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder   = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders  = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Numbering ─────────────────────────────────────────────────────────────────
const NUMBERING = {
  config: [{
    reference: 'bullets',
    levels: [{
      level: 0, format: LevelFormat.BULLET, text: '•',
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  }]
};

// ── Text helpers ──────────────────────────────────────────────────────────────
function t(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Times New Roman', size: 24, ...opts });
}
function a(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Arial', size: 24, ...opts });
}
function b(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: 'Arial', size: 24, bold: true, ...opts });
}
function spacer(before = 120) {
  return new Paragraph({ children: [t('')], spacing: { before, after: 0 } });
}

// ── Markdown inline parser ────────────────────────────────────────────────────
function parseInline(str, baseOpts = {}) {
  const tokens = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0, match;
  while ((match = regex.exec(str)) !== null) {
    if (match.index > last) tokens.push({ text: str.slice(last, match.index), bold: false, italic: false });
    if (match[1] !== undefined) tokens.push({ text: match[1], bold: true,  italic: false });
    else                        tokens.push({ text: match[2], bold: false, italic: true  });
    last = regex.lastIndex;
  }
  if (last < str.length) tokens.push({ text: str.slice(last), bold: false, italic: false });
  if (tokens.length === 0) return [t(str, baseOpts)];
  return tokens.map(tok => new TextRun({
    text:    tok.text,
    font:    baseOpts.font    || 'Times New Roman',
    size:    baseOpts.size    || 24,
    color:   baseOpts.color   || BLACK,
    bold:    tok.bold   || baseOpts.bold    || false,
    italics: tok.italic || baseOpts.italics || false,
  }));
}

// ── Detect Arabic ─────────────────────────────────────────────────────────────
function hasArabic(str) { return /[\u0600-\u06FF]/.test(str); }

// ── Page props ────────────────────────────────────────────────────────────────
function pageProps(landscape = false) {
  return landscape
    ? { size: { width: 16838, height: 11906 }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } }
    : { size: { width: 11906, height: 16838 }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } };
}
function contentWidth(landscape = false) { return landscape ? CONTENT_L : CONTENT_W; }

// ── Section header: dark green bar, white bold text ───────────────────────────
function sectionHeader(label, landscape = false) {
  const cw = contentWidth(landscape);
  const isAr = hasArabic(label);
  return new Table({
    width: { size: cw, type: WidthType.DXA }, columnWidths: [cw],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorders,
      width: { size: cw, type: WidthType.DXA },
      shading: { fill: DKGREEN, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 180, right: 180 },
      children: [new Paragraph({
        children: [new TextRun({ text: label, font: isAr ? 'Arial' : 'Arial', size: 22, bold: true, color: WHITE })],
        alignment: isAr ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        ...(isAr ? { bidi: true } : {})
      })]
    })] })]
  });
}

// ── Section content wrapper ───────────────────────────────────────────────────
function sectionContent(lines, landscape = false) {
  const cw = contentWidth(landscape);
  return new Table({
    width: { size: cw, type: WidthType.DXA }, columnWidths: [cw],
    rows: [new TableRow({ children: [new TableCell({
      borders: noBorders,
      width: { size: cw, type: WidthType.DXA },
      shading: { fill: WHITE, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 180, right: 180 },
      children: lines
    })] })]
  });
}

// ── Bullet ────────────────────────────────────────────────────────────────────
function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    children: parseInline(text),
    spacing: { before: 40, after: 40 }
  });
}

// ── Footer ────────────────────────────────────────────────────────────────────
function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'c8e0c4', space: 4 } },
      children: [a('AECHS — Academic Year 2025–2026  |  Generated by CHS.ai', { size: 16, color: GRAY })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 0 }
    })]
  });
}

// ── Render one content line ───────────────────────────────────────────────────
function renderLine(s) {
  const isOption    = /^[a-d]\)/i.test(s.trim());
  const isBlankLine = /^_{5,}/.test(s.trim());
  const isMathStep  = /^\s*→/.test(s);
  const isArabic    = hasArabic(s);

  const runs = (isBlankLine || isArabic)
    ? [t(s, { size: isOption ? 22 : 24, color: isBlankLine ? 'aaaaaa' : BLACK, font: isArabic ? 'Arial' : 'Times New Roman' })]
    : parseInline(s, { size: isOption ? 22 : 24 });

  return new Paragraph({
    children: runs,
    indent: (isOption || isMathStep) ? { left: 560 } : undefined,
    alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { before: isOption ? 20 : 80, after: isOption ? 20 : 60 },
    keepLines: true,
    ...(isArabic ? { bidi: true } : {})
  });
}

// ── Render one content line for Quiz (Times New Roman, 11pt questions, 12pt instructions) ──
function renderLineQuiz(s) {
  const isOption    = /^[a-d]\)/i.test(s.trim());
  const isBlankLine = /^_{5,}/.test(s.trim());
  const isMathStep  = /^\s*→/.test(s);
  const isArabic    = hasArabic(s);

  const runs = (isBlankLine || isArabic)
    ? [t(s, { size: isOption ? 20 : 22, color: isBlankLine ? 'aaaaaa' : BLACK, font: isArabic ? 'Arial' : 'Times New Roman' })]
    : parseInline(s, { size: isOption ? 20 : 22, font: 'Times New Roman' });

  return new Paragraph({
    children: runs,
    indent: (isOption || isMathStep) ? { left: 560 } : undefined,
    alignment: isArabic ? AlignmentType.RIGHT : AlignmentType.LEFT,
    spacing: { before: isOption ? 20 : 60, after: isOption ? 20 : 40 },
    keepLines: true,
    ...(isArabic ? { bidi: true } : {})
  });
}

// ── Table builder ─────────────────────────────────────────────────────────────
function buildTable(tableSpec, landscape = false) {
  const { headers = [], rows = [], caption = '' } = tableSpec;
  const cw = contentWidth(landscape);
  const colCount = headers.length || (rows[0] ? rows[0].length : 1);
  const colWidth = Math.floor(cw / colCount);
  const colWidths = Array(colCount).fill(colWidth);
  colWidths[colCount - 1] += cw - colWidth * colCount;

  const headerRow = new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders: allThin,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: DKGREEN, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [b(h, { color: WHITE, size: 20 })], spacing: { before: 0, after: 0 } })]
    }))
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => {
      const lines = Array.isArray(cell) ? cell : [cell];
      return new TableCell({
        borders: allThin,
        width: { size: colWidths[ci], type: WidthType.DXA },
        shading: { fill: ri % 2 === 0 ? LGGREEN : WHITE, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: lines.map(line =>
          new Paragraph({ children: [t(String(line || ''), { size: 20 })], spacing: { before: 20, after: 20 } })
        )
      });
    })
  }));

  const result = [new Table({
    width: { size: cw, type: WidthType.DXA }, columnWidths: colWidths,
    rows: headers.length ? [headerRow, ...dataRows] : dataRows
  })];
  if (caption) result.push(new Paragraph({
    children: [t(caption, { size: 18, italics: true, color: GRAY })],
    alignment: AlignmentType.CENTER, spacing: { before: 80, after: 0 }
  }));
  return result;
}

// ── Clean cover: strip trailing empty paragraphs that cause blank page ────────
function cleanDocxTrailingParas(srcPath, dstPath) {
  // Pure Node.js — strips trailing empty paragraphs that cause blank pages
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(srcPath);
  const entry = zip.getEntry('word/document.xml');
  let xml = entry.getData().toString('utf8');

  const sectStart = xml.lastIndexOf('<w:sectPr');
  if (sectStart === -1) { zip.writeZip(dstPath); return; }

  const beforeSect = xml.slice(0, sectStart);

  // Find last table end
  const lastTbl = beforeSect.lastIndexOf('</w:tbl>');
  const lastTblEnd = lastTbl >= 0 ? lastTbl + '</w:tbl>'.length : -1;

  // Find last paragraph with REAL content (has a run, drawing, pict, or textbox)
  let lastContentPEnd = -1;
  let pos = 0;
  while (true) {
    const pStart = beforeSect.indexOf('<w:p', pos);
    if (pStart === -1) break;
    const pEnd = beforeSect.indexOf('</w:p>', pStart);
    if (pEnd === -1) break;
    const pChunk = beforeSect.slice(pStart, pEnd + 6);
    const hasContent = pChunk.includes('</w:r>') ||
                       pChunk.includes('</w:pict>') ||
                       pChunk.includes('</w:drawing>') ||
                       pChunk.includes('</v:shape>') ||
                       pChunk.includes('</mc:AlternateContent>');
    if (hasContent) lastContentPEnd = pEnd + 6;
    pos = pEnd + 6;
  }

  // Cut point = end of last real content (table or paragraph)
  const cutPoint = Math.max(lastTblEnd, lastContentPEnd);

  if (cutPoint > 0 && cutPoint < sectStart) {
    xml = xml.slice(0, cutPoint) + xml.slice(sectStart);
    zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
    console.log(`[CHS.ai] Stripped ${sectStart - cutPoint} chars of trailing whitespace from cover`);
  }
  zip.writeZip(dstPath);
}

function initCovers() {
  // Check adm-zip is available
  let AdmZip;
  try { AdmZip = require('adm-zip'); } catch(e) {
    console.warn('[CHS.ai] adm-zip not found — covers will be used as-is (may have blank page)');
  }

  for (const [type, srcPath] of Object.entries(COVER_PAGES)) {
    if (!fs.existsSync(srcPath)) {
      console.warn(`[CHS.ai] Cover page not found: ${srcPath}`);
      continue;
    }
    const cleanPath = path.join(OUTPUT_DIR, `_cover_${type}_clean.docx`);
    const srcMtime   = fs.statSync(srcPath).mtimeMs;
    const cleanMtime = fs.existsSync(cleanPath) ? fs.statSync(cleanPath).mtimeMs : 0;

    if (srcMtime > cleanMtime) {
      try {
        if (AdmZip && type !== 'quiz') {
          // Quiz cover is handled differently in merge — don't strip, use as-is
          cleanDocxTrailingParas(srcPath, cleanPath);
          console.log(`[CHS.ai] Cover cleaned and cached: ${type}`);
        } else {
          fs.copyFileSync(srcPath, cleanPath);
          console.log(`[CHS.ai] Cover cached (unmodified): ${type}`);
        }
      } catch (e) {
        console.warn(`[CHS.ai] Cover cache failed for ${type}, using original:`, e.message);
        fs.copyFileSync(srcPath, cleanPath);
      }
    }
    cleanedCovers[type] = cleanPath;
  }
}
const cleanedCovers = {};
initCovers();

// ── Merge cover + content buffer (pure adm-zip) ──────────────────────────────
function mergeWithCover(coverType, contentBuffer) {
  const coverPath = cleanedCovers[coverType];
  if (!coverPath || !fs.existsSync(coverPath)) {
    console.warn(`[CHS.ai] No cached cover for type: ${coverType}, skipping merge`);
    return Promise.resolve(contentBuffer);
  }

  try {
    const AdmZip = require('adm-zip');

    const tmpContent = path.join(OUTPUT_DIR, `_tmp_content_${Date.now()}.docx`);
    fs.writeFileSync(tmpContent, contentBuffer);

    const coverZip   = new AdmZip(coverPath);
    const contentZip = new AdmZip(tmpContent);

    let coverXml   = coverZip.readAsText('word/document.xml');
    let contentXml = contentZip.readAsText('word/document.xml');

    // ── Step 1: find all image relationships in cover ──────────────────────
    const coverRels    = coverZip.readAsText('word/_rels/document.xml.rels');
    let   contentRels  = contentZip.readAsText('word/_rels/document.xml.rels');

    // Find highest rId number already used in content rels
    const usedIds = [...contentRels.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
    let nextId = usedIds.length > 0 ? Math.max(...usedIds) + 1 : 10;

    // Find image relationships in cover
    const coverImageRels = [...coverRels.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+image[^>]+Target="([^"]+)"[^>]*\/>/g)];

    // Build rId remapping: coverRid -> new safe rId
    const ridMap = {};
    const newRelEntries = [];
    for (const [, covRid, target] of coverImageRels) {
      const newRid = `rId${nextId++}`;
      ridMap[covRid] = newRid;
      // Copy media file with potentially renamed path
      const mediaEntry = `word/${target}`;
      const mediaData  = coverZip.getEntry(mediaEntry);
      if (mediaData) {
        // Use new filename to avoid collisions
        const ext      = target.split('.').pop();
        const newName  = `word/media/cover_${newRid}.${ext}`;
        contentZip.addFile(newName, mediaData.getData());
        newRelEntries.push(`<Relationship Id="${newRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/cover_${newRid}.${ext}"/>`);
      }
    }

    // ── Step 2: remap rIds in cover XML ────────────────────────────────────
    for (const [oldRid, newRid] of Object.entries(ridMap)) {
      coverXml = coverXml.split(`r:embed="${oldRid}"`).join(`r:embed="${newRid}"`);
      coverXml = coverXml.split(`r:id="${oldRid}"`).join(`r:id="${newRid}"`);
    }

    // ── Step 3: add new relationships to content rels ─────────────────────
    if (newRelEntries.length > 0) {
      contentRels = contentRels.replace('</Relationships>', newRelEntries.join('') + '</Relationships>');
      contentZip.updateFile('word/_rels/document.xml.rels', Buffer.from(contentRels, 'utf8'));
    }

    // ── Step 3b: merge missing namespaces from cover into content doc ─────
    // Cover may use namespace prefixes (w14, w16du, oel, etc.) not declared in content
    const coverNsMatch   = coverXml.match(/<w:document([^>]+)>/);
    const contentNsMatch = contentXml.match(/<w:document([^>]+)>/);
    if (coverNsMatch && contentNsMatch) {
      const coverNsStr   = coverNsMatch[1];
      const contentNsStr = contentNsMatch[1];
      // Extract all xmlns:xxx declarations from cover
      const coverNsDecls = [...coverNsStr.matchAll(/xmlns:[a-zA-Z0-9]+="[^"]+"/g)].map(m => m[0]);
      // Find which ones are missing from content
      const missingNs = coverNsDecls.filter(ns => !contentNsStr.includes(ns));
      if (missingNs.length > 0) {
        // Inject missing namespaces into content <w:document> tag
        contentXml = contentXml.replace(
          '<w:document' + contentNsStr + '>',
          '<w:document' + contentNsStr + ' ' + missingNs.join(' ') + '>'
        );
      }
    }

    // ── Step 4: inject cover body into content ────────────────────────────
    const coverBodyStart = coverXml.indexOf('<w:body>') + '<w:body>'.length;
    const contentBodyStart = contentXml.indexOf('<w:body>') + '<w:body>'.length;

    let mergedXml;

    if (coverType === 'quiz') {
      // Quiz: header sits at TOP of page 1, content flows directly below — no page break
      // The quiz cover has 2 sectPrs: first one is a section-break paragraph (creates page 2)
      // We want everything BEFORE that section-break paragraph, but we must cut on a
      // complete </w:p> boundary to avoid splitting open XML elements (textboxes, drawings)

      const firstSectPrInBody = coverXml.indexOf('<w:sectPr', coverBodyStart);
      // The section-break paragraph starts with <w:p and contains the sectPr
      // Walk back from firstSectPr to find the opening <w:p of that paragraph
      const sectBreakParaStart = coverXml.lastIndexOf('<w:p ', firstSectPrInBody);
      // Everything before that paragraph — but find the last COMPLETE </w:p> before it
      const lastCompleteParaEnd = coverXml.lastIndexOf('</w:p>', sectBreakParaStart);
      const coverPage1Body = coverXml.slice(coverBodyStart, lastCompleteParaEnd + 6);

      // Inject cover page 1 content at top of content doc, no section break
      mergedXml =
        contentXml.slice(0, contentBodyStart) +
        coverPage1Body +
        contentXml.slice(contentBodyStart);
    } else {
      // Test/Exam: cover is full page 1, content starts page 2 — use section break
      const coverSectStart = coverXml.lastIndexOf('<w:sectPr');
      const coverSectEnd   = coverXml.indexOf('</w:sectPr>') + '</w:sectPr>'.length;
      const coverBody      = coverXml.slice(coverBodyStart, coverSectStart);
      const coverSectPr    = coverXml.slice(coverSectStart, coverSectEnd);
      const sectionBreak   = `<w:p><w:pPr>${coverSectPr}</w:pPr></w:p>`;

      mergedXml =
        contentXml.slice(0, contentBodyStart) +
        coverBody +
        sectionBreak +
        contentXml.slice(contentBodyStart);
    }

    contentZip.updateFile('word/document.xml', Buffer.from(mergedXml, 'utf8'));

    // ── Step 5: write output ──────────────────────────────────────────────
    const outPath = path.join(OUTPUT_DIR, `_tmp_merged_${Date.now()}.docx`);
    contentZip.writeZip(outPath);
    const result = fs.readFileSync(outPath);

    try { fs.unlinkSync(tmpContent); } catch(e) {}
    try { fs.unlinkSync(outPath);    } catch(e) {}

    console.log(`[CHS.ai] Merged cover (${coverType}): ${Object.keys(ridMap).length} images remapped`);
    return Promise.resolve(result);
  } catch (e) {
    console.error('[CHS.ai] Merge failed:', e.message);
    return Promise.resolve(contentBuffer);
  }
}

// ── LESSON PLAN ───────────────────────────────────────────────────────────────
function buildLessonPlan(spec) {
  const L = spec.lesson || {};
  const {
    subject = '', grade = '', teacher = '', date = '', duration = '45 mins',
    unit = '', topic = '', objectives = [], materials = [],
    activities = [], assessment = '', homework = ''
  } = L;

  const children = [];

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [b('LESSON PLAN', { size: 32, color: DKGREEN })],
    spacing: { before: 0, after: 60 }
  }));
  if (subject || grade || topic) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [a(`${subject}${grade ? ' · Grade ' + grade : ''}${topic ? ' — ' + topic : ''}`, { size: 22, color: MDGREEN })],
      spacing: { before: 0, after: 160 }
    }));
  }

  const infoCW = Math.floor(CONTENT_W / 2);
  const infoData = [
    ['Subject', subject], ['Grade / Class', grade],
    ['Teacher', teacher], ['Date', date || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
    ['Duration', duration], ['Unit', unit],
  ];
  const infoRows = [];
  for (let i = 0; i < infoData.length; i += 2) {
    const pair = [infoData[i], infoData[i + 1] || ['', '']];
    infoRows.push(new TableRow({ children: pair.map(([lbl, val]) =>
      new TableCell({
        borders: allThin,
        width: { size: infoCW, type: WidthType.DXA },
        shading: { fill: LGGREEN, type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: [b(lbl + ':  ', { size: 20 }), a(val || '', { size: 20 })], spacing: { before: 0, after: 0 } })]
      })
    ) }));
  }
  children.push(new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [infoCW, infoCW], rows: infoRows }));
  children.push(spacer(160));

  if (topic) {
    children.push(sectionHeader('TOPIC'));
    children.push(sectionContent([new Paragraph({ children: [t(topic)], spacing: { before: 0, after: 0 } })]));
    children.push(spacer(120));
  }
  if (objectives.length) {
    children.push(sectionHeader('LEARNING OBJECTIVES'));
    children.push(sectionContent(objectives.map(o => bullet(o))));
    children.push(spacer(120));
  }
  if (materials.length) {
    children.push(sectionHeader('MATERIALS & RESOURCES'));
    children.push(sectionContent(materials.map(m => bullet(m))));
    children.push(spacer(120));
  }
  if (activities.length) {
    children.push(sectionHeader('LESSON PROCEDURE'));
    const actContent = activities.flatMap((act, i) => {
      const label = typeof act === 'string'
        ? `${i + 1}.  ${act}`
        : `${i + 1}.  ${act.phase || ''}${act.duration ? '  (' + act.duration + ')' : ''}`;
      const desc = typeof act === 'string' ? '' : (act.description || '');
      return [
        new Paragraph({ children: [b(label, { size: 22, color: MDGREEN })], spacing: { before: 60, after: 20 } }),
        ...(desc ? [new Paragraph({ children: [t(desc)], indent: { left: 360 }, spacing: { before: 0, after: 60 } })] : [])
      ];
    });
    children.push(sectionContent(actContent));
    children.push(spacer(120));
  }
  if (assessment) {
    children.push(sectionHeader('ASSESSMENT'));
    children.push(sectionContent([new Paragraph({ children: [t(assessment)], spacing: { before: 0, after: 0 } })]));
    children.push(spacer(120));
  }
  if (homework) {
    children.push(sectionHeader('HOMEWORK'));
    children.push(sectionContent([new Paragraph({ children: [t(homework)], spacing: { before: 0, after: 0 } })]));
    children.push(spacer(120));
  }
  children.push(sectionHeader('TEACHER NOTES & REFLECTION'));
  children.push(sectionContent([
    new Paragraph({ children: [b('What worked well:', { size: 22 })], spacing: { before: 40, after: 40 } }),
    new Paragraph({ children: [t('_'.repeat(80), { color: 'cccccc' })], spacing: { before: 0, after: 80 } }),
    new Paragraph({ children: [b('What to improve:',  { size: 22 })], spacing: { before: 40, after: 40 } }),
    new Paragraph({ children: [t('_'.repeat(80), { color: 'cccccc' })], spacing: { before: 0, after: 0 } }),
  ]));

  return new Document({
    numbering: NUMBERING,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [{
      properties: { page: pageProps(false) },
      footers: { default: makeFooter() },
      children
    }]
  });
}

// ── LETTER ────────────────────────────────────────────────────────────────────
function buildLetter(spec) {
  const L = spec.letter || {};
  const {
    to = '', from = '', subject = '', body = '',
    closing = 'Sincerely,', signature = '',
    date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } = L;

  const children = [];
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(date)], spacing: { before: 0, after: 200 } }));
  if (to)      children.push(new Paragraph({ children: [b('To:    '), t(to)],   spacing: { before: 0, after: 80 } }));
  if (from)    children.push(new Paragraph({ children: [b('From:  '), t(from)], spacing: { before: 0, after: 80 } }));
  if (subject) children.push(new Paragraph({
    children: [b('Re:  '), new TextRun({ text: subject, bold: true, underline: { type: UnderlineType.SINGLE }, font: 'Times New Roman', size: 24 })],
    spacing: { before: 80, after: 240 }
  }));
  for (const line of body.split('\n').filter(l => l.trim())) {
    children.push(new Paragraph({ children: [t(line)], alignment: AlignmentType.JUSTIFIED, spacing: { before: 0, after: 120 } }));
  }
  children.push(spacer(300));
  children.push(new Paragraph({ children: [t(closing)], spacing: { before: 0, after: 400 } }));
  if (signature) children.push(new Paragraph({ children: [b(signature)], spacing: { before: 0, after: 0 } }));

  return new Document({
    numbering: NUMBERING,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: [{
      properties: { page: pageProps(false) },
      footers: { default: makeFooter() },
      children
    }]
  });
}

// ── GENERIC (test, exam, quiz, worksheet) ─────────────────────────────────────
function buildGeneric(spec) {
  const {
    title = '', subtitle = '', sections = [],
    footer_note = '', landscape = false, table,
    docCategory = 'worksheet',
    worksheetMode = 'standard'  // #37: 'simple' | 'standard' | 'polished'
  } = spec;

  const type = (docCategory || '').toLowerCase();
  const isAssessment = ['test', 'exam', 'quiz'].includes(type);
  const isWorksheet  = type === 'worksheet';

  // Detect if document is primarily Arabic
  const allText = [title, subtitle, ...sections.flatMap(s => [s.title || '', ...(Array.isArray(s.content) ? s.content : [])])].join(' ');
  const isArabicDoc = hasArabic(allText) && (allText.match(/[؀-ۿ]/g) || []).length > (allText.length * 0.2);

  const children = [];

  // Title block
  if (!isAssessment && title) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [b(title, { size: 28, color: DKGREEN, font: isArabicDoc ? 'Arial' : 'Arial' })],
      spacing: { before: 0, after: subtitle ? 60 : 120 },
      ...(isArabicDoc ? { bidi: true } : {})
    }));
  }
  // Quiz: no subtitle — time/marks already shown on the cover header
  if (subtitle && type !== 'quiz') {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [a(subtitle, { size: 20, italics: true, color: MDGREEN })],
      spacing: { before: 0, after: 120 }
    }));
  }
  if (!isAssessment && (title || subtitle)) {
    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: DKGREEN, space: 4 } },
      children: [], spacing: { before: 0, after: 200 }
    }));
  }
  if (isAssessment && subtitle) {
    children.push(new Paragraph({
      border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: DKGREEN, space: 4 } },
      children: [], spacing: { before: 0, after: 200 }
    }));
  }

  // Student info row — worksheets only
  // #37: 'simple' mode skips student info row; 'polished' adds decorative top border
  if (isWorksheet && worksheetMode !== 'simple') {
    const half = Math.floor(CONTENT_W / 2);
    children.push(new Table({
      width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [half, half],
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: half, type: WidthType.DXA }, margins: { top: 60, bottom: 20, left: 60, right: 60 },
            children: [new Paragraph({ children: [b('Name: ', { size: 22 }), t('__________________________________', { size: 22, color: 'aaaaaa' })], spacing: { before: 0, after: 40 } })] }),
          new TableCell({ borders: noBorders, width: { size: half, type: WidthType.DXA }, margins: { top: 60, bottom: 20, left: 60, right: 60 },
            children: [new Paragraph({ children: [b('Date: ', { size: 22 }), t('____________________', { size: 22, color: 'aaaaaa' })], spacing: { before: 0, after: 40 } })] })
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: noBorders, width: { size: half, type: WidthType.DXA }, margins: { top: 0, bottom: 60, left: 60, right: 60 },
            children: [new Paragraph({ children: [b('Class/Grade: ', { size: 22 }), t('___________________________', { size: 22, color: 'aaaaaa' })], spacing: { before: 0, after: 40 } })] }),
          new TableCell({ borders: noBorders, width: { size: half, type: WidthType.DXA }, margins: { top: 0, bottom: 60, left: 60, right: 60 },
            children: [new Paragraph({ children: [b('Subject: ', { size: 22 }), t('__________________________', { size: 22, color: 'aaaaaa' })], spacing: { before: 0, after: 40 } })] })
        ]})
      ]
    }));
    children.push(spacer(120));
  }

  // Sections
  for (const section of sections) {
    if (section.title) {
      if (isAssessment && type === 'quiz') {
        // Quiz: plain bold underlined black text, no green box, 12pt
        children.push(new Paragraph({
          children: [new TextRun({ text: section.title.toUpperCase(), font: 'Times New Roman', size: 24, bold: true, underline: { type: UnderlineType.SINGLE } })],
          spacing: { before: 160, after: 80 }
        }));
      } else {
        children.push(sectionHeader(section.title.toUpperCase(), landscape));
        children.push(spacer(80));
      }
    }
    const items = typeof section.content === 'string'
      ? section.content.split('\n').filter(l => l.trim())
      : (Array.isArray(section.content) ? section.content.map(String) : []);
    if (items.length) {
      // Quiz uses 11pt for questions, others use standard sizes
      const renderFn = (isAssessment && type === 'quiz') ? renderLineQuiz : renderLine;
      children.push(sectionContent(items.map(renderFn), landscape));
    }
    if (section.table) {
      children.push(spacer(80));
      children.push(...buildTable(section.table, landscape));
    }
    children.push(spacer(120));
  }

  if (table) {
    children.push(...buildTable(table, landscape));
    children.push(spacer(120));
  }
  if (footer_note) {
    children.push(new Paragraph({
      children: [t(footer_note, { size: 18, italics: true, color: GRAY })],
      spacing: { before: 120, after: 0 }
    }));
  }

  return new Document({
    numbering: NUMBERING,
    styles: {
      default: {
        document: {
          run: { font: isArabicDoc ? 'Arial' : 'Times New Roman', size: 24 },
          ...(isArabicDoc ? { paragraph: { bidi: true } } : {})
        }
      }
    },
    sections: [{
      properties: {
        page: pageProps(landscape),
        ...(isArabicDoc ? { bidi: true } : {})
      },
      footers: { default: makeFooter() },
      children
    }]
  });
}

// ── Main export ───────────────────────────────────────────────────────────────
async function generateDocument(documentSpec) {
  const { type = 'generic', title = 'Document', docCategory = '' } = documentSpec;

  const category = (docCategory || type || '').toLowerCase();
  const coverType = ['test', 'exam', 'quiz'].includes(category) ? category : null;

  let doc;
  switch (type) {
    case 'lesson_plan': doc = buildLessonPlan(documentSpec); break;
    case 'letter':
    case 'circular':   doc = buildLetter(documentSpec);     break;
    default:           doc = buildGeneric(documentSpec);    break;
  }

  let finalBuffer = await Packer.toBuffer(doc);

  if (coverType) {
    finalBuffer = await mergeWithCover(coverType, finalBuffer);
  }

  const safeName = String(title || 'Document')
    .replace(/[^a-z0-9\s_-]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 50);
  const uid      = crypto.randomBytes(4).toString('hex');
  const filename = `${safeName}_${uid}.docx`;
  const filepath = path.join(OUTPUT_DIR, filename);

  fs.writeFileSync(filepath, finalBuffer);

  // ── #31: Preview metadata ─────────────────────────────────────────────────
  const fileSizeKB  = Math.round(finalBuffer.length / 1024);
  const sectionCount = Array.isArray(documentSpec.sections) ? documentSpec.sections.length :
                       (documentSpec.lesson ? 6 : documentSpec.letter ? 1 : 0);
  const estPages    = Math.max(1, Math.ceil(sectionCount / 3));
  const docType     = category || type || 'document';
  const typeLabel   = { test:'Test', exam:'Exam', quiz:'Quiz', worksheet:'Worksheet',
                        handout:'Handout', lesson_plan:'Lesson Plan', letter:'Letter/Circular',
                        circular:'Circular' }[docType] || 'Document';

  return {
    filename,
    filepath,
    downloadPath: `/api/download/${filename}`,
    preview: {
      title:     title,
      type:      typeLabel,
      sections:  sectionCount,
      estPages:  estPages,
      sizeKB:    fileSizeKB,
    }
  };
}

module.exports = { generateDocument };
