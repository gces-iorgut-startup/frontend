import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { TutorsService } from '../tutors.service'

vi.mock('../api', () => ({ api: { get: vi.fn() } }))

const tutors = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: `t${offset + i}` }))

describe('TutorsService.listAll', () => {
  beforeEach(() => vi.clearAllMocks())

  it('percorre todas as páginas até atingir o total', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: { tutors: tutors(100), total: 130 } })
      .mockResolvedValueOnce({ data: { tutors: tutors(30, 100), total: 130 } })

    const result = await TutorsService.listAll()

    expect(result).toHaveLength(130)
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('para após a primeira página quando já veio tudo', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { tutors: tutors(3), total: 3 } })

    await TutorsService.listAll()

    expect(api.get).toHaveBeenCalledTimes(1)
  })
})
