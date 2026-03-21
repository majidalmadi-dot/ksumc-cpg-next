import { describe, it, expect } from 'vitest'
import { addCommitteeMember, getDemoCommitteeMembers, castDelphiVote, getDemoVotes, saveGradeAssessment, getDemoGradeAssessments } from '../mutations'

describe('addCommitteeMember', () => {
  it('creates a member and stores in demo', async () => {
    const member = await addCommitteeMember({
      projectId: 'proj-1',
      name: 'Dr. Test User',
      email: 'test@ksumc.edu.sa',
      institution: 'KSUMC',
      role: 'Chair',
      specialty: 'Cardiology',
    })

    expect(member.id).toBeTruthy()
    expect(member.name).toBe('Dr. Test User')
    expect(member.coi_status).toBe('pending')

    const all = getDemoCommitteeMembers()
    expect(all.some((m) => m.id === member.id)).toBe(true)
  })
})

describe('castDelphiVote', () => {
  it('records a vote', async () => {
    const vote = await castDelphiVote({
      roundId: 'round-1',
      recommendationId: 'rec-1',
      value: 8,
      comment: 'Strong agreement',
    })

    expect(vote.id).toBeTruthy()
    expect(vote.value).toBe(8)
    expect(vote.voter_id).toBe('demo-user')

    const roundVotes = getDemoVotes('round-1')
    expect(roundVotes.length).toBeGreaterThanOrEqual(1)
  })
})

describe('saveGradeAssessment', () => {
  it('saves an assessment', async () => {
    const assessment = await saveGradeAssessment({
      projectId: 'proj-1',
      outcome: 'Mortality at 30 days',
      studyDesign: 'rct',
      numStudies: 5,
      riskOfBias: 'not_serious',
      inconsistency: 'not_serious',
      indirectness: 'not_serious',
      imprecision: 'serious',
      publicationBias: 'unlikely',
      largeEffect: false,
      doseResponse: false,
      plausibleConfounding: false,
      certainty: 'Moderate',
    })

    expect(assessment.id).toBeTruthy()
    expect(assessment.certainty).toBe('Moderate')

    const all = getDemoGradeAssessments('proj-1')
    expect(all.length).toBeGreaterThanOrEqual(1)
  })
})
