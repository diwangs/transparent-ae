/**
 * Module related to parameter value taint analysis 
 * 
 * This is shared between generic and fixed SPA sink analysis
 */

import { execQueryTemplate } from "../utils/codeql_driver"
import { Location } from '../utils/location';

/**
 * Get the taint path from the SPA component parameter value to the DOM sink
 * property value.
 * 
 * Generic SPA sink : track to dynamic DOM sink
 * Fixed SPA sink   : track to fixed DOM sink or dynamic DOM sink with string
 *  literal as property key
 * 
 * Uses `trackParamValGeneric.ql.template` or `trackParamValFixed.ql.template`
 * 
 * @param dbPath - path to the CodeQL database
 * @param isGeneric - `true` if generic, `false` if fixed
 */
export function trackParamVal(dbPath: string, isGeneric: boolean): Location[][] {
    const templatePath = isGeneric 
        ? "../../qlpacks/transparent/trackParamValGeneric.ql.template"
        : "../../qlpacks/transparent/trackParamValFixed.ql.template" 

    let framework
    if (dbPath.includes("vue2-src")) {
        framework = "Vue2"
    } else if (dbPath.includes("react-ts-src")) {
        framework = "React"
    } else if (dbPath.includes("angular-src")) {
        framework = "Angular"
    }

    const taintPaths = execQueryTemplate(dbPath, templatePath, {
        framework
    })

    return (taintPaths as Location[][])
}

/**
 * Given a paramval taint path, what is the name of the property that are 
 * chained together?
 *
 * NOTE: Newer version of CodeQL JS library squashed the `PropRead`, making them
 * implicit in the taint path. However, we can still infer the `PropRead` by
 * looking at individual node instead of the edge. (e.g., node assignment)
 * 
 * Uses `selectStringByLoc.ql.template`
 * 
 * @param dbPath 
 * @param payloadTaintPath 
 */
export function getPropReadChain(dbPath: string, payloadTaintPath: Location[]): string[] {
    const templatePath = '../../qlpacks/transparent/selectStringByLoc.ql.template'

    let stringOpsResult = []
    payloadTaintPath.forEach((loc) => {
        const queryResult = execQueryTemplate(dbPath, templatePath, {
            succPath: loc.filepath,
            succSl: loc.startLine,
            succSc: loc.startCol,
            succEc: loc.endCol
        })

        if (queryResult.length !== 0) {
            // console.log(queryResult[0])
            stringOpsResult.push({...queryResult[0], sl: loc.startLine, sc: loc.startCol})
        }
    })

    // Given array of result, return the property chain
    // Dynamic property read (e.g. bracket-notation) will be marked <dyn>
    let stringOps: string[] = []
    stringOpsResult.forEach((stringOpResult) => {
        // Assignment: get the RHS
        if (stringOpResult.node.includes('=')) {
            stringOpResult.node = stringOpResult.node.split('=')[1].trim()
        }

        // Static prop read
        if (stringOpResult.node.includes('.')) {
            let dotClause = stringOpResult.node.split(' ').filter(s => s.includes('.'))[0]
            stringOps = stringOps.concat(dotClause.split('.').filter(s => !s.includes('pending'))) // compounded prop
            // stringOps = stringOps.filter(s => !s.includes('pending')) // remove scheduling-related props
        // Dynamic prop read
        } else if (stringOpResult.node.includes('[')) {
            // NOTE: this would miss compounded dynamic property read, but rare enough
            stringOps.push('<dyn>')
        }
    })
    stringOps.shift() // remove base object

    return stringOps
}