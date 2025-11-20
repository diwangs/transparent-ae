import { describe, expect, it } from 'vitest';
import { trackParamVal, getPropReadChain } from '../paramval-analysis';

// TODO: investigate why test pass individually but fail when run together
describe('vue2', () => {
    it('should correctly track parameter value for generic sinks', () => {
        const vueDbDir = '../../build/codeql-db/vue2-src'

        const result = trackParamVal(vueDbDir, true);
        expect(result.length).toBe(48); // 12 x 4

        // domProps
        const domPropsParamVal = result[32]
        expect(domPropsParamVal.length).toBe(12);
        const stringOpDom = getPropReadChain(vueDbDir, domPropsParamVal)
        expect(stringOpDom[0]).toBe('data')
        expect(stringOpDom[1]).toBe('domProps')
        expect(stringOpDom[2]).toBe('<dyn>') // bracket notation

        // attrs -> Second entry in each group of 4
        const attrsParamVal = result[17]
        expect(attrsParamVal.length).toBe(16);
        const stringOpAttrs = getPropReadChain(vueDbDir, attrsParamVal)
        expect(stringOpAttrs[0]).toBe('data')
        expect(stringOpAttrs[1]).toBe('attrs')
        expect(stringOpAttrs[2]).toBe('<dyn>') // setAttribute
    })

    // No fixed sink in Vue2
})

describe('react', () => {
    it('should correctly track parameter value for generic sinks', () => {
        const reactDbDir = '../../build/codeql-db/react-ts-src'
        const result = trackParamVal(reactDbDir, true);
        expect(result.length).toEqual(48); // 12 x 4
    
        // nativeAttr
        const attrsParamVal = result[36]
        expect(attrsParamVal.length).toBe(37)
        const stringOp = getPropReadChain(reactDbDir, attrsParamVal)
        expect(stringOp[0]).toBe('<dyn>');
    })

    it('should correctly track parameter value for fixed sinks', () => {
        const reactDbDir = '../../build/codeql-db/react-ts-src'
        const result = trackParamVal(reactDbDir, false);
        expect(result.length).toEqual(40); // 10 x 4

        // No need to get prop read chain for fixed sinks
        // const dsimParamVal = result[36] // setInitial
        // const stringOpDsim = getPropReadChain(reactDbDir, dsimParamVal)
        // console.log(stringOpDsim)
    })
})

describe('angular', () => {
    it('should correctly track parameter value for generic sinks', () => {
        const angularDbDir = '../../build/codeql-db/angular-src'

        const result = trackParamVal(angularDbDir, true)
        expect(result.length).toEqual(6); // 5 groups with 1 double

        // Renderer3
        const r3ParamVal = result[3]
        expect(r3ParamVal.length).toBe(10)
        const stringOpR3 = getPropReadChain(angularDbDir, r3ParamVal)
        expect(stringOpR3.length).toBe(0) // means direct assignment

        // Renderer2
        const r2ParamVal = result[5]
        expect(r2ParamVal.length).toBe(2)
        const stringOpR2 = getPropReadChain(angularDbDir, r2ParamVal)
        expect(stringOpR2.length).toBe(0)
    })

    // No fixed sink in Angular
})