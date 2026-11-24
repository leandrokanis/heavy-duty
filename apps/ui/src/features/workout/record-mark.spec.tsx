import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecordMark } from './record-mark'

describe('Given the record for the reps on screen at 42500 g', () => {
  describe('When the values on screen do not beat it', () => {
    it('Then should show 42,5 and read the record', () => {
      const { container } = render(<RecordMark mark={{ loadG: 42_500, passed: false }} />)

      expect({
        shown: container.querySelector('[aria-hidden="true"]')?.textContent,
        read: screen.getByText('Recorde: 42,5 kg').textContent,
      }).toEqual({ shown: '42,5', read: 'Recorde: 42,5 kg' })
    })
  })

  describe('When the values on screen beat it', () => {
    it('Then should read that the record is beaten', () => {
      render(<RecordMark mark={{ loadG: 42_500, passed: true }} />)

      expect(screen.getByText('Acima do recorde de 42,5 kg')).toBeTruthy()
    })
  })
})

describe('Given no record for the reps on screen', () => {
  describe('When the values on screen beat the reps of the same load', () => {
    it('Then should show "Recorde" and read that the record is beaten', () => {
      const { container } = render(<RecordMark mark={{ loadG: null, passed: true }} />)

      expect({
        shown: container.querySelector('[aria-hidden="true"]')?.textContent,
        read: screen.getByText('Acima do recorde de repetições com esta carga').textContent,
      }).toEqual({
        shown: 'Recorde',
        read: 'Acima do recorde de repetições com esta carga',
      })
    })
  })
})
