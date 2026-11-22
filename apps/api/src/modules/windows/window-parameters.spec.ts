import { describe, expect, it } from 'vitest'
import { DomainError } from '../../errors/domain-error.js'
import { resolveWindowParameters } from './window-parameters.js'
import { GAME_PARAMETERS } from './windows.config.js'

describe('Given overrides of only baseOpenHours.hypertrophy and maxOpenHours', () => {
  describe('When the window parameters are resolved', () => {
    it('Then should apply them over the starting parameters and keep the rest', () => {
      const parameters = resolveWindowParameters({
        baseOpenHours: { hypertrophy: 24 },
        maxOpenHours: 96,
      })

      expect(parameters).toEqual({
        ...GAME_PARAMETERS,
        baseOpenHours: { strength: 40, hypertrophy: 24, endurance: 40 },
        maxOpenHours: 96,
      })
    })

    it('Then should leave the starting parameters unchanged', () => {
      const before = structuredClone(GAME_PARAMETERS)

      resolveWindowParameters({ baseOpenHours: { hypertrophy: 24 } })

      expect(GAME_PARAMETERS).toEqual(before)
    })
  })

  describe('When there are no overrides', () => {
    it('Then should return the starting parameters', () => {
      expect(resolveWindowParameters(undefined)).toEqual(GAME_PARAMETERS)
    })
  })
})

describe('Given an invalid override', () => {
  describe.each([
    {
      case: 'a fractional number of hours',
      overrides: { baseOpenHours: { strength: 1.5 } },
      path: 'baseOpenHours.strength',
    },
    {
      case: 'a negative percent',
      overrides: { goalVolumePercent: { endurance: -1 } },
      path: 'goalVolumePercent.endurance',
    },
    {
      case: 'a percent above 1000',
      overrides: { secondaryVolumePercent: 1001 },
      path: 'secondaryVolumePercent',
    },
    {
      case: 'zero hours of open duration',
      overrides: { openDurationHours: { hypertrophy: 0 } },
      path: 'openDurationHours.hypertrophy',
    },
    {
      case: 'negative minutes per kg',
      overrides: { openMinutesPerAdjustedKg: -1 },
      path: 'openMinutesPerAdjustedKg',
    },
    {
      case: 'minutes per kg above 600',
      overrides: { openMinutesPerAdjustedKg: 601 },
      path: 'openMinutesPerAdjustedKg',
    },
    { case: 'a cap above one year', overrides: { maxOpenHours: 8761 }, path: 'maxOpenHours' },
    {
      case: 'an open duration above one year',
      overrides: { openDurationHours: { endurance: 8761 } },
      path: 'openDurationHours.endurance',
    },
    { case: 'a cap below the base hours', overrides: { maxOpenHours: 39 }, path: 'maxOpenHours' },
    {
      case: 'base hours above the cap',
      overrides: { baseOpenHours: { strength: 73 } },
      path: 'maxOpenHours',
    },
  ])('When the window parameters are resolved with $case', ({ overrides, path }) => {
    it(`Then should refuse with window_parameters_invalid naming ${path}`, () => {
      const resolve = () => resolveWindowParameters(overrides)

      expect(resolve).toThrow(
        expect.objectContaining({
          code: 'window_parameters_invalid',
          message: `parâmetro da janela inválido: ${path}`,
        }),
      )
      expect(resolve).toThrow(DomainError)
    })
  })
})
