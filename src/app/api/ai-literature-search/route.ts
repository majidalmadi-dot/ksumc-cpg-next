import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════
   AI Literature Search API
   Searches PubMed eutils with a PICO-structured query and
   returns structured results for the AI workflow.
   ═══════════════════════════════════════════════════════════════ */

interface PICOInput {
  population: string
  intervention: string
  comparison?: string
  outcome: string
}

function buildPubMedQuery(pico: PICOInput): string {
  const parts: string[] = []
  if (pico.population) parts.push(`(${pico.population}[tiab])`)
  if (pico.intervention) parts.push(`(${pico.intervention}[tiab])`)
  if (pico.comparison) parts.push(`(${pico.comparison}[tiab])`)
  if (pico.outcome) parts.push(`(${pico.outcome}[tiab])`)
  return parts.join(' AND ')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { population, intervention, comparison, outcome } = body

    if (!population || !intervention || !outcome) {
      return NextResponse.json({ error: 'Missing required PICO fields' }, { status: 400 })
    }

    const query = buildPubMedQuery({ population, intervention, comparison, outcome })
    const maxResults = 15

    // Step 1: Search PubMed
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&retmax=${maxResults}&sort=relevance&term=${encodeURIComponent(query)}`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()
    const ids: string[] = searchData.esearchresult?.idlist || []
    const totalCount = parseInt(searchData.esearchresult?.count || '0')

    if (ids.length === 0) {
      return NextResponse.json({
        query,
        totalCount: 0,
        articles: [],
        fallback: true,
      })
    }

    // Step 2: Get article summaries
    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}`
    const summaryRes = await fetch(summaryUrl)
    const summaryData = await summaryRes.json()

    // Step 3: Get abstracts
    const abstractUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(',')}`
    const abstractRes = await fetch(abstractUrl)
    const abstractXml = await abstractRes.text()

    // Parse abstracts from XML
    const abstractMap: Record<string, string> = {}
    const abstractRegex = /<PubmedArticle>[\s\S]*?<PMID[^>]*>(\d+)<\/PMID>[\s\S]*?<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g
    let match
    while ((match = abstractRegex.exec(abstractXml)) !== null) {
      abstractMap[match[1]] = match[2].replace(/<[^>]+>/g, '').trim()
    }

    // Build structured results
    const articles = ids.map((id) => {
      const article = summaryData.result?.[id]
      if (!article) return null

      const authors = article.authors?.map((a: any) => a.name).join(', ') || 'Unknown'
      const year = parseInt(article.pubdate?.split(' ')[0] || '0')

      // Classify study type from title/journal
      const title = (article.title || '').toLowerCase()
      let studyType = 'Original Research'
      if (title.includes('systematic review') || title.includes('systematic literature')) studyType = 'Systematic Review'
      else if (title.includes('meta-analysis') || title.includes('meta analysis')) studyType = 'Meta-Analysis'
      else if (title.includes('randomized') || title.includes('randomised') || title.includes('rct')) studyType = 'RCT'
      else if (title.includes('cohort')) studyType = 'Cohort Study'
      else if (title.includes('trial')) studyType = 'Clinical Trial'
      else if (title.includes('guideline') || title.includes('recommendation')) studyType = 'Guideline'
      else if (title.includes('review')) studyType = 'Review'

      return {
        pmid: id,
        title: article.title || '',
        authors,
        journal: article.fulljournalname || article.source || '',
        year,
        studyType,
        abstract: abstractMap[id] || '',
        volume: article.volume || '',
        pages: article.pages || '',
        doi: article.elocationid || '',
      }
    }).filter(Boolean)

    // Compute study type distribution
    const studyTypeCounts: Record<string, number> = {}
    articles.forEach((a: any) => {
      studyTypeCounts[a.studyType] = (studyTypeCounts[a.studyType] || 0) + 1
    })

    return NextResponse.json({
      query,
      totalCount,
      articles,
      studyTypeCounts,
      rctCount: studyTypeCounts['RCT'] || 0,
      srCount: (studyTypeCounts['Systematic Review'] || 0) + (studyTypeCounts['Meta-Analysis'] || 0),
      fallback: false,
    })
  } catch (error) {
    console.error('Literature search error:', error)
    return NextResponse.json({
      query: '',
      totalCount: 0,
      articles: [],
      fallback: true,
      error: 'Search failed — using demo data',
    })
  }
}
