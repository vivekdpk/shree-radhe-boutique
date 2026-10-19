import { describe, expect, it } from 'vitest'
import { BOUTIQUE_THEMES } from './theme'

describe('boutique themes', () => {
  it('offers the original theme and all five approved alternatives', () => {
    expect(BOUTIQUE_THEMES.map(theme => theme.id)).toEqual([
      'forest', 'rose', 'plum', 'terracotta', 'indigo', 'black-blush',
    ])
  })
})
