'use client'

import { useState, useRef } from 'react'
import Header from '@/components/Header'
import AISuggestionPanel from '@/components/AISuggestionPanel'
import ActivePICOBanner from '@/components/ActivePICOBanner'
import PipelineControls from '@/components/PipelineControls'
import { SEED_PROJECTS } from '@/lib/projects'
import type { Project } from '@/types/database'

type ReportType = 'full_guideline' | 'executive_summary' | 'grade_profile' | 'prisma_checklist' | 'agree_ii' | 'audit_trail'

interface ReportTemplate {
  id: ReportType
  title: string
  description: string
  icon: string
  format: string
}

interface GeneratedReport {
  id: string
  name: string
  project: string
  format: string
  date: string
  size: string
}

interface PrismaItem {
  id: number
  section: string
  item: string
  reported: 'yes' | 'no' | 'partial'
  reference: string
  comments: string
}

const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'full_guideline',
    title: 'Full Guideline Document',
    description: 'Comprehensive final guideline with all recommendations, evidence tables, methods',
    icon: '📄',
    format: 'PDF'
  },
  {
    id: 'executive_summary',
    title: 'Executive Summary',
    description: '2-page summary for leadership and policymakers',
    icon: '📋',
    format: 'PDF'
  },
  {
    id: 'grade_profile',
    title: 'GRADE Evidence Profile',
    description: 'Evidence certainty table export',
    icon: '📊',
    format: 'CSV'
  },
  {
    id: 'prisma_checklist',
    title: 'PRISMA Checklist',
    description: 'PRISMA 2020 compliance checklist (27 items)',
    icon: '✓',
    format: 'DOCX'
  },
  {
    id: 'agree_ii',
    title: 'AGREE II Assessment',
    description: 'Appraisal tool scoring export',
    icon: '⭐',
    format: 'PDF'
  },
  {
    id: 'audit_trail',
    title: 'Audit Trail Report',
    description: 'Full audit log export',
    icon: '📑',
    format: 'CSV'
  }
]

