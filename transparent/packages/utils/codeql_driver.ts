/**
 * @fileoverview A module for executing CodeQL queries.
 * This module is designed to mimic the functionality of an ORM, since 
 * CodeQL tries to mimic SQL.
 * It's also read only, so it's not a true ORM.
 * 
 * But for now, it only supports raw queries (and templated queries).
 */

import { SpawnSyncReturns, spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

import { sarifToTable } from './sarif-parser';

/**
 * A function to execute a CodeQL query string against a database.
 * 
 * @param dbPath 
 * @param query 
 * @returns 
 */
export function execQuery(dbPath: string, query: string): Object[] {
    const tmpQl = `../../build/temp.ql`
    writeFileSync(tmpQl, query)
    return execQueryFile(dbPath, tmpQl)
}

/**
 * A function to execute a CodeQL query template file against a database
 * 
 * @param dbPath Path to the database
 * @param templatePath Path to the query template file
 * @param params An object containing the parameters for the template. 
 * Keys are assumed to be unique (doesn't appear twice in the template file).
 * Every instance of `{{key}}` is assumed to exist in `params`, but not the other way around.
 * @returns 
 */
export function execQueryTemplate(dbPath: string, templatePath: string, params: Object): Object[] {
    const queryTemplate = readFileSync(templatePath, 'utf8')

    const query = queryTemplate.replace(/{{(.*?)}}/g, (_, p1) => {
        return params[p1]
    })

    // write filled template to the same dir as templatePath
    const templateDir = templatePath.split('/').slice(0, -1).join('/')
    const templateName = templatePath.split('/').slice(-1)[0]
    const filledName = templateName.replace('.ql.template', '.filled.ql')
    const filledPath = `${templateDir}/${filledName}`
    writeFileSync(filledPath, query)
    
    return execQueryFile(dbPath, filledPath)
}

/**
 * A function to execute a CodeQL query file against a database.
 * Returns the string result of the query.
 * 
 * Type of queries based on file name:
 * - Track: a path query, outputs SARIF
 * - Check: a regular query about node pair in path (e.g., reachability), outputs a table
 * - Select: a regular query about code (e.g., search an expr), outputs a table
 *  - New name for "search" and "list" queries
 * 
 * @param dbPath Path to the database
 * @param queryPath Path to query file
 * @returns Query result in a table format
 */
export function execQueryFile(dbPath: string, queryPath: string): Object[] {
    const cmd = `codeql query run --ram=8192 -o=../../build/temp.bqrs -d=${dbPath} ${queryPath}`
    // 8MB buffer instead of 200kb to avoid ENOBUFS
    // TODO: find a more elegant way to avoid ENOBUFS (low priority)
    const maxBuffer = 8 * 1024 * 1024 
    const spawnOpts = { shell: true, encoding: 'utf-8', maxBuffer }

    const queryResult = spawnSync(cmd, spawnOpts as any)
    checkError(queryResult)
    // Careful about this temp file if we want to do async
    
    // If query starts with 'track', its result is a path (outputs a SARIF file)
    if (path.basename(queryPath).startsWith('track')) {
        // Name the output file with `.json` so we could parse it with `require`
        // TODO: this has a max limit of 20 results
        const cmdBqrs = `codeql bqrs interpret -t=kind=path-problem -t=id=temp --format=sarifv2.1.0 --output=../../build/temp.sarif.json ../../build/temp.bqrs`
        const interpretResult = spawnSync(cmdBqrs, spawnOpts as any)
        checkError(interpretResult)
        const sarif = require('../../build/temp.sarif.json')
        return sarifToTable(sarif)
    } else {   
        const cmd2 = `codeql bqrs decode --format=json ../../build/temp.bqrs`
        const decodeResult = spawnSync(cmd2, spawnOpts as any)
        checkError(decodeResult)
        return rawResultToTable(JSON.parse(decodeResult.stdout))
    }
}

/**
 * Given a JS object outputed by `codeql bqrs decode --format=json`,
 * return an array of objects that represents a table.
 * 
 * `codeql bqrs decode --format=json` outputs a JS object that looks like this:
 * ```json
 * {
 *  "#select": {
 *      "columns": [{
 *          "name": "e",
 *          "type": "string"
 *      }],
 *      "tuples": [
 *          [{ "label": "\"Hello\""}]   
 *      ]
 *  }
 * }
 * ```
 * 
 * Instead, we only care about the `name` and `label` key
 * ```json
 * [{ "e": "\"Hello\"" }]
 * ```
 * 
 * @param rawResult The raw result of a `codeql bqrs decode --format=json` command
 * @returns An array of objects that represents a table
 */
function rawResultToTable(rawResult: Object): Object[] {
    let processedResult: Object[] = []
    // console.log(rawResult["#select"])

    rawResult["#select"].tuples.forEach((tuple) => {
        let row = {}
        tuple.forEach((value, index) => {
            const column = rawResult["#select"].columns[index]
            row[column.name] = column.kind === "Entity" ? value['label'] : value
        })
        processedResult.push(row)
    })
    
    return processedResult
}

/**
 * Check a spawned process for errors.
 * Done in the newer style of Go error handling.
 * 
 * @param result 
 * @throws Error if there is an error
 */
function checkError(result: SpawnSyncReturns<string>) {
    if (result.error) {
        // Child process can't spawn
        throw result.error
    } else if (result.signal == null && result.status !== 0) {
        // Child process has an error
        throw new Error(`Code ${result.status}: ${result.stderr}`)
    } else if (result.status == null && result.signal) {
        // Child process was terminated
        // NOTE: this behavior is different on Windows, but who cares
        throw new Error(`Signal ${result.signal}: ${result.stderr}`)
    }
}