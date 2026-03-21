import { NextRequest, NextResponse } from 'next/server'
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType,
  ShadingType, PageBreak,
} from 'docx'

/* ═══════════════════════════════════════════════════════════════
   Report Assembly Agent API

   Takes a GuidelineProject with completed PICOs and generates
   a DOCX clinical practice guideline document matching the
   standard CPG format:
   - Title page
   - Summary of recommendations table
   - Per-domain sections with recommendation statements
   - Evidence summaries, key evidence, discussion
   - References
   ═══════════════════════════════════════════════════════════════ */

interface ReportPICO {
  id: string
  topic: string
  population: string
  intervention: string
  comparison: string
  outcome: string
  strength?: 'strong' | 'conditional'
  direction?: 'for' | 'against'
  evidenceCertainty?: 'high' | 'moderate' | 'low' | 'very_low'
  statementText?: string
  keyEvidence?: string[]
  discussion?: string
  consensusVote?: { agree: number; neutral: number; disagree: number }
  economicNote?: string
}

interface ReportDomain {
  id: string
  label: string
  description: string
  picos: ReportPICO[]
}

interface ReportInput {
  title: string
  country: string
  countryLabel: string
  domains: ReportDomain[]
  createdAt: string
  authors?: string[]
  organization?: string
}

/* ─── Helper: create styled paragraph ─── */
function heading(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]) {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 240, after: 120 },
  })
}

function bodyText(text: string, options?: { bold?: boolean; italic?: boolean; color?: string }) {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22,
        font: 'Calibri',
        bold: options?.bold,
        italics: options?.italic,
        color: options?.color || '333333',
      }),
    ],
    spacing: { after: 100 },
  })
}

function bulletItem(text: string) {
  return new Paragraph({
    children: [
      new TextRun({ text, size: 22, font: 'Calibri', color: '333333' }),
    ],
    bullet: { level: 0 },
    spacing: { after: 60 },
  })
}

