import fs from 'fs'
import { execSync } from 'child_process'
import PrettyTable from 'prettytable'

import { extrapolateMapping } from 'template-mapping/extrapolated-mapping'
import { concreteMapping } from 'template-mapping/concrete-mapping'

import { getGenericPattern } from 'taint-path/generic-analysis'
import { getFixedPattern } from 'taint-path/fixed-analysis'
import { getReferenceVariablePattern, getReferenceConstructorPattern } from 'taint-path/reference-analysis'

import { VUE2_PREFIX, generateVue2JsSyntax, generateVue2JsxSyntax, generateVue2Ref } from 'querygen/vue2'
import { REACT_PREFIX, generateReactJsSyntax, generateReactJsxSyntax, generateReactRef } from 'querygen/react'
import { ANGULAR_PREFIX, generateAngularRef } from 'querygen/angular'
import { autostitch, flowToTS, tsToFlow, writeStitchesToFile } from 'autostitch'

const DEST_DIR = '../../../qlpack/transparentsinks'

async function main() {
  // Do autostitch
  fs.mkdirSync('../../qlpacks/transparent/Stitches', { recursive: true });
  // Vue2
  const vue2SrcDir = '../../targets/vue2-src/vue'
  const vue2DbDir = '../../build/codeql-db/vue2-src'
  const vue2RunTestCmd = "pnpm test:unit 2>&1"
  const vue2TraceFlag = `console.trace('tranSPArent flag')`
  const vue2Stitches = autostitch(vue2DbDir, vue2SrcDir, vue2RunTestCmd, vue2TraceFlag)
  writeStitchesToFile(vue2Stitches, '../../qlpacks/transparent/Stitches/Vue2.qll')
  // React
  const reactSrcDir = '../../targets/react-src/react'
  const reactDbDir = '../../build/codeql-db/react-ts-src'
  const reactRunTestCmd = "yarn test 2>&1"
  const reactTraceFlag = `console.trace('tranSPArent flag')`
  const reactStitches = autostitch(reactDbDir, reactSrcDir, reactRunTestCmd, reactTraceFlag, tsToFlow, flowToTS)
  writeStitchesToFile(reactStitches, '../../qlpacks/transparent/Stitches/React.qll')
  // Angular
  const angularSrcDir = '../../targets/angular-src/angular'
  const angularDbDir = '../../build/codeql-db/angular-src'
  const angularRunTestCmd = isNixOS()
    ? "distrobox create -Y -i ubuntu:24.04 ubuntu && distrobox enter ubuntu -- ../scripts/test_on_ubuntu.sh 2>&1" 
    : "yarn test --cache_test_results=no --test_output=errors --experimental_ui_max_stdouterr_bytes=8389000 //packages/core/test //packages/common/test 2>&1"
  const angularTraceFlag = `console.error(new Error('tranSPArent flag'))`
  const angularStitches = autostitch(angularDbDir, angularSrcDir, angularRunTestCmd, angularTraceFlag)
  writeStitchesToFile(angularStitches, '../../qlpacks/transparent/Stitches/Angular.qll')

  // Do taint-path analysis
  const vue2JsDiscoveredSinks = [...getGenericPattern(vue2DbDir), ...getReferenceVariablePattern(vue2DbDir)]
  const reactJsDiscoveredSinks = [...getGenericPattern(reactDbDir), ...getFixedPattern(reactDbDir), ...getReferenceVariablePattern(reactDbDir)]
  const angularDiscoveredSinks = [...getGenericPattern(angularDbDir), ...getReferenceConstructorPattern(angularDbDir)]

  // Do template mapping analysis on Vue
  // JSX -> extrapolated mapping for attrs and domProps, concrete mapping for ref
  // Based on `test/test.js` in `babel-plugin-transform-vue-jsx` repo
  let vue2JsxDiscoveredMapping = {
    ...extrapolateMapping('<div><input id="hehe" ></div>', vue2JsDiscoveredSinks[0].replace('<nativeAttr>', 'id'), 'hehe'),
    ...extrapolateMapping('<div><input attrs-id="hehe" ></div>', vue2JsDiscoveredSinks[0].replace('<nativeAttr>', 'id'), 'hehe'),
    ...extrapolateMapping('<div><input domProps-innerHTML="<p>hi</p>" ></div>', vue2JsDiscoveredSinks[1].replace('<nativeProp>', 'innerHTML'), '<p>hi</p>'),
    ...extrapolateMapping('<div><input domPropsInnerHTML="<p>hi</p>" ></div>', vue2JsDiscoveredSinks[1].replace('<nativeProp>', 'innerHTML'), '<p>hi</p>'),
    ...concreteMapping('<div ref="myRef"></div>', vue2JsDiscoveredSinks[2], 'myRef')
  }
  // SFC -> extrapolated mapping for attrs, concrete mapping for v-html and ref
  // Based on `packages/compiler-sfc/test/compileTemplate.spec.ts`
  let vue2SfcDiscoveredMapping = {
    ...extrapolateMapping('<div><img src="https://foo.com/logo.png"></div>', vue2JsDiscoveredSinks[0].replace('<nativeAttr>', 'src'), 'https://foo.com/logo.png'),
    ...concreteMapping('<template><div v-html="<p>hi</p>"></div></template>', vue2JsDiscoveredSinks[1].replace('<nativeProp>', 'innerHTML'), '<p>hi</p>'),
    ...concreteMapping('<template><div ref="myRef"></div></template>', vue2JsDiscoveredSinks[2], 'myRef')
  }

  // Do template mapping analysis on React
  // Based on `packages/babel-plugin-transform-react-jsx/test/fixtures/react/*` on `babel/babel` repo
  // `input.js` files are the JSX templates, and `output.js` files contain the render function patterns
  let reactJsxDiscoveredMapping = {
    ...extrapolateMapping('<div><input data-value="a value" ></div>', reactJsDiscoveredSinks[0].replace('<nativeAttr>', 'data-value'), 'a value'),
    ...concreteMapping(`<div dangerouslySetInnerHTML='{{__html: "<p>hi</p>"}}'></div>`, reactJsDiscoveredSinks[1].replace('<nativeProp>', 'innerHTML'), '{{__html: "<p>hi</p>"}}'),
    ...concreteMapping('<div ref="myRef"></div>', reactJsDiscoveredSinks[2], 'myRef')
  }

  // Print all the discovered sinks
  const table5 = new PrettyTable();
  let rows = []
  // Vue
  for (const sink of vue2JsDiscoveredSinks) {
    rows.push([sink.replace('data.', ''), 'Vue', 'JS-Syntax'])
  }
  for (const sink of Object.keys(vue2JsxDiscoveredMapping)) {
    rows.push([sink, 'Vue', 'JSX-Syntax'])
  }
  for (const sink of Object.keys(vue2SfcDiscoveredMapping)) {
    rows.push([sink, 'Vue', 'SFC-Syntax'])
  }
  // React
  for (const sink of reactJsDiscoveredSinks) {
    rows.push([sink, 'React', 'JS-Syntax'])
  }
  for (const sink of Object.keys(reactJsxDiscoveredMapping)) {
    rows.push([sink, 'React', 'JSX-Syntax'])
  }
  // Angular
  for (const sink of angularDiscoveredSinks) {
    rows.push([sink, 'Angular', 'JS-Syntax'])
  }
  table5.create(['Discovered Sink', 'Framework', 'Syntax'], rows);
  console.log('Table V')
  table5.print();

  // Generate CodeQL classes only for novel sinks
  const vue2JsPatterns = vue2JsDiscoveredSinks.filter(sink => ['ref'].indexOf(sink) === -1).map(sink => sink.replace('data.', ''))
  const vue2JsxPatterns = Object.keys(vue2JsxDiscoveredMapping).filter(sink => ['ref', 'domProps<nativeProp>', '<nativeAttr>'].indexOf(sink) === -1)
  const isJsVue2Ref = vue2JsDiscoveredSinks.includes('ref')
  const isHmlVue2Ref = vue2JsxDiscoveredMapping.hasOwnProperty('ref') && vue2SfcDiscoveredMapping.hasOwnProperty('ref')
  const reactJsPatterns = reactJsDiscoveredSinks.filter(sink => ['ref', 'dangerouslySetInnerHTML'].indexOf(sink) === -1)
  const reactJsxPatterns = Object.keys(reactJsxDiscoveredMapping).filter(sink => ['ref', 'dangerouslySetInnerHTML'].indexOf(sink) === -1)
  const isJsReactRef = reactJsDiscoveredSinks.includes('ref')
  const isHtmlReactRef = reactJsxDiscoveredMapping.hasOwnProperty('ref')
  const isAngularRef = angularDiscoveredSinks.includes('ref')

  // Generate CodeQL classes to detect patterns in Vue applications
  let vue2QueryString = VUE2_PREFIX
  vue2QueryString += generateVue2JsSyntax(vue2JsPatterns)
  vue2QueryString += generateVue2JsxSyntax(vue2JsxPatterns)
  vue2QueryString += generateVue2Ref(isHmlVue2Ref, isJsVue2Ref)
  fs.writeFileSync(`${DEST_DIR}/Vue2.qll`, vue2QueryString)

  // Generate CodeQL classes to detect patterns in React applications
  let reactQueryString = REACT_PREFIX
  reactQueryString += generateReactJsSyntax(reactJsPatterns)
  reactQueryString += generateReactJsxSyntax(reactJsxPatterns)
  reactQueryString += generateReactRef(isHtmlReactRef, isJsReactRef)
  fs.writeFileSync(`${DEST_DIR}/React.qll`, reactQueryString)

  // Generate CodeQL classes to detect patterns in Angular applications
  let angularQueryString = ANGULAR_PREFIX
  if (isAngularRef) angularQueryString += generateAngularRef()
  fs.writeFileSync(`${DEST_DIR}/Angular.qll`, angularQueryString)
}

function isNixOS() {
  let isNixOS = false;
  try {
      const unameOutput = execSync('uname -a').toString().trim();
      isNixOS = unameOutput.includes('NixOS');
  } catch (error) {
      console.error('Error detecting OS:', error);
  }
  return isNixOS;
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});