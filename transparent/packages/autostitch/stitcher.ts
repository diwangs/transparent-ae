import * as fs from 'fs';
import { spawnSync } from 'child_process';

import { ExprLocation, CallNode, ExprDesc, Stitch } from '../utils/location';
import { execQueryFile, execQueryTemplate } from "../utils/codeql_driver";
import { zip } from '../utils/ts_utils';
import { extractCallEdgesSet } from './log-parser';

// Flag for React and Vue2 -> `console.trace('tranSPArent flag')`
// Flag for Angular -> `console.error(new Error('tranSPArent flag'))`

export type DbToSrcFunc = (sinksDesc: ExprDesc[]) => ExprDesc[]
export type SrcToDbFunc = (dbDir: string, callNodesSetSrc: Set<CallNode[]>) => Set<CallNode[]>

/**
 * The main function to perform autostitching on a CodeQL database
 * 
 * @param dbDir - Directory of the CodeQL database. Used to list sinks and check reachability.
 * @param srcDir - Directory of the framework source code. Used to run tests.
 * @param runTestCmd - Command to run the tests. Must be able to run from `srcDir`.
 * This function will only scan `stdout` for traces. If traces are being logged to `stderr`,
 * be sure to redirect `stderr` to `stdout` using somtehing like `2>&1` to `runTestCmd`.
 * @param traceFlag - Code to insert next to the sink. E.g. `console.trace('tranSPArent flag')`
 * Make sure that the traceFlag fulfills these two criterias:
 * 1. It must be on the same line as the sink (further analysis assumes the 
 *  same row number, but not necessarily column)
 * 2. Must output a trace (pay attention to `console.error` vs `console.trace`
 *  depending on the logging configuration of the framework tests)
 * @param dbToSrc - Optional function to preprocess the sinks from DB to source code.
 * Used for frameworks that are written in other languages that CodeQL can't analyze
 * type information from (e.g. React).
 * @param srcToDb - Optional function to postprocess the traces from source code back to DB.
 * The opposite of `dbToSrc`.
 * @returns stitches - Array of `Stitch` representing the data-flow stitches
 */
export function autostitch(dbDir: string, srcDir: string, runTestCmd: string, traceFlag: string, dbToSrc?: DbToSrcFunc, srcToDb?: SrcToDbFunc) {
    // Execute query: list all the sinks
    console.log('Listing DOM sinks...')
    const sinksDesc: ExprDesc[] = listSinks(dbDir)

    // Optional: preprocess db -> src 
    // We analyze frameworks in TS, but some frameworks (e.g. React) are
    // written in other languages that CodeQL can't analyze type information
    // from. Thus, we need to preprocess the sinks from the DB to the source
    // to make them recognizable by the tests.
    console.log('Preprocessing DOM sinks...')
    const sinks: ExprDesc[] = typeof dbToSrc === 'undefined' 
        ? sinksDesc
        : dbToSrc(sinksDesc)
    console.log(`Found ${sinks.length} DOM sinks`)
    
    // Insert `traceFlag` in the source code 
    console.log('Inserting traceFlag to source code...')
    sinks.forEach((sink) => {
        try {
            prependTextToLine(sink.enclosingStmt.filepath, sink.enclosingStmt.startLine, traceFlag)
        } catch(e) {
            console.log(e)
            console.log(`Probably overtainting anyway, ignoring...`)
        }
    })

    // Execute unit tests after the modification and read trace as call nodes
    console.log('Executing test and collecting render traces...')
    const childProcess = spawnSync(runTestCmd, { 
        cwd: srcDir,
        env: { ...process.env, NODE_ENV: 'development' },
        shell: true
    })
    const stackTraces: string = childProcess.stdout.toString().trim()
    const callNodesSetSrc: Set<CallNode[]> = extractCallEdgesSet(stackTraces)
    // If we found sinks but no traces, something is wrong
    if (sinks.length !== 0 && callNodesSetSrc.size === 0) {
        throw new Error(childProcess.stdout.toString())
    }
    console.log(`Collected ${callNodesSetSrc.size} unique stack traces`)

    // Revert the modification to the source code before returning
    console.log('Removing console.trace from source code...')
    sinks.forEach((sink) => {
        removeTextFromLine(sink.enclosingStmt.filepath, sink.enclosingStmt.startLine, traceFlag)
    })

    // Optional: postprocess src -> db
    // This is the opposite of the preprocess. After the test is run, we don't
    // need to look the source code anymore. We need to convert the traces back
    // to the DB format for further analysis.
    console.log('Postprocessing render traces...')
    const callNodesSet: Set<CallNode[]> = typeof srcToDb === 'undefined'
        ? callNodesSetSrc
        : srcToDb(dbDir, callNodesSetSrc)
    console.log(`Processed ${callNodesSet.size} unique stack traces`)
    
    // Execute query: for each stack trace, for every pair, is it reachable?
    console.log('Checking reachability from collected traces...')
    const stitches = produceStitches(dbDir, callNodesSet)

    // Return the stitches
    console.log(`Created ${stitches.length} data-flow stitches`)
    return stitches
}

