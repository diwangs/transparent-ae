/**
 * Interface representing a location (usually expression) in a source file.
 * 
 * This is designed to accomodate 3 things:
 * - The SARIF location format
 * - The CodeQL `Location` object
 * - The juggling of these things inside our code (e.g. Flow-TS bridge)
 */
export type Location = {
    stringValue?: string,   // String representation of the expression
    // Note: SARIF only have URI, careful with protocol prefix
    filepath: string,   // Might be absolute, might be relative
    startLine: number,
    endLine?: number,   // This is rarely used, but it's here for completeness
    startCol?: number,
    endCol?: number     // Note: SARIF marks the terminator, not the last character
}

// Compat
export type ExprLocation = Location

/**
 * Interface for describing an expr in the source code.
 * This should be expressive enough to:
 * - Refer to the same expr in multiple syntaxes, e.g. transpilation.
 * - Insert something before the enclosing statement.
 */
export type ExprDesc = {
    expr: Location,
    enclosingStmt?: Location,
    enclosingFunc?: Location,
}

/**
 * Interface for describing a single entry in the stack trace.
 * 
 * Although structurally identical, this is semantically different from a 
 * regular `Location` because its `stringValue` represents the name of the 
 * enclosing function rather than the expression itself (caller function).
 * 
 * We don't describe it as `ExprDesc` because from the stacktrace we only have 
 * info on the enclosing function, filepath, start line, and start column.
 * We don't have the expression itself to set `stringValue` of the `expr`.
 * 
 * Nomenclature:
 * - stacktraces: `string`  = raw text from test stderr
 * - stacktrace: `string`   = raw text from a single `console.trace` call
 * - callnodes: `CallNode[]`= list of callnodes from a stacktrace
 * - callnode: `CallNode`   = an object representing a single entry in a stacktrace
 */
export type CallNode = Location
export type CallEdge = Location // legacy

/**
 * Interface for describing two successive `CallNode`.
 * 
 * Note that this data structure contains information about the call edge 
 * between the two `CallNode`. 
 * However, it technically does not directly represent the call edge itself.
 * The reason being that the `succ` represents a caller function that is 
 * enclosed in the callee, instead of the callee itself. 
 * We would obtain the callee information later from CodeQL based on it.
 */
export type Stitch = {
    pred: CallNode,
    succ: CallNode
}