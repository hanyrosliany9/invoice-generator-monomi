import { describe, expect, it } from 'vitest'
import { MATERAI_THRESHOLD, getMateraiAmount, requiresMaterai } from './currency'

describe('materai threshold (strictly more than Rp 5.000.000)', () => {
  it('threshold is 5,000,000', () => {
    expect(MATERAI_THRESHOLD).toBe(5_000_000)
  })

  it('exactly 5,000,000 needs no materai', () => {
    expect(requiresMaterai(5_000_000)).toBe(false)
    expect(getMateraiAmount(5_000_000)).toBe(0)
  })

  it('5,000,001 needs materai', () => {
    expect(requiresMaterai(5_000_001)).toBe(true)
    expect(getMateraiAmount(5_000_001)).toBe(10_000)
  })
})
