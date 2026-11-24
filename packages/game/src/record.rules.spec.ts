import { describe, expect, it } from 'vitest'
import {
  isPersonalRecord,
  personalRecordFlags,
  personalRecordsOf,
  recordLoadGFor,
} from './index.ts'

describe('personalRecordsOf', () => {
  describe('Given sets of an exercise with repeated reps and loads', () => {
    const sets = [
      { loadG: 40000, reps: 10 },
      { loadG: 42500, reps: 10 },
      { loadG: 40000, reps: 12 },
      { loadG: 30000, reps: null },
    ]

    describe('When the records are taken', () => {
      it('Then they keep the top load of each reps count and the most reps of each load', () => {
        expect(personalRecordsOf(sets)).toEqual([
          { reps: 10, loadG: 42500 },
          { reps: 12, loadG: 40000 },
        ])
      })
    })
  })

  describe('Given no set with reps', () => {
    describe('When the records are taken', () => {
      it('Then there is no record', () => {
        expect(personalRecordsOf([{ loadG: 0, reps: null }])).toEqual([])
      })
    })
  })
})

describe('isPersonalRecord', () => {
  describe('Given the record for 10 reps at 42.5 kg', () => {
    const records = [{ reps: 10, loadG: 42500 }]

    describe('When 10 reps are done with 45 kg', () => {
      it('Then the set is a record', () => {
        expect(isPersonalRecord({ loadG: 45000, reps: 10 }, records)).toBe(true)
      })
    })

    describe('When 10 reps are done with the record load', () => {
      it('Then the set is not a record', () => {
        expect(isPersonalRecord({ loadG: 42500, reps: 10 }, records)).toBe(false)
      })
    })

    describe('When 8 reps are done with a load never used', () => {
      it('Then the set is not a record, since no record exists to beat', () => {
        expect(isPersonalRecord({ loadG: 50000, reps: 8 }, records)).toBe(false)
      })
    })
  })

  describe('Given the record of 10 reps with 40 kg', () => {
    const records = [{ reps: 10, loadG: 40000 }]

    describe('When 12 reps are done with 40 kg', () => {
      it('Then the set is a record', () => {
        expect(isPersonalRecord({ loadG: 40000, reps: 12 }, records)).toBe(true)
      })
    })
  })

  describe('Given a timed set', () => {
    describe('When it is checked against the records', () => {
      it('Then it is never a record', () => {
        expect(isPersonalRecord({ loadG: 90000, reps: null }, [{ reps: 10, loadG: 0 }])).toBe(false)
      })
    })
  })
})

describe('recordLoadGFor', () => {
  describe('Given records for 10 and 12 reps', () => {
    const records = [
      { reps: 10, loadG: 42500 },
      { reps: 12, loadG: 40000 },
    ]

    describe('When the record for 10 reps is asked', () => {
      it('Then it is the top load with 10 reps', () => {
        expect(recordLoadGFor(records, 10)).toBe(42500)
      })
    })

    describe('When the record for 8 reps is asked', () => {
      it('Then there is none', () => {
        expect(recordLoadGFor(records, 8)).toBeNull()
      })
    })

    describe('When the record of a timed set is asked', () => {
      it('Then there is none', () => {
        expect(recordLoadGFor(records, null)).toBeNull()
      })
    })
  })
})

describe('personalRecordFlags', () => {
  describe('Given an exercise with no past set', () => {
    describe('When the first set of the workout is checked', () => {
      it('Then it is not a record', () => {
        expect(personalRecordFlags([], [{ loadG: 40000, reps: 10 }])).toEqual([false])
      })
    })

    describe('When a heavier set follows with the same reps', () => {
      it('Then the earlier set of the workout counts and the second one is a record', () => {
        const sets = [
          { loadG: 40000, reps: 10 },
          { loadG: 42500, reps: 10 },
        ]

        expect(personalRecordFlags([], sets)).toEqual([false, true])
      })
    })
  })

  describe('Given the record for 10 reps at 42.5 kg', () => {
    const records = [{ reps: 10, loadG: 42500 }]

    describe('When two sets of 45 kg follow', () => {
      it('Then only the first one beats the record', () => {
        const sets = [
          { loadG: 45000, reps: 10 },
          { loadG: 45000, reps: 10 },
        ]

        expect(personalRecordFlags(records, sets)).toEqual([true, false])
      })
    })
  })
})
