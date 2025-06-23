/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import { useIsMobile } from '@/hooks/use-mobile'

function mockMatchMedia(matches: boolean) {
  return {
    matches,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  } as unknown as MediaQueryList
}

describe('useIsMobile', () => {
  it('returns true when window width is mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 400, writable: true })
    window.matchMedia = jest.fn().mockReturnValue(mockMatchMedia(true))
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when window width is desktop', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true })
    window.matchMedia = jest.fn().mockReturnValue(mockMatchMedia(false))
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })
})
