/**
 * React is written in Flow (thus also tests in Flow) but our analysis is in TS.
 * Thus, before we run the test, we need to convert sink expression location 
 * from TS to Flow.
 * After that, we also need to convert stitches from Flow to TS.
 */

import { CallNode, ExprDesc } from "../utils/location"
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
 * Uses `selectExprByString.ql.template
 * 
 * @param exprsDesc Array of ExprDesc (from `listSinks()`)
 * @returns Array of `ExprLocation` containing the location info in the source
 * code
 */
export function tsToFlow(exprsDesc: ExprDesc[]): ExprDesc[] {
    const reactDbJsDir = '../../build/codeql-db/react-src'
    const templatePath = '../../qlpacks/transparent/selectExprByString.ql.template'

    // Search sinks in ts src
    // TODO: use filepath too instead of enclosingStmt
    // TODO: run this in parallel? (low priority)
    const result = exprsDesc.map((sink) => {
        const queryResult = execQueryTemplate(reactDbJsDir, templatePath, {
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
export function flowToTS(dbDir: string, callEdgesSetFlow: Set<CallNode[]>): Set<CallNode[]> {
    let callNodeCache = {}
    
    const callNodesSet = Array.from(callEdgesSetFlow).map((callEdgesSrc, idx) => {
        console.log(`Postprocessing trace ${idx + 1}/${callEdgesSetFlow.size}`)

        const callNodes = callEdgesSrc.map((callNodeStr, idx) => {
            // Optimization: Skip if tests
            if (callNodeStr.filepath.includes('test') 
                || callNodeStr.filepath.includes('Test')
                || callNodeStr.filepath.includes('jest')
                || callNodeStr.filepath.includes('node_modules')) return callNodeStr

            // Optimization: Cache
            const callNodeStrStr = JSON.stringify(callNodeStr)
            if (callNodeStrStr in callNodeCache) return callNodeCache[callNodeStrStr]
            callNodeCache[callNodeStrStr] = callNodeStr

            // Get the invoke expression based on call edge in the Flow DB
            // Should have `expr` and `enclosingFunc`
            const invkDesc: ExprDesc | null = getInvkDesc(callNodeStr, idx === 0)
            if (invkDesc === null) {
                console.warn(`Empty invkDesc for ${callNodeStr.stringValue} (${callNodeStr.filepath}:${callNodeStr.startLine})`)
                // Cache this too to prevent multiple queries
                return callNodeStr
            }

            // Get the call edge based on the invoke expression in the TS DB
            invkDesc.expr.filepath = translateFilepath(invkDesc.expr.filepath)
            const callNode: CallNode | null = getCallNode(dbDir, invkDesc, idx === 0)
            if (callNode === null) {
                console.warn(`Cannot find call edge for ${invkDesc.expr.stringValue}`)
                return callNodeStr
            }

            // Cache and return
            return callNode
        })

        return callNodes
    })

    return new Set(callNodesSet)
}

/**
 * Get the invoke expression referred by a call edge (which has its path, 
 * enclosing function, and start line).
 * Operates on the Flow DB.
 * 
 * Used to provide information to the flow-to-ts translator.
 * 
 * Uses `selectExprByCallNode.ql.template` or `selectInvokeExprByCallNode.ql.template`
 * 
 * @param callNode 
 * @param isFirst - If true, will search for a `Node` instead of `InvokeNode`.
 *              This is used for the first call edge (sink) in the stack trace.
 *              Default is false.
 * @returns null if not found
 */
function getInvkDesc(callNode: CallNode, isFirst: boolean = false): ExprDesc | null {
    const flowDbDir = '../../build/codeql-db/react-src'
    const templatePath = isFirst 
        ? '../../qlpacks/transparent/selectExprByCallNode.ql.template'
        : '../../qlpacks/transparent/selectInvokeExprByCallNode.ql.template'

    const results = execQueryTemplate(flowDbDir, templatePath, {
        stringValue: callNode.stringValue,
        filepath: callNode.filepath,
        startLine: callNode.startLine,
    })

    // Get the first (and hopefully only) result
    if (results.length === 0) {
        // console.warn(`No enclosing function found for ${callNode.stringValue}`)
        return null
    }
    if (!isFirst && results.length > 1) {
        console.warn(`Multiple enclosing function found for ${callNode.stringValue}`)
    }
    const result = results[0]

    // Format result
    const expr = {
        // !isFirst -> InvokeNode.getCalleeName
        // isFirst -> Node.asExpr
        stringValue: result['stringValue'], 
        filepath: callNode.filepath,
        startLine: result['sl'],
        endLine: result['el'],
        startCol: result['sc'],
        endCol: result['ec']
    }

    const enclosingStmt = {
        stringValue: result['enclosingStmtStringValue'],
        filepath: callNode.filepath,
        startLine: result['ssl'],
        endLine: result['sel'],
        startCol: result['ssc'],
        endCol: result['sec']
    }

    const enclosingFunc = {
        stringValue: callNode.stringValue,
        filepath: callNode.filepath,
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
 * Uses `selectStartLineByExpr.ql.template` or `selectStartLineByInvokeExpr.ql.template`
 * 
 * @param dbDir
 * @param invkDesc
 * @param isFirst - If true, will search for a `Node.asExpr` instead of 
*                   `InvokeNode.getCalleeName`. This is used for the first call
*                   edge (sink) in the stack trace. Default is false.
 * @returns null if not found
 */
export function getCallNode(dbDir: string, invkDesc: ExprDesc, isFirst: boolean = false): CallNode | null {
    const filepath = invkDesc.expr.filepath
    const templatePath = isFirst 
        ? '../../qlpacks/transparent/selectStartLineByExpr.ql.template'
        : '../../qlpacks/transparent/selectStartLineByInvokeExpr.ql.template'

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
    const callNode: CallNode = {
        filepath: filepath,
        stringValue: invkDesc.enclosingFunc.stringValue,
        startLine: result['sl']
    }

    return callNode
}