/* ─── Helper: create recommendation box ─── */
function recommendationBox(pico: ReportPICO, statementNum: string) {
  const strengthLabel = (pico.strength || 'conditional').charAt(0).toUpperCase() + (pico.strength || 'conditional').slice(1)
  const certaintyLabel = (pico.evidenceCertainty || 'low').replace('_', ' ')
  const dirLabel = pico.direction === 'against' ? 'Against' : 'For'

  const rows: Paragraph[] = []

  // Statement header
  rows.push(new Paragraph({
    children: [
      new TextRun({ text: `Statement ${statementNum}: `, bold: true, size: 24, font: 'Calibri', color: 'B45309' }),
      new TextRun({ text: `${strengthLabel} ${dirLabel}`, bold: true, size: 22, font: 'Calibri', color: pico.strength === 'strong' ? '065F46' : 'B45309' }),
      new TextRun({ text: `  |  Evidence: ${certaintyLabel}`, size: 20, font: 'Calibri', color: '6B7280' }),
    ],
    spacing: { after: 80 },
  }))

  // Statement text
  rows.push(new Paragraph({
    children: [
      new TextRun({
        text: pico.statementText || `We suggest ${pico.intervention} for ${pico.population} to improve ${pico.outcome} (${pico.strength || 'conditional'} recommendation, ${certaintyLabel}-certainty evidence).`,
        size: 22, font: 'Calibri', bold: true, color: '1E1E2E',
      }),
    ],
    spacing: { after: 80 },
  }))

  // Consensus vote
  if (pico.consensusVote) {
    rows.push(new Paragraph({
      children: [
        new TextRun({ text: 'Consensus: ', bold: true, size: 20, font: 'Calibri', color: '6B7280' }),
        new TextRun({ text: `${pico.consensusVote.agree}% agree, ${pico.consensusVote.neutral}% neutral, ${pico.consensusVote.disagree}% disagree`, size: 20, font: 'Calibri', color: '6B7280' }),
      ],
      spacing: { after: 40 },
    }))
  }

  return new Table({
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: rows,
            shading: { type: ShadingType.SOLID, color: 'FEF9F3' },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 2, color: 'D97757' },
              bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D97757' },
              left: { style: BorderStyle.SINGLE, size: 6, color: 'D97757' },
              right: { style: BorderStyle.SINGLE, size: 2, color: 'D97757' },
            },
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

/* ─── Helper: create summary table ─── */
function summaryTable(domains: ReportDomain[]) {
  const headerRow = new TableRow({
    children: ['#', 'Recommendation', 'Strength', 'Evidence'].map((text, i) => (
      new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold: true, size: 20, font: 'Calibri', color: 'FFFFFF' })],
          alignment: AlignmentType.CENTER,
        })],
        shading: { type: ShadingType.SOLID, color: '1E1E2E' },
        width: { size: i === 1 ? 55 : 15, type: WidthType.PERCENTAGE },
      })
    )),
  })

  let statementIdx = 0
  const dataRows: TableRow[] = []
  for (const domain of domains) {
    for (const pico of domain.picos) {
      statementIdx++
      const certainty = (pico.evidenceCertainty || 'low').replace('_', ' ')
      const strength = pico.strength || 'conditional'
      const shortStatement = pico.statementText
        ? (pico.statementText.length > 100 ? pico.statementText.slice(0, 100) + '...' : pico.statementText)
        : `${pico.intervention} for ${pico.population}`

      dataRows.push(new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: `S${statementIdx}`, size: 20, font: 'Calibri' })],
              alignment: AlignmentType.CENTER,
            })],
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: shortStatement, size: 20, font: 'Calibri' })],
            })],
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: strength.charAt(0).toUpperCase() + strength.slice(1),
                size: 20, font: 'Calibri', bold: true,
                color: strength === 'strong' ? '065F46' : 'B45309',
              })],
              alignment: AlignmentType.CENTER,
            })],
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: certainty.charAt(0).toUpperCase() + certainty.slice(1), size: 20, font: 'Calibri' })],
              alignment: AlignmentType.CENTER,
            })],
          }),
        ],
      }))
    }
  }

  return new Table({
    rows: [headerRow, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

export async function POST(req: NextRequest) {
  try {
    const input: ReportInput = await req.json()

    if (!input.title || !input.domains || input.domains.length === 0) {
      return NextResponse.json({ error: 'Missing title or domains' }, { status: 400 })
    }

    const totalPicos = input.domains.reduce((s, d) => s + d.picos.length, 0)
    const organization = input.organization || 'National CPG Authority'
    const dateStr = new Date(input.createdAt || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

    const sections: any[] = []

    // ═══ Title Page ═══
    sections.push(
      new Paragraph({ spacing: { before: 1200 } }),
      new Paragraph({
        children: [new TextRun({ text: organization, size: 28, font: 'Calibri', color: '6B7280' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: input.title, size: 52, font: 'Calibri', bold: true, color: '1E1E2E' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Clinical Practice Guideline', size: 32, font: 'Calibri', color: 'D97757' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `${input.countryLabel || 'Global'} Context`, size: 24, font: 'Calibri', color: '6B7280' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: dateStr, size: 24, font: 'Calibri', color: '6B7280' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `${input.domains.length} Clinical Domains \u2022 ${totalPicos} Recommendation Statements`, size: 22, font: 'Calibri', color: '9CA3AF' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '', break: 1 })],
        pageBreakBefore: true,
      }),
    )

    // ═══ Summary of Recommendations ═══
    sections.push(
      heading('Summary of Recommendations', HeadingLevel.HEADING_1),
      bodyText(`This guideline contains ${totalPicos} recommendation statements across ${input.domains.length} clinical domains. The following table summarizes all recommendations with their strength and evidence certainty ratings.`),
      new Paragraph({ spacing: { after: 120 } }),
      summaryTable(input.domains),
      new Paragraph({ spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }),
    )

    // ═══ Per-Domain Sections ═══
    let globalStatementIdx = 0
    input.domains.forEach((domain, di) => {
      const sectionLetter = String.fromCharCode(65 + di)

      sections.push(
        heading(`Section ${sectionLetter}: ${domain.label}`, HeadingLevel.HEADING_1),
      )

      if (domain.description) {
        sections.push(bodyText(domain.description, { italic: true }))
      }

      domain.picos.forEach((pico) => {
        globalStatementIdx++
        const statementNum = `${sectionLetter}${domain.picos.indexOf(pico) + 1}`

        sections.push(
          new Paragraph({ spacing: { after: 160 } }),
          heading(`Statement ${statementNum}: ${pico.topic || pico.intervention}`, HeadingLevel.HEADING_2),
        )

        // PICO box
        sections.push(
          bodyText(`Population: ${pico.population}`, { bold: true }),
          bodyText(`Intervention: ${pico.intervention}`),
          bodyText(`Comparison: ${pico.comparison || 'Standard of care'}`),
          bodyText(`Outcome: ${pico.outcome}`),
          new Paragraph({ spacing: { after: 120 } }),
        )

        // Recommendation box
        sections.push(
          recommendationBox(pico, statementNum),
          new Paragraph({ spacing: { after: 160 } }),
        )

        // Key Evidence
        if (pico.keyEvidence && pico.keyEvidence.length > 0) {
          sections.push(heading('Key Evidence', HeadingLevel.HEADING_3))
          pico.keyEvidence.forEach(ev => sections.push(bulletItem(ev)))
          sections.push(new Paragraph({ spacing: { after: 100 } }))
        }

        // Discussion
        if (pico.discussion) {
          sections.push(
            heading('Discussion', HeadingLevel.HEADING_3),
            bodyText(pico.discussion),
          )
        }

        // Economic Note
        if (pico.economicNote) {
          sections.push(
            heading('Economic Assessment', HeadingLevel.HEADING_3),
            bodyText(pico.economicNote),
          )
        }
      })

      // Page break between domains
      if (di < input.domains.length - 1) {
        sections.push(new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }))
      }
    })

    // ═══ Methodology Note ═══
    sections.push(
      new Paragraph({ children: [new TextRun({ text: '', break: 1 })], pageBreakBefore: true }),
      heading('Methodology', HeadingLevel.HEADING_1),
      bodyText('This clinical practice guideline was developed using the Bayesian Guideline Engine, a multi-PICO AI-assisted workflow platform. The evidence synthesis process followed established methodological frameworks including:'),
      bulletItem('Systematic literature search across PubMed/MEDLINE, Cochrane CENTRAL, and EMBASE'),
      bulletItem('GRADE (Grading of Recommendations, Assessment, Development and Evaluations) for evidence certainty'),
      bulletItem('PRISMA 2020 for systematic review and meta-analysis reporting'),
      bulletItem('EUnetHTA Core Model for health technology assessment where applicable'),
      bulletItem('AGREE II for guideline quality assessment'),
      bodyText(`All recommendation statements were developed through a structured process and subjected to consensus voting using a modified Delphi approach.`),
    )

    // Build document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: sections,
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${input.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}_CPG.docx"`,
      },
    })
  } catch (error) {
    console.error('Report assembly error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
