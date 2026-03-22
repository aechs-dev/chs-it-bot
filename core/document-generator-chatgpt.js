
/**
 * core/document-generator.js
 * CHS.ai — Word Document Generator
 * Supports: lesson_plan, letter, generic
 * Brand-aware rendering for AECHS classroom materials and assessment content pages.
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, WidthType, BorderStyle, ShadingType, LevelFormat,
  UnderlineType, Footer, VerticalAlign
} = require('docx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUTPUT_DIR = path.join(__dirname, '..', 'generated_docs');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Brand ─────────────────────────────────────────────────────────────────────
const BRAND_GREEN = '1F5F2C';   // dark banner green from sample
const BRAND_GREEN_2 = '2E7D32'; // logo green
const BRAND_SOFT = 'CFE6CC';    // light section fill
const BRAND_BG = 'F5F8F4';      // soft page tint
const WHITE = 'FFFFFF';
const TEXT = '1F1F1F';
const MUTED = '6E6E6E';
const LINE = 'B7C9B7';

const LOGO_BASE64 = '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';

// ── Borders ───────────────────────────────────────────────────────────────────
const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const lightBottom = { bottom: thinBorder };
const noBorder = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Helpers ───────────────────────────────────────────────────────────────────
function t(text, opts = {}) {
  return new TextRun({ text: String(text || ''), font: opts.font || 'Times New Roman', size: 22, color: TEXT, ...opts });
}
function b(text, opts = {}) {
  return t(text, { bold: true, ...opts });
}
function clean(text) {
  return String(text || '').replace(/\*\*/g, '').replace(/\*/g, '').trim();
}
function normalizeMath(text) {
  let s = clean(text);
  s = s.replace(/\s*→\s*/g, ' → ');
  s = s.replace(/\s*=\s*/g, ' = ');
  s = s.replace(/\s*\+\s*/g, ' + ');
  s = s.replace(/\s*-\s*/g, ' - ');
  s = s.replace(/\s*\/\s*/g, ' / ');
  s = s.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}
function spacer(before = 90, after = 0) {
  return new Paragraph({ children: [t('')], spacing: { before, after } });
}
function isAssessment(spec = {}) {
  const probe = `${clean(spec.documentRole)} ${clean(spec.title)} ${clean(spec.subtitle)}`.toLowerCase();
  return /assessment_content|quiz|test|assessment/.test(probe) && !/worksheet|handout|summary|reference/.test(probe);
}
function isClassMaterial(spec = {}) {
  const probe = `${clean(spec.documentRole)} ${clean(spec.title)} ${clean(spec.subtitle)} ${clean(spec.footer_note)}`.toLowerCase();
  return /class_material|worksheet|summary|reference|handout|main points|explanatory|study sheet|cheat sheet|notes/.test(probe) || !isAssessment(spec);
}
function shouldUseLogo(spec = {}) {
  return isClassMaterial(spec) && !isAssessment(spec);
}
function shouldShowScore(spec = {}) {
  const probe = `${clean(spec.documentRole)} ${clean(spec.title)} ${clean(spec.subtitle)}`.toLowerCase();
  if (/quiz|test|assessment/.test(probe)) return false; // cover page handles this
  if (/worksheet|summary|reference|handout|class_material|explanatory/.test(probe)) return false;
  return false;
}
function isSectionBandLine(line) {
  const s = clean(line);
  return /^(section|part)\s+[a-z0-9]/i.test(s);
}
function isSubheadingLine(line) {
  const s = clean(line);
  return /^([A-Z][A-Za-z\s-]{1,35}:)$/.test(s) ||
         /^(Examples:|Key Concepts:|Steps to Solve.*:|Steps:|Remember:|Note:|Solution:|Zero Product Property:|General Form:|Definition:|Common Mistakes:|Verification:)$/i.test(s);
}
function isBulletLine(line) {
  return /^•\s*/.test(clean(line));
}
function isOptionLine(line) {
  return /^[a-d]\)/i.test(clean(line));
}
function isQuestionLine(line) {
  return /^\d+\.\s+/.test(clean(line));
}
function isWritingLine(line) {
  return /^_{3,}/.test(clean(line));
}
function pageProps(landscape = false) {
  return landscape
    ? { size: { width: 16838, height: 11906 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } }
    : { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } };
}
function contentWidth(landscape = false) {
  return landscape ? 15398 : 10466;
}

// ── Header blocks inside body ────────────────────────────────────────────────
function logoRun() {
  return new ImageRun({
    data: Buffer.from(LOGO_BASE64, 'base64'),
    transformation: { width: 68, height: 68 },
  });
}

