import { NextRequest, NextResponse } from 'next/server'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { SEED_PROJECTS } from '@/lib/projects'

export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') || 'json'
  const type = request.nextUrl.searchParams.get('type') || 'projects'

  try {
    let data: Record<string, unknown>[] = []

    if (type === 'projects') {
      if (isSupabaseConfigured) {
        const { data: dbData, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false })
        if (!error && dbData) data = dbData
        else data = SEED_PROJECTS as unknown as Record<string, unknown>[]
      } else {
        data = SEED_PROJECTS as unknown as Record<string, unknown>[]
      }
    } else if (type === 'audit' && isSupabaseConfigured) {
      const { data: dbData, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (!error && dbData) data = dbData
    }

    if (format === 'csv') {
      if (data.length === 0) {
        return new NextResponse('No data', { status: 404 })
      }
      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map((row) =>
          headers.map((h) => {
            const val = row[h]
            if (val === null || val === undefined) return ''
            const str = Array.isArray(val) ? val.join('; ') : String(val)
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str
          }).join(',')
        ),
      ]
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=${type}_export_${new Date().toISOString().slice(0, 10)}.csv`,
        },
      })
    }

    // JSON format
    return NextResponse.json({
      exported_at: new Date().toISOString(),
      type,
      count: data.length,
      data,
    }, {
      headers: {
        'Content-Disposition': `attachment; filename=${type}_export_${new Date().toISOString().slice(0, 10)}.json`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
