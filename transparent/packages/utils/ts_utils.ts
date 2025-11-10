/**
 * Remove typecast from expression recursively.
 * Assumption 1: typecast is always enclosed in a bracket.
 * Assumption 2: type is more than 1 character.
 * 
 * TODO: Use TypeScript module instead
 * https://stackoverflow.com/questions/17965572/compile-a-typescript-string-to-a-javascript-string-programmatically
 * 
 * e.g. given `((x as type1) as type2)`, just return `x`
 * 
 * @param {string} expr 
 * @returns {string} - expression without typecast
 */
export function removeTypecast(expr: string): string {
    if (!expr.includes(" as ")) 
        return expr;
    // Exclude (hardcoded) : and = and ,
    const regex = /(\()(.[^:=,]*)( as )(\w+\))/
    return removeTypecast(expr.replace(regex, '$2'))
}

/**
 * Translate filepath from react-src to react-src-ts
 * 
 * @param filepath 
 * @returns 
 */
export function translateFilepath(filepath: string): string {
    return filepath
        .replace('targets/react-src/react/', 'build/react-ts-src/')
        .replace('packages/', '')
        .replace('.js', '.ts')
}

/**
 * Pythonistaaa
 * Should be using Lodash instead
 * 
 * @param a 
 * @param b 
 * @returns 
 */
export const zip = (a: any[], b: any[]) => a.map((k, i) => [k, b[i]]);