const PRISMA_ITEMS: PrismaItem[] = [
  { id: 1, section: 'Title & Abstract', item: 'Identification as a systematic review in title or abstract', reported: 'yes', reference: 'Page 1', comments: '' },
  { id: 2, section: 'Title & Abstract', item: 'PRISMA registration number and registration date', reported: 'yes', reference: 'Page 1, Footer', comments: '' },
  { id: 3, section: 'Title & Abstract', item: 'Structured abstract including PICO and main results', reported: 'partial', reference: 'Page 1', comments: 'Author names need expansion' },
  { id: 4, section: 'Introduction', item: 'Rationale and objectives clearly stated', reported: 'yes', reference: 'Page 2-3', comments: '' },
  { id: 5, section: 'Introduction', item: 'Link to PROSPERO or trial registry', reported: 'yes', reference: 'Page 2', comments: '' },
  { id: 6, section: 'Methods', item: 'Eligibility criteria for study selection', reported: 'yes', reference: 'Page 4-5', comments: '' },
  { id: 7, section: 'Methods', item: 'Information sources (databases, registries, etc.)', reported: 'yes', reference: 'Page 5', comments: '' },
  { id: 8, section: 'Methods', item: 'Search strategy with date ranges', reported: 'yes', reference: 'Page 5-6', comments: '' },
  { id: 9, section: 'Methods', item: 'Study selection process (independent reviewers)', reported: 'yes', reference: 'Page 6', comments: '' },
  { id: 10, section: 'Methods', item: 'Data extraction methods and tools', reported: 'partial', reference: 'Page 7', comments: 'Tool details in appendix' },
  { id: 11, section: 'Methods', item: 'Risk of bias assessment tool', reported: 'yes', reference: 'Page 7', comments: '' },
  { id: 12, section: 'Methods', item: 'Certainty of evidence assessment (GRADE)', reported: 'yes', reference: 'Page 8', comments: '' },
  { id: 13, section: 'Methods', item: 'Effect measures reported (RR, OR, MD, etc.)', reported: 'yes', reference: 'Page 8', comments: '' },
  { id: 14, section: 'Methods', item: 'Synthesis methods (meta-analysis or narrative)', reported: 'yes', reference: 'Page 9', comments: '' },
  { id: 15, section: 'Methods', item: 'Subgroup analysis methods', reported: 'partial', reference: 'Page 9-10', comments: 'Pre-specified subgroups listed' },
  { id: 16, section: 'Methods', item: 'Sensitivity analysis methods', reported: 'yes', reference: 'Page 10', comments: '' },
  { id: 17, section: 'Methods', item: 'Assessment of reporting bias (funnel plot)', reported: 'no', reference: '', comments: 'Limited number of studies' },
  { id: 18, section: 'Methods', item: 'Protocol deviation (if any)', reported: 'yes', reference: 'Page 11', comments: '' },
  { id: 19, section: 'Methods', item: 'Statistical software and packages used', reported: 'yes', reference: 'Page 12', comments: '' },
  { id: 20, section: 'Results', item: 'Study flow diagram (PRISMA flow chart)', reported: 'yes', reference: 'Figure 1, Page 13', comments: '' },
  { id: 21, section: 'Results', item: 'Study characteristics table', reported: 'yes', reference: 'Table 1, Page 14-15', comments: '' },
  { id: 22, section: 'Results', item: 'Risk of bias in individual studies', reported: 'yes', reference: 'Table 2, Page 16', comments: '' },
  { id: 23, section: 'Results', item: 'Results of individual studies and syntheses', reported: 'yes', reference: 'Page 17-25', comments: '' },
  { id: 24, section: 'Discussion', item: 'Summary of findings per outcome', reported: 'yes', reference: 'Page 26-27', comments: '' },
  { id: 25, section: 'Discussion', item: 'Interpretation and implications', reported: 'yes', reference: 'Page 28-30', comments: '' },
  { id: 26, section: 'Other', item: 'Sources of funding and conflicts of interest', reported: 'yes', reference: 'Page 31', comments: '' },
  { id: 27, section: 'Other', item: 'Data availability and registration update', reported: 'partial', reference: 'Page 31', comments: 'Full data available on request' }
]

