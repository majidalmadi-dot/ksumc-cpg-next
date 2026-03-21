import { describe, it, expect, beforeEach } from 'vitest'
import { SEED_PROJECTS, getProjects, getProjectStats, createProject, updateProject, deleteProject, resetDemoProjects } from '../projects'

describe('SEED_PROJECTS', () => {
  it('contains 16 projects', () => {
    expect(SEED_PROJECTS).toHaveLength(16)
  })

  it('all projects have required fields', () => {
    for (const p of SEED_PROJECTS) {
      expect(p.id).toBeTruthy()
      expect(p.title).toBeTruthy()
      expect(p.status).toBeTruthy()
      expect(p.pathway).toBeTruthy()
      expect(p.created_at).toBeTruthy()
      expect(p.updated_at).toBeTruthy()
    }
  })

  it('has valid statuses', () => {
    const validStatuses = ['planning', 'scoping', 'evidence_search', 'grade_appraisal', 'etr_consensus', 'external_review', 'published', 'archived']
    for (const p of SEED_PROJECTS) {
      expect(validStatuses).toContain(p.status)
    }
  })

  it('has valid pathways', () => {
    const validPathways = ['de_novo', 'adaptation', 'adoption']
    for (const p of SEED_PROJECTS) {
      expect(validPathways).toContain(p.pathway)
    }
  })

  it('published projects have agree_ii_score', () => {
    const published = SEED_PROJECTS.filter((p) => p.status === 'published')
    expect(published.length).toBeGreaterThan(0)
    for (const p of published) {
      expect(p.agree_ii_score).toBeGreaterThan(0)
      expect(p.published_at).toBeTruthy()
    }
  })
})

describe('getProjects (demo mode)', () => {
  beforeEach(() => resetDemoProjects())

  it('returns all seed projects', async () => {
    const projects = await getProjects()
    expect(projects.length).toBeGreaterThanOrEqual(16)
  })
})

describe('getProjectStats (demo mode)', () => {
  beforeEach(() => resetDemoProjects())

  it('calculates stats correctly', async () => {
    const stats = await getProjectStats()
    expect(stats.total).toBe(16)
    expect(stats.published).toBe(4) // Asthma, Vaccination, Neonatal, HepC
    expect(stats.inDevelopment).toBeGreaterThan(0)
    expect(stats.avgAgree).toBeGreaterThan(0)
    expect(stats.avgAgree).toBeLessThanOrEqual(100)
  })
})

describe('createProject (demo mode)', () => {
  beforeEach(() => resetDemoProjects())

  it('creates a new project and adds to store', async () => {
    const project = await createProject({
      title: 'Test Guideline',
      description: 'Test description',
      status: 'planning',
      pathway: 'de_novo',
    })

    expect(project.title).toBe('Test Guideline')
    expect(project.id).toBeTruthy()
    expect(project.status).toBe('planning')

    const all = await getProjects()
    expect(all.length).toBe(17) // 16 + 1
    expect(all[0].title).toBe('Test Guideline') // added to front
  })
})

describe('updateProject (demo mode)', () => {
  beforeEach(() => resetDemoProjects())

  it('updates a project in the store', async () => {
    const updated = await updateProject('1', { title: 'Updated Title' })
    expect(updated.title).toBe('Updated Title')

    const all = await getProjects()
    const found = all.find((p) => p.id === '1')
    expect(found?.title).toBe('Updated Title')
  })
})

describe('deleteProject (demo mode)', () => {
  beforeEach(() => resetDemoProjects())

  it('removes a project from the store', async () => {
    await deleteProject('1')
    const all = await getProjects()
    expect(all.length).toBe(15)
    expect(all.find((p) => p.id === '1')).toBeUndefined()
  })
})
