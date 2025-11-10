import { describe, expect, it } from 'vitest';
import { execQueryFile, execQueryTemplate } from '../codeql_driver';

describe('CodeQL driver', () => {
    it.skip('should execute query with long result (from React) without ENOBUFS', () => {
        const dbPath = `../../build/codeql-db/react-src-ts`
        const templatePath = `../../qlpacks/transparent/checkReachability.ql.template`

        const result = execQueryTemplate(dbPath, templatePath, {
            srcPath: 'react-reconciler/src/ReactFiberWorkLoop.new.ts',
            srcSl: 1519,
            dstPath: 'react-reconciler/src/ReactFiberWorkLoop.new.ts',
            dstSl: 1545
        })
        expect(result.length).toBe(1)
    })
});