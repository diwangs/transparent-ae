import { describe, expect, it } from 'vitest';

import { sarifToTable } from '../sarif-parser';

describe('sarif_parser', () => {
    it('should parse SARIF to table', () => {
        // Read SARIF file in fixtures
        const sarif = require('./fixtures/vue.sarif.json')

        const table = sarifToTable(sarif)
        expect(table.length).toBe(4)
    })
})