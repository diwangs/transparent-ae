import { XMLParser } from 'fast-xml-parser'

/**
 * 
 * @param source - the template pattern based on test inputs
 * @param expect - the expected variable assignment in the JS-syntax
 * @param toBe - the value to be matched
 * @returns 
 */
export function concreteMapping(source: string, expect: string, toBe: string): Object {
  const parser = new XMLParser({
    ignoreAttributes: false, // Attributes will have "@_" prefix
  })
  const dom = parser.parse(source)

  // Recursively find property name in the template based on value = toBe
  // Duplicate seems to be rare enough, so ignore
  function findAttrName(obj: any): string | null {
    for (const key in obj) {
      // Base case: found matching value
      if (obj[key] === toBe) 
        return key

      // Recursive case: dive into object
      if (typeof obj[key] === 'object') {
        const result = findAttrName(obj[key])
        if (result) {
          return result
        }
      }
    }
    return null
  }
  const foundAttrName = findAttrName(dom)?.replace(/^@_/, '');
  
  // Placeholder implementation
  return { [foundAttrName]: expect };
}