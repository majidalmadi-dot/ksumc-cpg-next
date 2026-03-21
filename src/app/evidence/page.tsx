'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import AIAssistant from '@/components/AIAssistant'

interface Article {
  uid: string
  title: string
  authors: { name: string }[]
  source: string
  pubdate: string
  volume: string
  pages: string
  fulljournalname: string
}

const STUDY_TYPES = [
  { label: 'Systematic Review', filter: 'systematic[sb]' },
  { label: 'RCT', filter: 'randomized controlled trial[pt]' },
  { label: 'Meta-Analysis', filter: 'meta-analysis[pt]' },
  { label: 'Clinical Trial', filter: 'clinical trial[pt]' },
  { label: 'Cohort Study', filter: 'cohort[tiab]' },
  { label: 'Guideline', filter: 'guideline[pt]' },
]

export default function EvidencePage() {
  const [pico, setPico] = useState({ p: '', i: '', c: '', o: '' })
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Article[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedAbstracts, setExpandedAbstracts] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [studyTypes, setStudyTypes] = useState<Set<string>>(new Set())
  const [maxResults, setMaxResults] = useState(25)
  const [abstracts, setAbstracts] = useState<Record<string, string>>({})

  function buildPicoQuery() {
    const parts = []
    if (pico.p) parts.push(`(${pico.p}[tiab])`)
    if (pico.i) parts.push(`(${pico.i}[tiab])`)
    if (pico.c) parts.push(`(${pico.c}[tiab])`)
    if (pico.o) parts.push(`(${pico.o}[tiab])`)
    const q = parts.join(' AND ')
    setQuery(q)
    return q
  }

  async function search(searchQuery?: string) {
    const q = searchQuery || query
    if (!q.trim()) return
    setLoading(true)
    try {
      let fullQuery = q
      const filters = []
      if (yearFrom || yearTo) filters.push(`${yearFrom || '1900'}:${yearTo || '2099'}[dp]`)
      studyTypes.forEach((st) => { const t = STUDY_TYPES.find((s) => s.label === st); if (t) filters.push(t.filter) })
      if (filters.length) fullQuery += ' AND ' + filters.join(' AND ')

      const searchRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${maxResults}&term=${encodeURIComponent(fullQuery)}`)
      const searchData = await searchRes.json()
      const ids: string[] = searchData.esearchresult?.idlist || []
      setTotalCount(parseInt(searchData.esearchresult?.count || '0'))

      if (ids.length === 0) { setResults([]); setLoading(false); return }

      const summaryRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`)
      const summaryData = await summaryRes.json()
      const articles: Article[] = ids.map((id) => summaryData.result?.[id]).filter(Boolean)
      setResults(articles)

      // Fetch abstracts
      const abstractRes = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(',')}`)
      const abstractXml = await abstractRes.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(abstractXml, 'text/xml')
      const absMap: Record<string, string> = {}
      doc.querySelectorAll('PubmedArticle').forEach((art) => {
        const pmid = art.querySelector('PMID')?.textContent || ''
        const absText = Array.from(art.querySelectorAll('AbstractText')).map((a) => a.textContent).join(' ')
        if (pmid && absText) absMap[pmid] = absText
      })
      setAbstracts(absMap)
    } catch (err) {
      console.error('PubMed search error:', err)
    }
    setLoading(false)
  }

  function toggleSelected(uid: string) {
    const next = new Set(selected)
    next.has(uid) ? next.delete(uid) : next.add(uid)
    setSelected(next)
  }

  function exportCitations(format: 'txt' | 'csv' | 'ris' = 'txt') {
    const items = results.filter((a) => selected.has(a.uid))
    if (items.length === 0) return

    let content = ''
    let filename = ''
    let mimeType = 'text/plain'

    if (format === 'csv') {
      const header = 'PMID,Title,Authors,Journal,Year,Volume,Pages'
      const rows = items.map((a) => {
        const authors = a.authors?.map((au) => au.name).join('; ') || ''
        const title = a.title.replace(/"/g, '""')
        return `${a.uid},"${title}","${authors}","${a.fulljournalname || a.source}","${a.pubdate}","${a.volume}","${a.pages}"`
      })
      content = [header, ...rows].join('\n')
      filename = 'citations_export.csv'
      mimeType = 'text/csv'
    } else if (format === 'ris') {
      content = items.map((a) => {
        const lines = [
          'TY  - JOUR',
          ...a.authors?.map((au) => `AU  - ${au.name}`) || [],
          `TI  - ${a.title}`,
          `JO  - ${a.fulljournalname || a.source}`,
          `PY  - ${a.pubdate?.split(' ')[0] || ''}`,
          `VL  - ${a.volume || ''}`,
          `SP  - ${a.pages || ''}`,
          `AN  - ${a.uid}`,
          `UR  - https://pubmed.ncbi.nlm.nih.gov/${a.uid}/`,
          abstracts[a.uid] ? `AB  - ${abstracts[a.uid]}` : '',
          'ER  - ',
        ].filter(Boolean)
        return lines.join('\n')
      }).join('\n\n')
      filename = 'citations_export.ris'
    } else {
      content = items.map((a, i) => {
        const authors = a.authors?.slice(0, 3).map((au) => au.name).join(', ') + (a.authors?.length > 3 ? ', et al.' : '')
        return `${i + 1}. ${authors}. ${a.title} ${a.fulljournalname || a.source}. ${a.pubdate};${a.volume}:${a.pages}. PMID: ${a.uid}`
      }).join('\n\n')
      filename = 'citations_export.txt'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #E5E5E0', fontSize: '13px', background: '#FAF9F6', boxSizing: 'border-box' }
  const card: React.CSSProperties = { background: 'white', borderRadius: '10px', border: '1px solid #E5E5E0', padding: '20px' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }

  return (
    <>
      <Header title="Evidence Search" subtitle="PubMed and systematic literature search" />
      <div style={{ padding: '24px 32px' }}>
        {/* PICO Builder */}
        <div style={{ ...card, marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>PICO Query Builder</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Population</label><input style={inp} value={pico.p} onChange={(e) => setPico({ ...pico, p: e.target.value })} placeholder="e.g., adults with hypertension" /></div>
            <div><label style={lbl}>Intervention</label><input style={inp} value={pico.i} onChange={(e) => setPico({ ...pico, i: e.target.value })} placeholder="e.g., ACE inhibitors" /></div>
            <div><label style={lbl}>Comparison</label><input style={inp} value={pico.c} onChange={(e) => setPico({ ...pico, c: e.target.value })} placeholder="e.g., ARBs" /></div>
            <div><label style={lbl}>Outcome</label><input style={inp} value={pico.o} onChange={(e) => setPico({ ...pico, o: e.target.value })} placeholder="e.g., mortality" /></div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button onClick={() => { const q = buildPicoQuery(); search(q) }} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Build & Search</button>
            {query && <div style={{ flex: 1, fontSize: '12px', color: '#6B7280', fontFamily: 'monospace', background: '#F3F4F6', padding: '6px 10px', borderRadius: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{query}</div>}
          </div>
        </div>

        {/* Direct Search */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input style={{ ...inp, flex: 1 }} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Search PubMed..." />
          <button onClick={() => search()} disabled={loading} style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Searching...' : 'Search'}</button>
          <button onClick={() => setFiltersOpen(!filtersOpen)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #E5E5E0', background: 'white', fontSize: '13px', cursor: 'pointer' }}>Filters {filtersOpen ? '▴' : '▾'}</button>
        </div>

        {/* Filters */}
        {filtersOpen && (
          <div style={{ ...card, marginBottom: '16px', padding: '14px 20px' }}>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div><label style={lbl}>From Year</label><input type="number" style={{ ...inp, width: '100px' }} value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="2000" /></div>
              <div><label style={lbl}>To Year</label><input type="number" style={{ ...inp, width: '100px' }} value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="2026" /></div>
              <div><label style={lbl}>Max Results</label><select style={{ ...inp, width: '80px' }} value={maxResults} onChange={(e) => setMaxResults(parseInt(e.target.value))}><option>10</option><option>25</option><option>50</option><option>100</option></select></div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {STUDY_TYPES.map((st) => (
                  <label key={st.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={studyTypes.has(st.label)} onChange={(e) => { const n = new Set(studyTypes); e.target.checked ? n.add(st.label) : n.delete(st.label); setStudyTypes(n) }} />
                    {st.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results + AI + Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          {/* Results */}
          <div>
            {totalCount > 0 && <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>Showing {results.length} of {totalCount.toLocaleString()} results</div>}
            {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>Searching PubMed...</div>}
            {!loading && results.length === 0 && query && <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>No results found. Try adjusting your search terms.</div>}
            {results.map((a) => (
              <div key={a.uid} style={{ ...card, marginBottom: '12px', padding: '16px', borderLeft: selected.has(a.uid) ? '3px solid #D97757' : '3px solid transparent' }}>
                <a href={`https://pubmed.ncbi.nlm.nih.gov/${a.uid}/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', textDecoration: 'none', lineHeight: 1.4, display: 'block', marginBottom: '6px' }}>{a.title}</a>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                  {a.authors?.slice(0, 3).map((au) => au.name).join(', ')}{a.authors?.length > 3 ? ', et al.' : ''}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontStyle: 'italic' }}>{a.fulljournalname || a.source}</span>
                  <span>{a.pubdate}</span>
                  {a.volume && <span>{a.volume}:{a.pages}</span>}
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '3px', background: '#EFF6FF', color: '#3B82F6', fontWeight: 600 }}>PMID: {a.uid}</span>
                </div>
                {abstracts[a.uid] && (
                  <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5, marginBottom: '8px' }}>
                    {expandedAbstracts.has(a.uid) ? abstracts[a.uid] : abstracts[a.uid].slice(0, 200) + '...'}
                    <button onClick={() => { const n = new Set(expandedAbstracts); n.has(a.uid) ? n.delete(a.uid) : n.add(a.uid); setExpandedAbstracts(n) }} style={{ border: 'none', background: 'none', color: '#D97757', fontSize: '12px', cursor: 'pointer', fontWeight: 600, marginLeft: '4px' }}>{expandedAbstracts.has(a.uid) ? 'Less' : 'More'}</button>
                  </div>
                )}
                <button onClick={() => toggleSelected(a.uid)} style={{ padding: '4px 14px', borderRadius: '5px', border: selected.has(a.uid) ? '1px solid #D97757' : '1px solid #E5E5E0', background: selected.has(a.uid) ? '#FEF3EC' : 'white', color: selected.has(a.uid) ? '#D97757' : '#6B7280', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {selected.has(a.uid) ? 'Included' : 'Include in Review'}
                </button>
              </div>
            ))}
          </div>

          {/* AI + Selected Sidebar */}
          <div style={{ position: 'sticky', top: '24px', alignSelf: 'start', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <AIAssistant
              context={`User is on the Evidence Search page. They are searching PubMed for clinical evidence. Current PICO: P="${pico.p}" I="${pico.i}" C="${pico.c}" O="${pico.o}". Current query: "${query}". ${results.length} results found, ${selected.size} selected. ${Object.keys(abstracts).length} abstracts loaded.`}
              placeholder="Ask about search strategy..."
              compact
              quickActions={[
                { label: 'Refine my PICO', prompt: `Help me refine this PICO question: Population="${pico.p || '(not set)'}", Intervention="${pico.i || '(not set)'}", Comparison="${pico.c || '(not set)'}", Outcome="${pico.o || '(not set)'}". Suggest more precise terms and MeSH headings.` },
                { label: 'Optimize search', prompt: `My current PubMed query is: ${query || '(empty)'}. Suggest ways to improve it — add MeSH terms, synonyms, or Boolean operators to capture more relevant evidence.` },
                { label: 'Suggest filters', prompt: `I'm searching for "${query || 'clinical evidence'}". What study type filters and date range would you recommend for a systematic review? I have ${results.length} results so far.` },
                { label: 'Summarize selected', prompt: `I have ${selected.size} articles selected. Based on the search topic "${query}", what should I look for when screening these articles? What inclusion/exclusion criteria would you suggest?` },
              ]}
            />
            <div style={card}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Selected Articles ({selected.size})</h3>
              {selected.size === 0 && <div style={{ fontSize: '12px', color: '#6B7280' }}>Click &quot;Include in Review&quot; to add articles here.</div>}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {results.filter((a) => selected.has(a.uid)).map((a) => (
                  <div key={a.uid} style={{ padding: '8px 0', borderBottom: '1px solid #F3F4F6', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, fontSize: '12px', lineHeight: 1.4 }}>{a.title}</div>
                    <button onClick={() => toggleSelected(a.uid)} style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '14px', cursor: 'pointer', padding: '0', lineHeight: 1 }}>x</button>
                  </div>
                ))}
              </div>
              {selected.size > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Export Format</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => exportCitations('txt')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: '#D97757', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>TXT</button>
                    <button onClick={() => exportCitations('csv')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #D97757', background: 'white', color: '#D97757', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>CSV</button>
                    <button onClick={() => exportCitations('ris')} style={{ flex: 1, padding: '6px', borderRadius: '6px', border: '1px solid #D97757', background: 'white', color: '#D97757', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>RIS</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
