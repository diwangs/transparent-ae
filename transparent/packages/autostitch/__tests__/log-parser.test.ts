import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import { extractCallEdgesSet } from '../log-parser';

describe('stitch', () => {
    it('should extract call edges corectly', () => {
        const stackTraceLog = fs.readFileSync('__tests__/fixtures/testerror_weird.log', 'utf-8')
        const result = extractCallEdgesSet(stackTraceLog)
        console.log(result)
        expect(result.size).toBe(16);
    })
});