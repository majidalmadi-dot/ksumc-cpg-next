import { NextResponse } from 'next/server'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { SEED_PROJECTS } from '@/lib/projects'

export async function POST() {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 400 })
  }

  try {
    // Upsert all seed projects
    const { data, error } = await supabase
      .from('projects')
      .upsert(
        SEED_PROJECTS.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          status: p.status,
          pathway: p.pathway,
          icd_codes: p.icd_codes,
          target_population: p.target_population,
          agree_ii_score: p.agree_ii_score,
          created_at: p.created_at,
          updated_at: p.updated_at,
          target_date: p.target_date,
          published_at: p.published_at,
        })),
        { onConflict: 'id' }
      )
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Seeded ${data?.length ?? 0} projects`,
      count: data?.length ?? 0,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
