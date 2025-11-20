import { execSync } from 'child_process';
import { describe, expect, it } from 'vitest';
import { autostitch, writeStitchesToFile } from '../stitcher';
import { tsToFlow, flowToTS } from '../flow-ts-bridge';

let isNixOS = false;
try {
    const unameOutput = execSync('uname -a').toString().trim();
    isNixOS = unameOutput.includes('NixOS');
} catch (error) {
    console.error('Error detecting OS:', error);
}

describe('stitcher', () => {
    describe('vue2', () => {
        it('should produce 22 stitches on Vue2', () => {
            const vueSrcDir = '../../targets/vue2-src/vue'
            const vueDbDir = '../../build/codeql-db/vue2-src'
            const vueRunTestCmd = "pnpm test:unit 2>&1"
            const vueTraceFlag = `console.trace('tranSPArent flag')`

            const stitches = autostitch(vueDbDir, vueSrcDir, vueRunTestCmd, vueTraceFlag)

            expect(stitches.length).toBe(22); // ~ 7 minutes

            // Should be in main, uncomment for debugging
            // writeStitchesToFile(stitches, '../../qlpacks/transparent/Stitches/Vue2.qll')
        })
    })

    describe('react', () => {
        it('should produce 78 stitches on React', () => {
            const reactSrcDir = '../../targets/react-src/react'
            const reactDbDir = '../../build/codeql-db/react-ts-src'
            const runTestCmd = "yarn test 2>&1"
            const traceFlag = `console.trace('tranSPArent flag')`
 
            const stitches = autostitch(reactDbDir, reactSrcDir, runTestCmd, traceFlag, tsToFlow, flowToTS)

            expect(stitches.length).toBeGreaterThanOrEqual(1); // ~ 1 hour 20 minutes (longest due to translation)
        
            // Should be in main, uncomment for debugging
            // writeStitchesToFile(stitches, '../../qlpacks/transparent/Stitches/React.qll')
        })
    })

    describe.skipIf(isNixOS)('angular', () => {
        it('should produce 96 stitches on Angular', () => {
            const angularSrcDir = '../../targets/angular-src/angular'
            const angularDbDir = '../../build/codeql-db/angular-src'
            const runTestCmd = "yarn test --cache_test_results=no --test_output=errors --experimental_ui_max_stdouterr_bytes=8389000 //packages/core/test //packages/common/test 2>&1"
            const traceFlag = `console.error(new Error('tranSPArent flag'))`
            
            const stitches = autostitch(angularDbDir, angularSrcDir, runTestCmd, traceFlag)
            
            expect(stitches.length).toBeGreaterThanOrEqual(1);
        })
    })

    // If NixOS, use podman to run this test (and don't run it inside flatpak)
    // This assumes that the container exists, do `distrobox create -i ubuntu:24.04 ubuntu`
    // NOTE: the first run after container creation sometimes fails, but not the second one
    describe.runIf(isNixOS)('angular-nixos', () => {
        it('should produce 96 stitches on Angular (through Ubuntu Distrobox)', () => {
            const angularSrcDir = '../../targets/angular-src/angular'
            const angularDbDir = '../../build/codeql-db/angular-src'
            const runTestCmd = "distrobox create -Y -i ubuntu:24.04 ubuntu && distrobox enter ubuntu -- ../scripts/test_on_ubuntu.sh 2>&1"
            const traceFlag = `console.error(new Error('tranSPArent flag'))`
            
            const stitches = autostitch(angularDbDir, angularSrcDir, runTestCmd, traceFlag) 

            expect(stitches.length).toBeGreaterThanOrEqual(1); // ~ 1 hour 10 minutes, but faster subsequent

            // Should be in main, uncomment for debugging
            // writeStitchesToFile(stitches, '../../qlpacks/transparent/Stitches/Angular.qll')
        })
    })
});