import { describe, expect, it } from 'vitest';

import { getCallNode } from '../flow-ts-bridge';
import { ExprDesc } from '../../utils/location';
import { isReachable } from '../stitcher';

describe('flow processing', () => {
    it('should get ExprDesc from CallNode correctly', () => {
        const dbDir = '../../build/codeql-db/react-ts-src'
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

        const succCallNode = getCallNode(dbDir, succExprDesc, true)
        if (succCallNode === null) {
            throw new Error('Succ: Call node not found')
        }
        const predCallNode = getCallNode(dbDir, predExprDesc, false)
        if (predCallNode === null) {
            throw new Error('Pred: Call node not found')
        }

        // We know that it is reachable in the Flow DB. It should be reachable
        // in the TS DB as well
        const queryResult = isReachable(dbDir, predCallNode, succCallNode)
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