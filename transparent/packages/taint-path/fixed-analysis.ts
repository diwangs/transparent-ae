import { trackParamVal } from "./paramval-analysis";
import { Location } from "../utils/location";
import { execQueryTemplate } from "../utils/codeql_driver";

export function getFixedPattern(dbDir: string): string[] {
  console.log("Getting fixed patterns for db: " + dbDir);
  const paramValPaths = trackParamVal(dbDir, false);
  let result = [];

  for (const index of fixedIndex(dbDir)) {
      const paramValPath = paramValPaths[index];

      // Get all guard nodes
      let guardNodes = getGuardNodes(dbDir, paramValPath);

      // Only consider positive guard nodes since it is the kind that contains concrete value
      guardNodes = guardNodes.filter(gn => {
        return (gn.stringValue.includes("==") && gn.stringValue.endsWith("is true")) 
            || (gn.stringValue.includes("!=") && gn.stringValue.endsWith("is false"))
      });

      // Check if there is any string constant in the guard node and append its value
      const guardNodeStrs = guardNodes
        .map(gn => getStringConstantFromGuardNode(dbDir, gn).replace(/['"]/g, '')) // also get rid of quotes
        .filter(s => s.length > 0);

      result = result.concat(guardNodeStrs);
  }
  
  return result;
}

/**
 * Optimization
 * 
 * @param dbDir 
 * @returns 
 */
function fixedIndex(dbDir: string): number[] {
  if (dbDir.includes("react-ts-src")) {
      return [36] // innerHTML through initial
  }

  return []
}

/**
 * Get all unique guard nodes present in a path. The order will be the same as 
 * the path.
 *
 * NOTE: guard nodes does not have any column information.
 *
 * Uses `selectGuardNode.ql.template`
 * 
 * @param dbDir 
 * @param path 
 */
function getGuardNodes(dbDir: string, path: Location[]): Location[] {
  const templatePath = "../../qlpacks/transparent/selectGuardNode.ql.template"
  let guardNodes = []
  const seen = new Set<string>()

  path.forEach(loc => {
    const queryResult: Location[] = execQueryTemplate(dbDir, templatePath, {
      nodePath: loc.filepath,
      nodeSl: loc.startLine,
      nodeSc: loc.startCol,
      nodeEc: loc.endCol
    }) as Location[]

    queryResult.forEach(r => {
      // Trim the start value, since stringValue will be formatted as "guard: something is false"
      r.stringValue = r.stringValue.replace('guard: ', '')
      const key = `${r.stringValue}-${r.filepath}-${r.startLine}-${r.endLine}`
      if (!seen.has(key)) {
        seen.add(key)
        guardNodes.push(r)
      }
    })
  })

  return guardNodes
}

/**
 * Get the string constant value from a given guard node
 *
 * Uses `selectStringConstantFromGuardNode.ql.template`
 *
 * @param dbDir - the database directory
 * @param guardNode - the guard node location
 * @returns
 */
function getStringConstantFromGuardNode(dbDir: string, guardNode: Location): string {
  const templatePath = "../../qlpacks/transparent/selectStringConstantFromGuardNode.ql.template"
  const queryResult = execQueryTemplate(dbDir, templatePath, {
    gnPath: guardNode.filepath,
    gnSl: guardNode.startLine,
    gnEl: guardNode.endLine
  })

  if (queryResult.length === 0) {
      return ""
  }

  return queryResult[0]['stringConstant']
}