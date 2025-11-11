import { describe, expect, it } from 'vitest';
import { autostitch } from '../stitcher';
import { tsToFlow, flowToTS } from '../flow-ts-bridge';

describe('stitcher', () => {
    describe('vue2', () => {
        it('should produce 22 stitches on Vue2', () => {
            const vueSrcDir = '../../targets/vue2-src/vue'
            const vueDbDir = '../../build/codeql-db/vue2-src'
            const runTestCmd = "pnpm test:unit 2>&1"
            const traceFlag = `console.trace('tranSPArent flag')`
            
            const stitches = autostitch(vueDbDir, vueSrcDir, runTestCmd, traceFlag)
            
            // Should produce 22 stitches (from 42 unique stack traces)
            expect(stitches.length).toBe(22);

            // Should be in main, uncomment for debugging
            // writeStitchesToFile(stitches, '../../qlpacks/transparent/Stitches/Vue2.qll')
        })
    })

    describe('react', () => {
        it('should produce 147 stitches on React', () => {
            const reactSrcDir = '../../targets/react-src/react'
            const reactDbDir = '../../build/codeql-db/react-ts-src'
            const runTestCmd = "yarn test 2>&1"
            const traceFlag = `console.trace('tranSPArent flag')`
 
            const stitches = autostitch(reactDbDir, reactSrcDir, runTestCmd, traceFlag, tsToFlow, flowToTS)
            // console.log(result)
            // console.log(result.length)

            expect(stitches.length).toBeGreaterThanOrEqual(140);
        })
    })

    describe.skip('angular', () => {
        it('should produce 156 stitches on Angular', () => {
            const angularSrcDir = '../../targets/angular-src/angular'
            const angularDbDir = '../../build/codeql-db/angular-src'
            const runTestCmd = "yarn test //packages/core/test //packages/common/test 2>&1"
            const traceFlag = `console.error(new Error('tranSPArent flag'))`
            
            const stitches = autostitch(angularDbDir, angularSrcDir, runTestCmd, traceFlag)
            
            // Should produce 140 stitches
            expect(stitches.length).toBeGreaterThanOrEqual(140);
        })
    })

    // Use podman to run this test (don't run it in the VSCode)
    // This assumes that the container exists, do `distrobox create -r -i ubuntu:latest ubuntu`
    describe.skip('angular-nixos', () => {
        it('should produce 156 stitches on Angular (through Ubuntu Distrobox)', () => {
            const angularSrcDir = '../../targets/angular-src/angular'
            const angularDbDir = '../../build/codeql-db/angular-src'
            const runTestCmd = "distrobox enter -r ubuntu -- ../scripts/test_on_ubuntu.sh 2>&1"
            const traceFlag = `console.error(new Error('tranSPArent flag'))`
            
            const stitches = autostitch(angularDbDir, angularSrcDir, runTestCmd, traceFlag)

            // Should produce 140 stitches
            expect(stitches.length).toBeGreaterThanOrEqual(140);
        })
    })
});