/**
 * Function to get all the DOM sinks in a CodeQL database.
 * The result should be descriptive enough to do transpilation (e.g. React).
 * 
 * Uses `selectSinks.ql`
 * 
 * @param dbPath path to the CodeQL database
 * @returns Array of objects containing the location info in
 * the database
 */
export function listSinks(dbDir: string): ExprDesc[] {
    // TODO: change this to all sinks
    const queryPath = '../../qlpacks/transparent/selectSinks.ql'
    const rawResult = execQueryFile(dbDir, queryPath)

    const result: ExprDesc[] = rawResult.map((sink) => {
        const expr: ExprLocation = {
            stringValue: sink['node'],
            filepath: sink['filepath'],
            startLine: sink['sl'],
            endLine: sink['el'],
            startCol: sink['sc'],
            endCol: sink['ec']
        }
        const enclosingStmt: ExprLocation = {
            stringValue: sink['enclosingStmt'],
            filepath: sink['filepath'],
            startLine: sink['ssl'],
            endLine: sink['sel'],
            startCol: sink['ssc'],
            endCol: sink['sec']
        }
        return { expr, enclosingStmt }
    })
    return result
}

/**
 * Prepend content to a specific line in a file.
 * Used to insert `console.trace` in the source code.
 * 
 * @param filepath file path
 * @param line line number to insert the content
 * @param content content to insert
 */
function prependTextToLine(filepath: string, line: number, content: string) {
    let data = fs.readFileSync(filepath, 'utf-8').toString().split('\n');
    let lineText = data[line - 1];              // `line` is 1-indexed
    if (lineText.includes(content)) return      // Idempotency
    lineText = `${content};${lineText}`
    data[line - 1] = lineText
    const text = data.join('\n');
    fs.writeFileSync(filepath, text, 'utf-8');
}

/**
 * Remove a content from lines in a file.
 * Used to reverse the modification to the source code.
 * 
 * @param filepath file path
 * @param content content to remove
 */
function removeTextFromLine(filepath: string, line: number, content: string) {
    let data = fs.readFileSync(filepath, 'utf-8').toString().split('\n');
    let lineText = data[line - 1];              // `line` is 1-indexed
    if (!lineText.includes(content)) return     // Idempotency
    lineText = lineText.replace(`${content};`, '')  
    data[line - 1] = lineText.replace(`${content};`, '')
    const text = data.join('\n');
    fs.writeFileSync(filepath, text, 'utf-8');
}

/**
 * Produce a set of stitches from a set of call edges.
 * This will only return pairs that are unreachable.
 * 
 * @param dbDir 
 * @param callNodesSet 
 * @returns 
 */
function produceStitches(dbDir: string, callNodesSet: Set<CallNode[]>): Stitch[] {
    let stitches: Stitch[] = []
    
    // Bandaid solution to prevent duplicate stitches, previous attempt is leaky
    // TODO: Ugly, fix this (low priority)
    let stitchCache: Set<string> = new Set()
    let idx: number = 1

    callNodesSet.forEach((callNodes) => {
        console.log(`Checking trace ${idx}/${callNodesSet.size}`)
        zip(callNodes.slice(0, -1), callNodes.slice(1)).forEach(([succ, pred]) => {
            // Optimization: Skip if pred is from test files
            if (isTestFile(pred.filepath) || isTestFile(succ.filepath)) return

            // Optimization: caching
            const stitchStr = JSON.stringify({ pred, succ })
            if (stitchCache.has(stitchStr)) return
            stitchCache.add(stitchStr)

            // Check if pred -> succ is reachable
            if (isReachable(dbDir, pred, succ)) return
            console.log(`Unreachable: ${pred.stringValue} -> ${succ.stringValue}`)
            
            // If not reachable, add to stitches
            stitches.push({ pred, succ })
        })
        idx += 1
    })
    
    return stitches
}

