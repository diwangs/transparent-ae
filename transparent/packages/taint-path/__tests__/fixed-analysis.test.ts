import { describe, expect, it } from 'vitest';
import { getFixedPattern } from '../fixed-analysis';

describe.skip('vue2', () => {})

describe('react', () => {
  it('should correctly return the fixed SPA sink pattern', () => {
    const reactDbDir = '../../build/codeql-db/react-ts-src'
    const result = getFixedPattern(reactDbDir)

    expect(result).toHaveLength(1)
    expect(result).toContain('dangerouslySetInnerHTML')
  })
})

describe.skip('angular', () => {})
