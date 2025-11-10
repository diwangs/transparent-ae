/**
 * React is written in Flow (thus also tests in Flow) but our analysis is in TS.
 * Thus, before we run the test, we need to convert sink expression location 
 * from TS to Flow.
 * After that, we also need to convert stitches from Flow to TS.
 */

import { CallEdge, ExprDesc } from "../utils/location"
import { execQueryTemplate } from "../utils/codeql_driver"
import { removeTypecast, translateFilepath } from "../utils/ts_utils"

/**
 * Function to translate the expression location from source DB to target DB. 
 * This assumes that the DBs have some kind of mapping.
 * In the case of React, TS-converted Flow code.
 * 
 * TODO: Use TypeScript module instead
 * https://stackoverflow.com/questions/17965572/compile-a-typescript-string-to-a-javascript-string-programmatically
 * 
 * 
 * @param exprsDesc Array of ExprDesc (from `listSinks()`)
 * @returns Array of `ExprLocation` containing the location info in the source
 * code
 */
export function tsToFlow(exprsDesc: ExprDesc[]): ExprDesc[] {
    const reactDbJsDir = '../../build/codeql-db/react-src'

    // Search sinks in ts src
    // TODO: use filepath too instead of enclosingStmt
    // TODO: run this in parallel? (low priority)
    const result = exprsDesc.map((sink) => {
        const queryResult = execQueryTemplate(reactDbJsDir, '../../qlpacks/transparent/searchNode.ql.template', {
            "sinkExpr": removeTypecast(sink.expr.stringValue),
            "enclosingStmt": removeTypecast(sink.enclosingStmt.stringValue), 
        })

        // Mapping should be 1-to-1
        if (queryResult.length > 0) {
            // TODO: what to do if there is multiple result? (low priority)
            if (queryResult.length > 1) {
                console.warn(`Multiple results for ${sink.expr.stringValue} in ${sink.enclosingStmt.stringValue}`)
            }
            
            const result = queryResult[0]

            const expr = {
                stringValue: result['sink'],
                filepath: result['filepath'],
                startLine: result['sl'],
                endLine: result['el'],
                startCol: result['sc'],
                endCol: result['ec']
            }

            const enclosingStmt = {
                stringValue: removeTypecast(sink.enclosingStmt.stringValue),
                filepath: result['filepath'],
                startLine: result['ssl'],
                endLine: result['sel'],
                startCol: result['ssc'],
                endCol: result['sec']
            }

            return { expr, enclosingStmt }
        }

        return {} as ExprDesc // Empty object, filter later
    })

    return result.filter((sink) => Object.keys(sink).length > 0)
}

/**
 * Translate call edges set from Flow to TS.
 * 
 * Used to translate stack traces from React test (written in Flow) to TS.
 * 
 * If call edge is invalid (not found, test file, etc.), it will fill them with
 * original call edge value (no translation), which should get ignored on 
 * later processing.
 * 
 * @param dbDir 
 * @param callEdgesSet 
 */
export function flowToTS(dbDir: string, callEdgesSetFlow: Set<CallEdge[]>): Set<CallEdge[]> {
    let callEdgeCache = {}
    
    const callEdgesSet = Array.from(callEdgesSetFlow).map((callEdgesSrc, idx) => {
        console.log(`Postprocessing trace ${idx + 1}/${callEdgesSetFlow.size}`)

        const callEdges = callEdgesSrc.map((callEdgeSrc, idx) => {
            // Optimization: Skip if tests
            if (callEdgeSrc.filepath.includes('test') 
                || callEdgeSrc.filepath.includes('Test')
                || callEdgeSrc.filepath.includes('jest')
                || callEdgeSrc.filepath.includes('node_modules')) return callEdgeSrc

            // Optimization: Cache
            const callEdgeSrcStr = JSON.stringify(callEdgeSrc)
            if (callEdgeSrcStr in callEdgeCache) return callEdgeCache[callEdgeSrcStr]
            callEdgeCache[callEdgeSrcStr] = callEdgeSrc

            // Get the invoke expression based on call edge in the Flow DB
            // Should have `expr` and `enclosingFunc`
            const invkDesc: ExprDesc | null = getInvkDesc(callEdgeSrc, idx === 0)
            if (invkDesc === null) {
                console.warn(`Empty invkDesc for ${callEdgeSrc.stringValue} (${callEdgeSrc.filepath}:${callEdgeSrc.startLine})`)
                // Cache this too to prevent multiple queries
                return callEdgeSrc
            }

            // Get the call edge based on the invoke expression in the TS DB
            invkDesc.expr.filepath = translateFilepath(invkDesc.expr.filepath)
            const callEdge: CallEdge | null = getCallEdgeFromInvkDesc(dbDir, invkDesc, idx === 0)
            if (callEdge === null) {
                console.warn(`Cannot find call edge for ${invkDesc.expr.stringValue}`)
                return callEdgeSrc
            }

            // Cache and return
            return callEdge
        })

        return callEdges
    })

    return new Set(callEdgesSet)
}

