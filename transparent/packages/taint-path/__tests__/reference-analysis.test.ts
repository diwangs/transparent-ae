import { describe, expect, it } from 'vitest';
import { getReferenceVariablePattern, getReferenceConstructorPattern } from '../reference-analysis';

// `src/core/vdom/modules/template-ref.ts`
describe('vue2', () => {
  it('should correctly list the reference variable', () => {
    const vueDbDir = '../../build/codeql-db/vue2-src'
    const result = getReferenceVariablePattern(vueDbDir)

    expect(result).toContain('ref');
  })
})

// `packages/react-reconciler/serc/ReactFiberCommitWork.new.ts#commitAttachRef`
describe('react', () => {
  it('should correctly list the reference variable', () => {
    const reactDbDir = '../../build/codeql-db/react-ts-src'
    const result = getReferenceVariablePattern(reactDbDir)

    expect(result).toContain('ref');
  })
})

// ElementRef dependency injection (though injectable, they are considered
// special object that doesn't have an explicit injectable, so no theta method)
// See `packages/core/src/render3/VIEW_DATA.md`
// Source should be `injectElementRef()` -> all methods that starts with `inject`
// using `inject(ElementRef)` in constructor method or `@Inject(ElementRef)` in constructor parameter
describe('angular', () => {
  it('should correctly list the reference constructor', () => {
    const angularDbDir = '../../build/codeql-db/angular-src'
    const result = getReferenceConstructorPattern(angularDbDir)

    expect(result).toContain('ref');
  })
})