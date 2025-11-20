import { describe, expect, it } from 'vitest';
import { trackPropName, markStringOperation, getGenericPattern } from '../generic-analysis';

// describe('stitch', () => {
// Should output `data.attrs.<nativeAttr>`, `data.domProps.<nativeProp>`
describe('vue2', () => {
    it('should correctly list the sequence of string operation on Vue.js', () => {
        const vueDbDir = '../../build/codeql-db/vue2-src'
        
        const result = getGenericPattern(vueDbDir);
        expect(result).toHaveLength(2)
        expect(result[0]).toBe('data.attrs.<nativeAttr>')
        expect(result[1]).toBe('data.domProps.<nativeProp>')
    })
})

// Should output `<nativeAttr>` with exception to `formAction` and `xlinkHref`
describe('react', () => {
    // `setValueForProperty` in `react-dom/src/client/ReactDOMPropertyOperations.js`
    it('should correctly list the sequence of string operation on React', () => {
        const reactDbDir = '../../build/codeql-db/react-ts-src'
        
        const result = getGenericPattern(reactDbDir);
        expect(result).toHaveLength(1)
        expect(result[0]).toBe('<nativeAttr>')
    })
})

// Should output `renderer2.setProperty` -> in `DefaultDomRenderer2` class
describe('angular', () => {
    it('should correctly list the sequence of string operation on Angular', () => {
        const angularDbDir = '../../build/codeql-db/angular-src'

        const result = getGenericPattern(angularDbDir);
        expect(result).toHaveLength(1)
        expect(result[0]).toBe('renderer2.setProperty')
    })
})
// });