/**
 * Get the invoke expression referred by a call edge (which has its path, 
 * enclosing function, and start line).
 * Operates on the Flow DB.
 * 
 * Used to provide information to the flow-to-ts translator.
 * 
 * @param callEdge 
 * @param isFirst - If true, will search for a `Node` instead of `InvokeNode`.
 *              This is used for the first call edge (sink) in the stack trace.
 *              Default is false.
 * @returns null if not found
 */
export function getInvkDesc(callEdge: CallEdge, isFirst: boolean = false): ExprDesc | null {
    const flowDbDir = '../../build/codeql-db/react-src'
    const templatePath = isFirst 
        ? '../../qlpacks/transparent/searchExprByCallEdge.ql.template'
        : '../../qlpacks/transparent/searchInvokeExprByCallEdge.ql.template'

    const results = execQueryTemplate(flowDbDir, templatePath, {
        stringValue: callEdge.stringValue,
        filepath: callEdge.filepath,
        startLine: callEdge.startLine,
    })

    // Get the first (and hopefully only) result
    if (results.length === 0) {
        // console.warn(`No enclosing function found for ${callEdge.stringValue}`)
        return null
    }
    if (!isFirst && results.length > 1) {
        console.warn(`Multiple enclosing function found for ${callEdge.stringValue}`)
    }
    const result = results[0]

    // Format result
    const expr = {
        // !isFirst -> InvokeNode.getCalleeName
        // isFirst -> Node.asExpr
        stringValue: result['stringValue'], 
        filepath: callEdge.filepath,
        startLine: result['sl'],
        endLine: result['el'],
        startCol: result['sc'],
        endCol: result['ec']
    }

    const enclosingStmt = {
        stringValue: result['enclosingStmtStringValue'],
        filepath: callEdge.filepath,
        startLine: result['ssl'],
        endLine: result['sel'],
        startCol: result['ssc'],
        endCol: result['sec']
    }

    const enclosingFunc = {
        stringValue: callEdge.stringValue,
        filepath: callEdge.filepath,
        startLine: result['sl'], // Dummy value
    }

    return { expr, enclosingStmt, enclosingFunc }
}

/**
 * Get call edge based on invoke expression description.
 * Operates on the TS DB.
 * 
 * Used to search for the result of the flow-to-ts translator
 * 
 * @param dbDir
 * @param invkDesc
 * @param isFirst - If true, will search for a `Node.asExpr` instead of 
*                   `InvokeNode.getCalleeName`. This is used for the first call
*                   edge (sink) in the stack trace. Default is false.
 * @returns null if not found
 */
export function getCallEdgeFromInvkDesc(dbDir: string, invkDesc: ExprDesc, isFirst: boolean = false): CallEdge | null {
    const filepath = invkDesc.expr.filepath
    const templatePath = isFirst 
        ? '../../qlpacks/transparent/searchFuncByExpr.ql.template'
        : '../../qlpacks/transparent/searchFuncByInvokeExpr.ql.template'

    const queryData = {
        filepath: filepath,
        stringValue: invkDesc.expr.stringValue,
        enclosingFuncStringValue: invkDesc.enclosingFunc.stringValue
    }
    // console.log(queryData)
    
    // Search for the invoke syntax in the TS DB
    const results = execQueryTemplate(dbDir, templatePath, queryData)

    // Get the first (and hopefully only) result
    if (results.length === 0) {
        // console.warn(`Cannot find ${invkDesc.expr.stringValue} in ${filepath}`)
        return null
    }
    if (!isFirst && results.length > 1) {
        console.warn(`Multiple results for ${invkDesc.expr.stringValue} in ${filepath}`)
    }
    const result = results[0]

    // Format result
    const callEdge: CallEdge = {
        filepath: filepath,
        stringValue: invkDesc.enclosingFunc.stringValue,
        startLine: result['sl']
    }

    return callEdge
}