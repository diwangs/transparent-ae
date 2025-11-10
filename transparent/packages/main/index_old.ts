import { 
    DbToSrcFunc,
    SrcToDbFunc,
    autostitch,
    tsToFlow,
    flowToTS,
    writeStitchesToFile
} from 'autostitch'

const VUE_AUTOSTITCH_ARGS: [string, string, string] = [
    '../../build/codeql-db/vue2-src',
    '../../targets/vue2-src/vue',
    "pnpm install && pnpm test 2>&1"
]
const VUE_AUTOSTITCH_FILE = '../../qlpacks/transparent/Stitches/Vue.qll'

const REACT_AUTOSTITCH_ARGS: [string, string, string] = [
    '../../build/codeql-db/react-ts-src',
    '../../targets/react-src/react',
    "yarn install && yarn test 2>&1"
]
const REACT_AUTOSTITCH_OPTARGS: [
    DbToSrcFunc,
    SrcToDbFunc    
] = [tsToFlow, flowToTS]
const REACT_AUTOSTITCH_FILE = '../../qlpacks/transparent/Stitches/React.qll'

const ANGULAR_AUTOSTITCH_ARGS: [string, string, string] = [
    '../../build/codeql-db/angular-src',
    '../../targets/angular-src/angular',
    'distrobox enter ubuntu -- ../scripts/test_on_ubuntu.sh 2>&1'
    // "yarn install && yarn test //packages/core/test //packages/common/test //packages/platform-browser/test //packages/elements/test"

]
const ANGULAR_AUTOSTITCH_FILE = '../../qlpacks/transparent/Stitches/Angular.qll'

// const ANGULARJS_AUTOSTITCH_ARGS: [string, string, string] = [
//     '../../build/codeql-db/angularjs-src',
//     '../../targets/angularjs-src/angular.js',
//     // In their infinite wisdom, AngularJS decided to not provide headless test
//     // Use Puppeteer and set CHROME_BIN
//     "yarn14 && yarn14 grunt test:unit --browsers=Firefox --force 2>&1"
// ]
// const ANGULARJS_AUTOSTITCH_FILE = '../../qlpacks/transparent/Stitches/AngularJS.qll'

async function main() {
    let autostitchArgs: [string, string, string]
    let autostitchOptArgs: [DbToSrcFunc, SrcToDbFunc]
    let autostitchPath: string

    if (process.argv[2] === 'vue') {
        autostitchArgs = VUE_AUTOSTITCH_ARGS
        autostitchPath = VUE_AUTOSTITCH_FILE
    } else if (process.argv[2] === 'react') {
        autostitchArgs = REACT_AUTOSTITCH_ARGS
        autostitchOptArgs = REACT_AUTOSTITCH_OPTARGS
        autostitchPath = REACT_AUTOSTITCH_FILE
    } else if (process.argv[2] === 'angular') {
        autostitchArgs = ANGULAR_AUTOSTITCH_ARGS
        autostitchPath = ANGULAR_AUTOSTITCH_FILE
    // } else if (process.argv[2] === 'angularjs') {
    //     autostitchArgs = ANGULARJS_AUTOSTITCH_ARGS
    //     autostitchPath = ANGULARJS_AUTOSTITCH_FILE
    } else {
        console.log("Unknown target")
        return
    }

    console.log(`Running analysis for ${process.argv[2]}...`)
    
    // ========================================================================
    // AUTOSTITCH
    // ========================================================================
    // Execute query: list all the stitches
    console.log('Starting autostitch...')
    const stitches = autostitchOptArgs 
        ? autostitch(...autostitchArgs, ...autostitchOptArgs)
        : autostitch(...autostitchArgs)

    // Write stitches to a file
    console.log('Autostitch finished! Writing data-flow stitches to file...')
    writeStitchesToFile(stitches, autostitchPath)

    // Do generic analysis
}

main().catch(console.error)