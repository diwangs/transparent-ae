import { execQueryTemplate } from "../utils/codeql_driver"

export function getReferenceVariablePattern(dbDir: string): string[] {
  console.log("Getting reference variable patterns for db: " + dbDir);
  const templatePath = '../../qlpacks/transparent/trackRefValue.ql.template'
  let framework = ''
  if (dbDir.includes("vue2-src")) {
      framework = 'Vue2'
  } else if (dbDir.includes("react-ts-src")) {
      framework = 'React'
  }
  const refValuePaths = execQueryTemplate(dbDir, templatePath, {
    framework
  })
  if (refValuePaths.length > 0) { // Vue2: 36, React: 28
    return ['ref']
  }

  return []
}

export function getReferenceConstructorPattern(dbDir: string): string[] {
  console.log("Getting reference variable patterns for db: " + dbDir);
  const templatePath = '../../qlpacks/transparent/trackRefConstructor.ql.template'
  let framework = ''
  if (dbDir.includes("angular-src")) {
      framework = 'Angular'
  } 
  const refConstructorPaths = execQueryTemplate(dbDir, templatePath, {
    framework
  })
  if (refConstructorPaths.length > 0) {
    return ['ref']
  }

  return []
}