function buildBrandedBanner(spec) {
  const title = clean(spec.title || 'DOCUMENT').toUpperCase();
  const subtitle = clean(spec.subtitle || '');
  const chapter = clean(spec.chapter || subtitle);

  return new Table({
    width: { size: 10466, type: WidthType.DXA },
    columnWidths: [1400, 9066],
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            shading: { fill: BRAND_GREEN, type: ShadingType.CLEAR },
            width: { size: 1400, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 70, right: 40 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [logoRun()],
                spacing: { before: 0, after: 0 }
              })
            ]
          }),
          new TableCell({
            borders: noBorders,
            shading: { fill: BRAND_GREEN, type: ShadingType.CLEAR },
            width: { size: 9066, type: WidthType.DXA },
            margins: { top: 90, bottom: 90, left: 40, right: 160 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Armenian Evangelical Central High School', font: 'Arial', bold: true, size: 24, color: WHITE })],
                spacing: { before: 0, after: 8 }
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Ashrafieh, Beirut — Lebanon', font: 'Arial', size: 14, color: 'D9E7D8' })],
                spacing: { before: 0, after: 30 }
              }),
              new Paragraph({
                border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '93B593', space: 0 } },
                children: [],
                spacing: { before: 0, after: 18 }
              }),
              new Paragraph({
                children: [new TextRun({ text: title, font: 'Arial', bold: true, size: 24, color: WHITE })],
                spacing: { before: 0, after: 4 }
              }),
              ...(chapter ? [new Paragraph({
                children: [new TextRun({ text: chapter.toUpperCase(), font: 'Arial', size: 15, color: 'D9E7D8' })],
                spacing: { before: 0, after: 0 }
              })] : [])
            ]
          })
        ]
      })
    ]
  });
}

function buildStudentInfoRow(spec = {}) {
  const includeScore = shouldShowScore(spec);
  const row1 = [
    new TableCell({
      borders: noBorders, width: { size: 4200, type: WidthType.DXA },
      children: [studentLine('Student Name: ')]
    }),
    new TableCell({
      borders: noBorders, width: { size: includeScore ? 2500 : 4000, type: WidthType.DXA },
      children: [studentLine('Date: ')]
    }),
    ...(includeScore ? [new TableCell({ borders: noBorders, width: { size: 3766, type: WidthType.DXA }, children: [new Paragraph({ children: [] })] })] : [])
  ];
  const row2 = [
    new TableCell({
      borders: noBorders, width: { size: 3200, type: WidthType.DXA },
      children: [studentLine('Class / Grade: ')]
    }),
    new TableCell({
      borders: noBorders, width: { size: 3600, type: WidthType.DXA },
      children: [studentLine('Subject: ')]
    }),
    ...(includeScore ? [
      new TableCell({
        borders: noBorders, width: { size: 2500, type: WidthType.DXA },
        children: [studentLine('Score: ')]
      }),
      new TableCell({
        borders: noBorders, width: { size: 1166, type: WidthType.DXA },
        children: [new Paragraph({ children: [new TextRun({ text: '/ 20', font: 'Arial', size: 16, color: MUTED })] })]
      })
    ] : [])
  ];

  return new Table({
    width: { size: 10466, type: WidthType.DXA },
    borders: noBorders,
    rows: [
      new TableRow({ children: row1 }),
      new TableRow({ children: row2 })
    ]
  });
}

function studentLine(label) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, font: 'Arial', size: 16, color: MUTED }),
      new TextRun({ text: '__________________________', font: 'Arial', size: 16, color: MUTED })
    ],
    spacing: { before: 0, after: 0 }
  });
}

function sectionBand(label) {
  return new Table({
    width: { size: 10466, type: WidthType.DXA },
    borders: noBorders,
    rows: [new TableRow({
      children: [new TableCell({
        borders: noBorders,
        shading: { fill: BRAND_SOFT, type: ShadingType.CLEAR },
        margins: { top: 50, bottom: 50, left: 140, right: 140 },
        children: [new Paragraph({
          children: [new TextRun({ text: clean(label), font: 'Arial', bold: true, size: 18, color: BRAND_GREEN })],
          spacing: { before: 0, after: 0 }
        })]
      })]
    })]
  });
}

