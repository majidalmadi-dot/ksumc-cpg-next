import { describe, it, expect } from 'vitest'
import { getSeedAuditLogs, logAudit, getAuditLogs } from '../audit'

describe('getSeedAuditLogs', () => {
  it('returns 18 seed entries', () => {
    const logs = getSeedAuditLogs()
    expect(logs).toHaveLength(18)
  })

  it('all entries have required fields', () => {
    for (const log of getSeedAuditLogs()) {
      expect(log.id).toBeTruthy()
      expect(log.action).toBeTruthy()
      expect(log.entity_type).toBeTruthy()
      expect(log.created_at).toBeTruthy()
    }
  })

  it('entries are ordered by time (newest last in seeds)', () => {
    const logs = getSeedAuditLogs()
    // Seeds are generated with decreasing time offsets, so the last entry is newest
    const first = new Date(logs[0].created_at).getTime()
    const last = new Date(logs[logs.length - 1].created_at).getTime()
    expect(last).toBeGreaterThan(first)
  })

  it('covers multiple action types', () => {
    const actions = new Set(getSeedAuditLogs().map((l) => l.action))
    expect(actions.size).toBeGreaterThan(5)
    expect(actions.has('project.created')).toBe(true)
    expect(actions.has('grade.assessed')).toBe(true)
    expect(actions.has('ai.query')).toBe(true)
  })
})

describe('logAudit (demo mode)', () => {
  it('adds to in-memory log and can be retrieved', async () => {
    await logAudit('project.created', 'project', 'test-proj-1', { title: 'Test' })

    const { logs, total } = await getAuditLogs(10, 0, { entityId: 'test-proj-1' })
    expect(total).toBeGreaterThanOrEqual(1)
    expect(logs[0].entity_id).toBe('test-proj-1')
    expect(logs[0].action).toBe('project.created')
  })
})

describe('getAuditLogs (demo mode)', () => {
  it('supports action filter', async () => {
    await logAudit('search.pubmed', 'search', null, { query: 'test' })
    const { logs } = await getAuditLogs(100, 0, { action: 'search.pubmed' })
    expect(logs.length).toBeGreaterThanOrEqual(1)
    for (const l of logs) {
      expect(l.action).toBe('search.pubmed')
    }
  })

  it('supports pagination', async () => {
    // Add enough entries
    for (let i = 0; i < 5; i++) {
      await logAudit('ai.query', 'ai_command', null, { index: i })
    }
    const page1 = await getAuditLogs(2, 0)
    const page2 = await getAuditLogs(2, 2)
    expect(page1.logs.length).toBe(2)
    expect(page2.logs.length).toBe(2)
    expect(page1.logs[0].id).not.toBe(page2.logs[0].id)
  })
})
