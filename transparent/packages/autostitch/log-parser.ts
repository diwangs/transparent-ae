import { CallNode } from "../utils/location"

/**
 * A function to extract call edges from the stderr of a test run
 * 
 * Outputs a collection of unique stack traces, with each call represented
 * as the location of said call in the source code
 * 
 * @param stderr stderr of a test run
 * @returns an array of location object arrays, each representing a single `console.trace` call
 */
export function extractCallEdgesSet(stderr: string): Set<CallNode[]> {
    const stackTraces = extractStackTraces(stderr)
    console.log(stackTraces.length)

    const callNodesList = stackTraces
        .map((stackTrace) => extractCallNodes(stackTrace))
        .filter((callNodes) => callNodes.length > 0) // In case of parsing error

    // Remove duplicate stack traces (doesn't work perfectly)
    const callNodesSet = callNodesList.filter((callNode, index, self) => {
        const callNodeStr = JSON.stringify(callNode)
        return index === self.findIndex((cn) => JSON.stringify(cn) === callNodeStr)
    })

    return new Set(callNodesSet)
}

/**
 * A function to extract stack traces of `console.trace` calls from the stderr of a test run
 * 
 * @param stderr stderr of a test run
 * @returns an array of multi-line strings, each a result of a single `console.trace` call
 */
function extractStackTraces(stderr: string): string[] {
    // Vue has '-' in front of the error message
    const stackTraceRegex = /^.*(?:(Error|Trace): tranSPArent flag)[\s\S]*?(?<trace>(?:\n.*at .*)+)/gm
    
    let result
    let stackTraces: string[] = []
    do {
        result = stackTraceRegex.exec(stderr)
        if (result) stackTraces.push(result.groups.trace)
    } while (result)

    return stackTraces
}

/**
 * Extract an array of `Location` (each represents a call edge) from a single 
 * stack trace.
 * 
 * `stringValue` is the enclosing function (or method) name.
 * `startLine` is the line within that function that invokes the next function.
 * except for the first one (which is the sink node).
 * `startColumn` are sometimes not accurate, (source-map problem?)
 * 
 * @param stackTrace a multi-line string, a result of a single `console.trace` call
 * @returns an array of objects, each representing a call edge in the stack trace
 */
function extractCallNodes(stackTrace: string): CallNode[] {
    const callNodeRegex = /at\s+(?<stringValue>.*)(?: \((?<filepath>.*):(?<startLine>\d+):(?<startCol>\d+)\))/

    const callTraces = stackTrace.split('\n')

    let result
    let callNodes: CallNode[] = []
    callTraces.forEach((callTrace) => {
        result = callNodeRegex.exec(callTrace)
        if (!result) return
        
        // Heuristic: if `stringValue` is a method, (e.g. Object.render)
        // then the `stringValue` is changed to the method name (e.g. render)
        result.groups.stringValue = result.groups.stringValue.split('.').pop()

        // TODO: heuristic for function renaming (e.g. foo [as bar])

        // Angular: if `filepath` contains protocol (`file://`), delete them
        result.groups.filepath = result.groups.filepath.replace('file://', '')

        callNodes.push(result.groups)
    })

    return callNodes
}