import { Location } from "./location"

/**
 * Given a JS object that conforms to the SARIF 2.1.0 format 
 * (e.g. the output of `codeql bqrs interpret --format=sarif` command),
 * return an array of ExprLocation array.
 * 
 * This inner array represents the data-flow sequence of a single result.
 * 
 * Param: You could find example of a SARIF object in `fixtures/vue.sarif.json` 
 * or the [spec](https://sarifweb.azurewebsites.net/)
 * 
 * Returns: should output something like this:
 * ```json
 * [
 *      [
 *          { "filepath": "...", "startLine": 1 }, // Source
 *          { "filepath": "...", "startLine": 2 }, // Intermediate
 *          { "filepath": "...", "startLine": 3 }, // Sink
 *      ],
 *      [
 *          { "filepath": "...", "startLine": 1 }, // Source
 *          { "filepath": "...", "startLine": 4 }, // Intermediate
 *          { "filepath": "...", "startLine": 3 }, // Sink
 *      ]
 * ]
 * ```
 * 
 * TODO: the outer array is technically supposed to be a set, not array
 * 
 * @param sarif The object that conforms to the SARIF 2.1.0 spec
 * @returns An array of Location array
 */
export function sarifToTable(sarif: Object): Location[][] {
    // console.log(sarif["runs"][0]["results"][0]["codeFlows"][0]["threadFlows"][0]["locations"])
    // results array    : different source-sink pairs
    // codeFlows array  : different path in a source-sink pair
    let taintPaths: Location[][] = []
    
    sarif["runs"][0]["results"].forEach((result: Object) => {
        result["codeFlows"].forEach((codeFlow: Object) => {
            taintPaths.push(codeFlow["threadFlows"][0]["locations"].map(parseSarifLocation))
        })
    })

    return taintPaths
}

function parseSarifLocation(location: Object): Location {
    return {
        // SARIF's URI starts with `file:`, we need to strip it
        filepath: (location["location"]["physicalLocation"]["artifactLocation"]["uri"] as string).replace(/^(file:)/g, ""),
        startLine: (location["location"]["physicalLocation"]["region"]["startLine"] as number),
        startCol: (location["location"]["physicalLocation"]["region"]["startColumn"] as number),
        // SARIF's endline signifies the terminator, not the last character, so substract by 1
        endCol: (location["location"]["physicalLocation"]["region"]["endColumn"] as number) - 1,
        // endline is not always present
    }
}