export default function ReportsPage() {
  const [selectedProject, setSelectedProject] = useState<string>(SEED_PROJECTS[0]?.id || '')
  const [selectedTemplates, setSelectedTemplates] = useState<Set<ReportType>>(new Set())
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationMessage, setGenerationMessage] = useState('')
  const [language, setLanguage] = useState('en')
  const [includeAppendices, setIncludeAppendices] = useState(true)
  const [includeAIMetadata, setIncludeAIMetadata] = useState(false)
  const [watermark, setWatermark] = useState('None')
  const [attributionStyle, setAttributionStyle] = useState('Full names')
  const [prismaItems, setPrismaItems] = useState<PrismaItem[]>(PRISMA_ITEMS)

  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([
    { id: '1', name: 'Asthma Guidelines - Full Document', project: 'Asthma Management in Adults', format: 'PDF', date: '2025-03-15', size: '2.4 MB' },
    { id: '2', name: 'Asthma - Executive Summary', project: 'Asthma Management in Adults', format: 'PDF', date: '2025-03-15', size: '0.8 MB' },
    { id: '3', name: 'Diabetes T2 - GRADE Profile', project: 'Type 2 Diabetes Primary Care', format: 'CSV', date: '2025-03-12', size: '0.1 MB' },
    { id: '4', name: 'HTN Guidelines - PRISMA Checklist', project: 'Hypertension Guidelines 2025', format: 'DOCX', date: '2025-03-10', size: '0.5 MB' },
    { id: '5', name: 'CRC Screening - Audit Trail', project: 'Colorectal Cancer Screening', format: 'CSV', date: '2025-03-08', size: '0.3 MB' }
  ])

  const project = SEED_PROJECTS.find(p => p.id === selectedProject)

  const toggleTemplate = (templateId: ReportType) => {
    const newSet = new Set(selectedTemplates)
    if (newSet.has(templateId)) {
      newSet.delete(templateId)
    } else {
      newSet.add(templateId)
    }
    setSelectedTemplates(newSet)
  }

  const generateReport = async (templateId: ReportType) => {
    if (!selectedProject) {
      setGenerationMessage('Please select a project first')
      return
    }

    setIsGenerating(true)
    setGenerationMessage('Generating report...')

    try {
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          reportType: templateId,
          language,
          includeAppendices,
          watermark: watermark === 'None' ? null : watermark
        })
      })

      if (!response.ok) throw new Error('Failed to generate report')
      const data = await response.json()

      const newReport: GeneratedReport = {
        id: Date.now().toString(),
        name: `${project?.title} - ${REPORT_TEMPLATES.find(t => t.id === templateId)?.title}`,
        project: project?.title || 'Unknown',
        format: data.format || 'PDF',
        date: new Date().toISOString().split('T')[0],
        size: '0.5 MB'
      }

      setGeneratedReports(prev => [newReport, ...prev])
      setGenerationMessage(`Report generated successfully!`)
      setTimeout(() => setGenerationMessage(''), 3000)
    } catch (error) {
      setGenerationMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const exportSelected = async () => {
    if (selectedTemplates.size === 0) {
      setGenerationMessage('Please select at least one template')
      return
    }

    setIsGenerating(true)
    setGenerationMessage(`Generating ${selectedTemplates.size} reports...`)

    try {
      const ids = Array.from(selectedTemplates)
      for (let i = 0; i < ids.length; i++) {
        await generateReport(ids[i])
      }
      setSelectedTemplates(new Set())
      setGenerationMessage('All reports generated successfully!')
      setTimeout(() => setGenerationMessage(''), 3000)
    } finally {
      setIsGenerating(false)
    }
  }

  const updatePrismaItem = (id: number, field: 'reported' | 'reference' | 'comments', value: string) => {
    setPrismaItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value as any } : item
    ))
  }

  const prismaCompletion = Math.round((prismaItems.filter(i => i.reported === 'yes').length / prismaItems.length) * 100)
  const groupedPrisma = prismaItems.reduce((acc, item) => {
    const section = item.section
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {} as Record<string, PrismaItem[]>)

  const styles = {
    container: { padding: '24px 32px' },
    section: { marginBottom: '32px' },
    sectionTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#1A1A1A' },
    card: { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' },
    gridCard: { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '16px', textAlign: 'center' as const },
    button: { padding: '8px 16px', borderRadius: '6px', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
    primaryButton: { background: '#D97757', color: 'white' },
    secondaryButton: { background: '#F5F5F0', color: '#1A1A1A', border: '1px solid #E5E5E0' },
    input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px' },
    badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 },
    select: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6' }
  }

  return (
    <>
      <Header title="Reports & Export" subtitle="Generate and export clinical practice guidelines in multiple formats" />
      <ActivePICOBanner moduleId="report" />

      <div style={styles.container}>
        <AISuggestionPanel
          pageId="report"
          title="AI Report Generation"
          fields={[
            { key: 'reportTypes', label: 'Recommended Reports' },
            { key: 'prismaCompliance', label: 'PRISMA Compliance' },
            { key: 'keyFindings', label: 'Key Findings Summary' },
          ]}
          onApply={(data) => {
            if (data.reportTypes) {
              const types = new Set<ReportType>(['full_guideline', 'executive_summary', 'grade_profile'] as ReportType[])
              setSelectedTemplates(types)
            }
          }}
        />
        {/* Project Selector */}
        <div style={{ ...styles.section, ...styles.card }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#1A1A1A' }}>Select Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              style={{ ...styles.select, width: '100%', maxWidth: '400px' }}
            >
              <option value="">-- Choose a project --</option>
              {SEED_PROJECTS.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>
          {project && (
            <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
              <div><strong>Description:</strong> {project.description}</div>
              <div><strong>Status:</strong> {project.status.replace('_', ' ')}</div>
              {project.target_population && <div><strong>Population:</strong> {project.target_population}</div>}
            </div>
          )}
        </div>

        {/* Export Settings Panel */}
        <div style={{ ...styles.section, ...styles.card }}>
          <h3 style={styles.sectionTitle}>Export Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#1A1A1A' }}>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.select}>
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#1A1A1A' }}>Watermark</label>
              <select value={watermark} onChange={(e) => setWatermark(e.target.value)} style={styles.select}>
                <option value="None">None</option>
                <option value="Draft">Draft</option>
                <option value="Final">Final</option>
                <option value="Confidential">Confidential</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#1A1A1A' }}>Author Attribution</label>
              <select value={attributionStyle} onChange={(e) => setAttributionStyle(e.target.value)} style={styles.select}>
                <option value="Full names">Full Names</option>
                <option value="Initials">Initials</option>
                <option value="Committee">Committee Only</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeAppendices}
                  onChange={(e) => setIncludeAppendices(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Include Appendices</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={includeAIMetadata}
                  onChange={(e) => setIncludeAIMetadata(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>Include AI Methodology Notes</span>
              </label>
            </div>
          </div>
        </div>

        {/* Report Templates Gallery */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Report Templates</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
            {REPORT_TEMPLATES.map(template => (
              <div key={template.id} style={{ ...styles.card, padding: '16px', position: 'relative' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>{template.icon}</div>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px', color: '#1A1A1A' }}>{template.title}</h4>
                <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', lineHeight: 1.4 }}>{template.description}</p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                  <span style={{ ...styles.badge, background: '#FEF3C7', color: '#92400E' }}>{template.format}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => generateReport(template.id)}
                    disabled={isGenerating || !selectedProject}
                    style={{
                      ...styles.button,
                      ...styles.primaryButton,
                      opacity: isGenerating || !selectedProject ? 0.6 : 1,
                      cursor: isGenerating || !selectedProject ? 'default' : 'pointer',
                      flex: 1
                    }}
                  >
                    Generate
                  </button>
                  <label style={{
                    ...styles.button,
                    ...styles.secondaryButton,
                    flex: 0,
                    padding: '8px 10px',
                    margin: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedTemplates.has(template.id)}
                      onChange={() => toggleTemplate(template.id)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Batch Export */}
          {selectedTemplates.size > 0 && (
            <div style={{ ...styles.card, background: '#F5F5F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>{selectedTemplates.size} template(s) selected</span>
                <button
                  onClick={exportSelected}
                  disabled={isGenerating}
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    opacity: isGenerating ? 0.6 : 1,
                    cursor: isGenerating ? 'default' : 'pointer'
                  }}
                >
                  Export Selected ({selectedTemplates.size})
                </button>
              </div>
            </div>
          )}

          {generationMessage && (
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: '6px', background: '#DCFCE7', color: '#166534', fontSize: '13px' }}>
              {generationMessage}
            </div>
          )}
        </div>

        {/* Citation Export Section */}
        <div style={{ ...styles.section, ...styles.card }}>
          <h3 style={styles.sectionTitle}>Citation Export Formats</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { name: 'RIS Format', format: '.ris', desc: 'Research Information Systems' },
              { name: 'BibTeX', format: '.bib', desc: 'Bibliography Database' },
              { name: 'EndNote XML', format: '.xml', desc: 'EndNote Compatibility' },
              { name: 'CSV Export', format: '.csv', desc: 'Spreadsheet Format' }
            ].map(fmt => (
              <div key={fmt.format} style={{ ...styles.gridCard }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#D97757', marginBottom: '4px' }}>{fmt.format.toUpperCase()}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{fmt.name}</div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '10px' }}>{fmt.desc}</div>
                <button
                  disabled={!selectedProject}
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    width: '100%',
                    opacity: !selectedProject ? 0.6 : 1,
                    cursor: !selectedProject ? 'default' : 'pointer'
                  }}
                >
                  Export
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '12px', padding: '8px', background: '#F9F9F7', borderRadius: '6px' }}>
            CSV format includes columns: Title, Authors, Journal, Year, DOI, PMID
          </div>
        </div>

        {/* Generated Reports History */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Generated Reports History</h3>
          <div style={{ ...styles.card, padding: '0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E5E0' }}>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Report Name</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Project</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Format</th>
                  <th style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 600 }}>Date</th>
                  <th style={{ textAlign: 'center', padding: '12px 14px', fontWeight: 600 }}>Size</th>
                  <th style={{ padding: '12px 14px' }}></th>
                </tr>
              </thead>
              <tbody>
                {generatedReports.map(report => (
                  <tr key={report.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{report.name}</td>
                    <td style={{ padding: '12px 14px', color: '#6B7280', fontSize: '12px' }}>{report.project}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ ...styles.badge, background: '#FEF3C7', color: '#92400E' }}>{report.format}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#6B7280', fontSize: '12px' }}>{report.date}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>{report.size}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        style={{
                          ...styles.button,
                          ...styles.primaryButton,
                          fontSize: '11px',
                          padding: '4px 12px'
                        }}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PRISMA Checklist Interactive */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>PRISMA 2020 Checklist</h3>
          <div style={{ ...styles.card, marginBottom: '16px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Completion Progress</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#D97757' }}>{prismaCompletion}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: '#E5E5E0', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${prismaCompletion}%`, height: '100%', background: '#D97757', transition: 'width 0.3s' }}></div>
              </div>
            </div>
          </div>

          {Object.entries(groupedPrisma).map(([section, items]) => (
            <div key={section} style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A', marginBottom: '12px', padding: '8px 12px', background: '#FAF9F6', borderRadius: '6px' }}>
                {section}
              </h4>
              <div style={{ ...styles.card, padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E5E5E0', background: '#F9F9F7' }}>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, width: '60px' }}>Item</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Checklist Item</th>
                      <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 600, width: '100px' }}>Reported</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600, width: '140px' }}>Page/Section</th>
                      <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 600 }}>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'center' }}>{item.id}</td>
                        <td style={{ padding: '10px 12px', color: '#1A1A1A', lineHeight: 1.4 }}>{item.item}</td>
                        <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                          <select
                            value={item.reported}
                            onChange={(e) => updatePrismaItem(item.id, 'reported', e.target.value)}
                            style={{
                              ...styles.input,
                              fontSize: '11px',
                              padding: '4px 6px',
                              border: '1px solid #D97757'
                            }}
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="partial">Partial</option>
                          </select>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="text"
                            value={item.reference}
                            onChange={(e) => updatePrismaItem(item.id, 'reference', e.target.value)}
                            placeholder="e.g., Page 5"
                            style={{
                              ...styles.input,
                              fontSize: '11px',
                              padding: '4px 6px',
                              width: '100%'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="text"
                            value={item.comments}
                            onChange={(e) => updatePrismaItem(item.id, 'comments', e.target.value)}
                            placeholder="Optional notes"
                            style={{
                              ...styles.input,
                              fontSize: '11px',
                              padding: '4px 6px',
                              width: '100%'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{ ...styles.card, background: '#DCFCE7', marginTop: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '6px' }}>PRISMA Completion: {prismaCompletion}%</div>
            <div style={{ fontSize: '12px', color: '#166534' }}>
              {prismaItems.filter(i => i.reported === 'yes').length} of {prismaItems.length} items reported
            </div>
          </div>
        </div>
      </div>
      <PipelineControls moduleId="report" />
    </>
  )
}
