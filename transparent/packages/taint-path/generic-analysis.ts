/**
 * Module to track propname, used in analysis of generic SPA sink
 */

import { getPropReadChain, trackParamVal } from "./paramval-analysis";
import { execQueryTemplate, execQueryFile } from "../utils/codeql_driver"
import { ExprLocation } from '../utils/location';
import { zip } from '../utils/ts_utils'; // this is available in lodash really

/**
 * Get the generic pattern depending on the paramVal path
 * 
 * @param dbDir 
 */
export function getGenericPattern(dbDir: string): string[] {
    console.log("Getting generic patterns for db: " + dbDir)
    const paramValPaths = trackParamVal(dbDir, true)
    let result = []

    for (const index of genericIndex(dbDir)) {
        const paramValPath = paramValPaths[index]
        let propReadChain = getPropReadChain(dbDir, paramValPath)
        const sinkExpr = paramValPath[paramValPath.length - 1]

        // Get type of DOM sink statement
        const templatePath = '../../qlpacks/transparent/selectEnclosingStmtStringByLoc.ql.template'
        const queryResult = execQueryTemplate(dbDir, templatePath, {
            succPath: sinkExpr.filepath,
            succSl: sinkExpr.startLine,
            succSc: sinkExpr.startCol,
            succEc: sinkExpr.endCol
        })
        
        // replace `dyn` with `<nativeAttr>` or `<nativeProp>`
        if (queryResult[0]['enclosingStmt'].includes('.setAttribute')) {
            propReadChain.pop() // remove last element
            propReadChain.push('<nativeAttr>')
        } else {
            if (propReadChain.length === 0) { // Angular case: just name the method
                propReadChain.push('renderer2.setProperty')
            } else {
                propReadChain.pop()
                propReadChain.push('<nativeProp>')
            }
        }

        result.push(propReadChain.join('.'))
    }
    
    return result
}

function genericIndex(dbDir: string): number[] {
    if (dbDir.includes("vue2-src")) {
        return [17, 32] // attrs, domProps
    } else if (dbDir.includes("react-ts-src")) {
        return [36] // nativeAttr
    } else if (dbDir.includes("angular-src")) {
        return [5] // Renderer3 (3), Renderer2 (5)
    }
}

/**
 * Track the path from a render function to the DOM API's property name 
 * field / argument
 * 
 * @param dbPath 
 * @returns - A list of dataflow sequence
 */
export function trackPropName(dbPath: string): ExprLocation[][] {
    const queryPath = "../../qlpacks/transparent/trackPropNameGeneric.ql"
    const taintPaths = execQueryFile(dbPath, queryPath)
    
    return (taintPaths as ExprLocation[][])
}

/**
 * For generic sinks, given a propName taint path, list the dataflow edges that
 * modify the string
 * 
 * @param propNameTaintPath - the taint path from the render function to the 
 *  propName field / argument
 * @returns - an ordered list of strings that signifies string operation
 */
export function markStringOperation(dbPath: string, propNameTaintPath: ExprLocation[]): string[] {
    const templatePath = "../../qlpacks/transparent/checkStringOperation.ql.template"
    
    let stringOps = []
    zip(propNameTaintPath.slice(0, -1), propNameTaintPath.slice(1)).forEach(([pred, succ]) => {
        const queryResult = execQueryTemplate(dbPath, templatePath, {
            predPath: pred.filepath,
            predSl: pred.startLine,
            predSc: pred.startCol,
            predEc: pred.endCol,
            succPath: succ.filepath,
            succSl: succ.startLine,
            succSc: succ.startCol,
            succEc: succ.endCol
        })

        if (queryResult.length !== 0) {
            stringOps.push(queryResult)
        }
    })

    return stringOps
}
