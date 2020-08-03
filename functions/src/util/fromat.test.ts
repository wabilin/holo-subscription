import { listEndWith } from './format'

describe('listEndWith', () => {
  it('join comma and given ending', () => {
    expect(listEndWith([], 'and')).toBe('')
    expect(listEndWith(['a'], 'and')).toBe('a')

    expect(listEndWith(['a', 'b'], 'and')).toBe('a and b')
    expect(listEndWith(['a', 'b', 'c'], 'and')).toBe('a, b and c')
    expect(listEndWith(['a', 'b', 'c', 'd', 'e'], 'and'))
      .toBe('a, b, c, d and e')
  })
})