// ── Content renderers ─────────────────────────────────────────────────────────
function renderLines(lines, opts = { mode: 'class' }) {
  const out = [];
  const mode = opts.mode || 'class';

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = String(lines[idx] || '');
    const line = normalizeMath(raw);
    if (!line) {
      out.push(spacer(55));
      continue;
    }

    if (isSectionBandLine(line)) {
      out.push(spacer(80));
      out.push(sectionBand(line));
      out.push(spacer(70));
      continue;
    }

    if (isSubheadingLine(line)) {
      out.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/:$/, '') + ':', font: 'Times New Roman', bold: true, size: 22, color: BRAND_GREEN_2 })],
        spacing: { before: 90, after: 45 },
        keepNext: true
      }));
      continue;
    }

    if (isQuestionLine(line)) {
      out.push(new Paragraph({
        children: [t(line, { size: 22 })],
        spacing: { before: 70, after: 35 },
      }));
      continue;
    }

    if (isOptionLine(line)) {
      out.push(new Paragraph({
        children: [t(line, { size: 21 })],
        indent: { left: 420 },
        spacing: { before: 10, after: 10 }
      }));
      continue;
    }

    if (isWritingLine(line)) {
      out.push(new Paragraph({
        children: [new TextRun({ text: line, font: 'Times New Roman', size: 20, color: '8FA58F' })],
        spacing: { before: 20, after: 20 }
      }));
      continue;
    }

    if (isBulletLine(line)) {
      out.push(new Paragraph({
        numbering: { reference: 'bullets', level: 0 },
        children: [t(line.replace(/^•\s*/, ''), { size: 21 })],
        spacing: { before: 12, after: 12 }
      }));
      continue;
    }

    out.push(new Paragraph({
      children: [t(line, { size: 22 })],
      spacing: { before: mode === 'assessment' ? 20 : 22, after: mode === 'assessment' ? 18 : 22 }
    }));
  }

  return out;
}

function buildTable(tableSpec, landscape = false) {
  const { headers = [], rows = [], caption = '' } = tableSpec || {};
  const cw = contentWidth(landscape);
  const colCount = headers.length || (rows[0] ? rows[0].length : 1);
  const colWidth = Math.floor(cw / colCount);
  const colWidths = Array(colCount).fill(colWidth);
  colWidths[colCount - 1] += cw - colWidth * colCount;

  const headerRow = headers.length ? new TableRow({
    children: headers.map((h, i) => new TableCell({
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: BRAND_SOFT, type: ShadingType.CLEAR },
      margins: { top: 70, bottom: 70, left: 110, right: 110 },
      children: [new Paragraph({ children: [new TextRun({ text: clean(h), font: 'Arial', bold: true, size: 18, color: BRAND_GREEN })] })]
    }))
  }) : null;

  const dataRows = rows.map((row) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      borders: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
      width: { size: colWidths[ci], type: WidthType.DXA },
      margins: { top: 70, bottom: 70, left: 110, right: 110 },
      children: [new Paragraph({ children: [t(Array.isArray(cell) ? cell.join(' ') : String(cell || ''), { size: 20 })] })]
    }))
  }));

  const result = [new Table({
    width: { size: cw, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: headerRow ? [headerRow, ...dataRows] : dataRows
  })];

  if (caption) {
    result.push(new Paragraph({
      children: [t(caption, { size: 18, italics: true, color: MUTED })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 0 }
    }));
  }
  return result;
}

// ── Lesson plan / letter ──────────────────────────────────────────────────────
function buildLessonPlan(spec) {
  const L = spec.lesson || {};
  const {
    subject = '', grade = '', teacher = '', date = '', duration = '45 mins',
    unit = '', topic = '', objectives = [], materials = [],
    activities = [], assessment = '', homework = ''
  } = L;

  const children = [];
  children.push(buildBrandedBanner({ title: 'Lesson Plan', subtitle: topic || subject, chapter: unit }));
  children.push(spacer(40));
  children.push(buildStudentInfoRow({ documentRole: 'class_material' }));
  children.push(spacer(80));

  const infoRows = [
    ['Teacher', teacher], ['Grade', grade], ['Subject', subject], ['Duration', duration], ['Date', date], ['Unit', unit]
  ];
  children.push(...buildTable({
    headers: ['Field', 'Value'],
    rows: infoRows.map(([k, v]) => [k, v || ''])
  }));
  children.push(spacer(90));
  if (objectives.length) { children.push(sectionBand('Learning Objectives')); children.push(spacer(55)); children.push(...renderLines(objectives.map(o => '• ' + o))); }
  if (materials.length) { children.push(spacer(80)); children.push(sectionBand('Materials & Resources')); children.push(spacer(55)); children.push(...renderLines(materials.map(m => '• ' + m))); }
  if (activities.length) {
    children.push(spacer(80)); children.push(sectionBand('Lesson Procedure')); children.push(spacer(55));
    activities.forEach((act, i) => {
      const label = typeof act === 'string' ? `${i + 1}. ${act}` : `${i + 1}. ${act.phase || ''}${act.duration ? ' (' + act.duration + ')' : ''}`;
      const desc = typeof act === 'string' ? '' : (act.description || '');
      children.push(...renderLines([label, ...(desc ? [desc] : []), '']));
    });
  }
  if (assessment) { children.push(spacer(80)); children.push(sectionBand('Assessment')); children.push(spacer(55)); children.push(...renderLines([assessment])); }
  if (homework) { children.push(spacer(80)); children.push(sectionBand('Homework')); children.push(spacer(55)); children.push(...renderLines([homework])); }

  return new Document({
    numbering: NUMBERING,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: [{ properties: { page: pageProps(false) }, footers: { default: makeFooter() }, children }]
  });
}

