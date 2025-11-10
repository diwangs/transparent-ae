import { describe, expect, it } from 'vitest';

import { getCallEdgeFromInvkDesc } from '../flow-ts-bridge';
import { ExprDesc } from '../../utils/location';
import { isReachable } from '../stitcher';

describe('flow processing', () => {
    it('should get ExprDesc from CallEdge correctly', () => {
        const dbDir = '../../build/codeql-db/react-src-ts'
        const succExprDesc: ExprDesc = {
            expr: {
                filepath: 'react-dom/src/client/ReactDOMComponentTree.ts',
                stringValue: 'node',
                startLine: 0 // dummy
            },
            enclosingFunc: {
                filepath: 'react-dom/src/client/ReactDOMComponentTree.ts',
                stringValue: 'markContainerAsRoot',
                startLine: 0 // dummy
            }
        
        }
        const predExprDesc: ExprDesc = {
            expr: {
                filepath: 'react-dom/src/client/ReactDOMLegacy.ts',
                stringValue: 'markContainerAsRoot',
                startLine: 0 // dummy
            },
            enclosingFunc: {
                filepath: 'react-dom/src/client/ReactDOMLegacy.ts',
                stringValue: 'legacyCreateRootFromDOMContainer',
                startLine: 0 // dummy
            }
        }

        const succCallEdge = getCallEdgeFromInvkDesc(dbDir, succExprDesc, true)
        if (succCallEdge === null) {
            throw new Error('Succ: Call edge not found')
        }
        const predCallEdge = getCallEdgeFromInvkDesc(dbDir, predExprDesc, false)
        if (predCallEdge === null) {
            throw new Error('Pred: Call edge not found')
        }

        // We know that it is reachable in the Flow DB. It should be reachable
        // in the TS DB as well
        const queryResult = isReachable(dbDir, predCallEdge, succCallEdge)
        expect(queryResult).toBe(true)
    })

    // it('[LONG] should translate Flow trace back to TS correctly', () => {
    //     const dbDir = '../../build/codeql-db/react-src-ts'
        
    //     const stackTraceLog = fs.readFileSync('__tests__/fixtures/react_generic.log', 'utf-8')
    //     const callEdgesSetSrc = extractCallEdgesSet(stackTraceLog)
        
    //     const callEdgesSet = flowToTS(dbDir, callEdgesSetSrc)
    //     console.log(callEdgesSet)
    //     expect(callEdgesSet.length).toBe(callEdgesSetSrc.length);
    // })
});