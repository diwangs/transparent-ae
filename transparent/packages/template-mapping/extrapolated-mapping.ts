import { XMLParser } from 'fast-xml-parser'

// exclusively available through props and not attrs
const PROP_EX_LIST = [
  'innerHTML',
  'outerHTML'
]

/**
 * Generate a mapping of how template attributes map into compiled attributes
 * based on a single test case (i.e., single `expect().toBe()` ).
 * 
 * @param source - the template pattern based on test inputs
 * @param expect - the render function pattern based on test outputs that 
 *  matches our previous JS-syntax analysis (e.g., vnode.data.attrs.src)
 * @param toBe - the attribute value that is being mapped (e.g., "https://foo.com/logo.png")
 * @returns 
 */
export function extrapolateMapping(source: string, expect: string, toBe: string): Object {
  const parser = new XMLParser({
    ignoreAttributes: false, // Attributes will have "@_" prefix
  })
  const dom = parser.parse(source)
  
  // Find the expected attribute name in the JS-syntax
  let expectAttrName: string
  if (!expect.includes('(')) {
    expectAttrName = expect.split('.').pop();
  } else {
    // Angular-style method call -> extract first argument as attribute name
    const funcArgMatch = expect.match(/\((?:\s*['"]([^'"]+)['"])/);
    expectAttrName = funcArgMatch ? funcArgMatch[1] : '';
  }

  // Recursively find property name in the template based on two criterias: 
  // 1) Suffix = last property chain of expect 
  // 2) Value = toBe
  function findAttrName(obj: any): string | null {
    for (const key in obj) {
      // Base case: found matching value
      if (obj[key] === toBe && key.toLowerCase().endsWith(expectAttrName.toLowerCase())) 
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

  // Extrapolate mapping based on the prefix (i.e., { `${prefix}${expectAttrName}` : `${expect}` } )
  const prefix = foundAttrName?.substring(0, foundAttrName.length - expectAttrName!.length);
  const extrapolationType = PROP_EX_LIST.some(attr => attr.toLowerCase() === expectAttrName!.toLowerCase()) ? `<nativeProp>` : `<nativeAttr>`;
  return { [`${prefix}${extrapolationType}`]: expect.replace(expectAttrName!, extrapolationType) }
}