/**
 * Determine if a file is a test file based on its name
 * 
 * @param filepath file path
 * @returns 
 */
function isTestFile(filepath: string): boolean {
    return filepath.includes('test') 
        || filepath.includes('Test')
        || filepath.includes('jest')
        || filepath.includes('node_modules')
}

/**
 * Given a pair, is it reachable?
 * 
 * Uses `checkReachability.ql.template`
 * 
 * @param dbDir 
 * @param pred 
 * @param succ 
 * @returns 
 */
export function isReachable(dbDir: string, pred: CallNode, succ: CallNode): boolean {
    // Execute query: for every CallNode pair, does the call edge within them exist?
    const templatePath = '../../qlpacks/transparent/checkReachability.ql.template'

    const queryResult = execQueryTemplate(dbDir, templatePath, {
        "srcPath": pred.filepath,
        "srcSl": pred.startLine,
        "dstPath": succ.filepath,
        "dstSl": succ.startLine
    })
    return queryResult.length !== 0
}

/**
 * Write the stitches to a file
 * 
 * @param stitches 
 * @param filepath 
 */
export function writeStitchesToFile(stitches: Stitch[], filepath: string) {
    const INTRO = `import javascript

predicate autostitchTaintStep(DataFlow::Node src, DataFlow::Node dst) {`

    const OUTRO = `\n}`

    fs.writeFileSync(filepath, INTRO, { flag: 'w' })

    let first = true
    for (const stitch of stitches) {
        if (!first) fs.appendFileSync(filepath, '\n\tor', { flag: 'a' })
        first = false

        // React special-case: `workLoop{Sync|Concurrent}` doesn't have a 
        // parameter. Rather, statements inside them rely on global variable.
        // For this, stitch the `prepareFreshStack()` inside the invokation 
        // enclosing function (which writes the globals) to that globals read 
        // inside it.
        // See: packages/react-reconciler/src/ReactFiberWorkLoop.{new|old}.js
        if (stitch.succ.stringValue.match('workLoop.+')) {
            console.log("Special case found: React workLoop")

            fs.appendFileSync(filepath, `
    exists(DataFlow::InvokeNode invkNode, DataFlow::Node sinkNode, Location invkLoc, Location sinkLoc | invkLoc = invkNode.asExpr().getLocation() and sinkLoc = sinkNode.asExpr().getLocation() |
        invkLoc.getFile().getAbsolutePath().matches("%${stitch.pred.filepath}") and
        invkLoc.getStartLine() = ${stitch.pred.startLine} and
        src.asExpr().getEnclosingFunction() = invkNode.getEnclosingFunction() and
        src.(DataFlow::InvokeNode).getCalleeName() = "prepareFreshStack"
        and 
        sinkLoc.getFile().getAbsolutePath().matches("%${stitch.succ.filepath}") and
        sinkLoc.getStartLine() = ${stitch.succ.startLine} and
        dst = sinkNode.(DataFlow::InvokeNode).getArgument(0) // should be workInProgress
    )`, { flag: 'a' })

            continue
        }

        fs.appendFileSync(filepath, `
    exists(DataFlow::InvokeNode invkNode, DataFlow::Node sinkNode, Location invkLoc, Location sinkLoc, int i | invkLoc = src.asExpr().getLocation() and sinkLoc = sinkNode.asExpr().getLocation() |
        invkLoc.getFile().getAbsolutePath().matches("%${stitch.pred.filepath}") and
        invkLoc.getStartLine() = ${stitch.pred.startLine} and
        src = invkNode.getArgument(i) 
        and 
        sinkLoc.getFile().getAbsolutePath().matches("%${stitch.succ.filepath}") and
        sinkLoc.getStartLine() = ${stitch.succ.startLine} and
        dst.asExpr() = sinkNode.asExpr().getEnclosingFunction().getParameter(i)
    )`, { flag: 'a' })

    }

    fs.appendFileSync(filepath, OUTRO, { flag: 'a' })
}