function buildLetter(spec) {
  const L = spec.letter || {};
  const {
    to = '', from = '', subject = '', body = '',
    closing = 'Sincerely,', signature = '',
    date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  } = L;

  const children = [];
  children.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [t(date)], spacing: { before: 0, after: 160 } }));
  if (to) children.push(new Paragraph({ children: [b('To: '), t(to)], spacing: { after: 60 } }));
  if (from) children.push(new Paragraph({ children: [b('From: '), t(from)], spacing: { after: 60 } }));
  if (subject) children.push(new Paragraph({
    children: [b('Re: '), new TextRun({ text: subject, bold: true, underline: { type: UnderlineType.SINGLE }, font: 'Times New Roman', size: 22 })],
    spacing: { before: 40, after: 140 }
  }));
  body.split('\n').filter(x => clean(x)).forEach(line => children.push(new Paragraph({ children: [t(line)], spacing: { after: 90 } })));
  children.push(spacer(220));
  children.push(new Paragraph({ children: [t(closing)], spacing: { after: 260 } }));
  if (signature) children.push(new Paragraph({ children: [b(signature)] }));

  return new Document({
    numbering: NUMBERING,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: [{ properties: { page: pageProps(false) }, footers: { default: makeFooter() }, children }]
  });
}

// ── Generic builder ───────────────────────────────────────────────────────────
function buildGeneric(spec) {
  const {
    title = 'Document', subtitle = '', chapter = '',
    sections = [], footer_note = '', landscape = false, table
  } = spec || {};

  const children = [];
  const assessment = isAssessment(spec);
  const classMaterial = isClassMaterial(spec);

  if (classMaterial && !assessment) {
    children.push(buildBrandedBanner({ title, subtitle, chapter }));
    children.push(spacer(30));
    children.push(buildStudentInfoRow(spec));
    children.push(spacer(70));
  }

  // For assessment content pages: no intro, no school name, no repeated title.
  for (const section of sections) {
    const sectionTitle = clean(section.title || '');
    if (sectionTitle) {
      children.push(sectionBand(sectionTitle));
      children.push(spacer(60));
    }

    const contentLines = typeof section.content === 'string'
      ? section.content.split('\n')
      : Array.isArray(section.content) ? section.content.map(String) : [];

    children.push(...renderLines(contentLines, { mode: assessment ? 'assessment' : 'class' }));

    if (section.table) {
      children.push(spacer(70));
      children.push(...buildTable(section.table, landscape));
    }

    children.push(spacer(85));
  }

  if (table) {
    children.push(...buildTable(table, landscape));
    children.push(spacer(90));
  }

  if (footer_note && !assessment) {
    children.push(new Paragraph({
      children: [t(clean(footer_note), { size: 18, italics: true, color: MUTED })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 0 }
    }));
  }

  return new Document({
    numbering: NUMBERING,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
    sections: [{ properties: { page: pageProps(landscape) }, footers: { default: makeFooter() }, children }]
  });
}

function makeFooter() {
  return new Footer({
    children: [new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINE, space: 2 } },
      children: [new TextRun({ text: 'AECHS — Academic Year 2025–2026', font: 'Arial', size: 15, color: MUTED })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: 0 }
    })]
  });
}

const NUMBERING = {
  config: [{
    reference: 'bullets',
    levels: [{
      level: 0,
      format: LevelFormat.BULLET,
      text: '•',
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } }
    }]
  }]
};

// ── Main export ───────────────────────────────────────────────────────────────
async function generateDocument(documentSpec) {
  const { type = 'generic', title = 'Document' } = documentSpec || {};
  let doc;
  switch (type) {
    case 'lesson_plan': doc = buildLessonPlan(documentSpec); break;
    case 'letter':
    case 'circular': doc = buildLetter(documentSpec); break;
    default: doc = buildGeneric(documentSpec); break;
  }

  const safeName = String(title || 'Document').replace(/[^a-z0-9\s_-]/gi, '').replace(/\s+/g, '_').slice(0, 50);
  const uid = crypto.randomBytes(4).toString('hex');
  const filename = `${safeName}_${uid}.docx`;
  const filepath = path.join(OUTPUT_DIR, filename);

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filepath, buffer);

  return { filename, filepath, downloadPath: `/api/download/${filename}` };
}

module.exports = { generateDocument };
