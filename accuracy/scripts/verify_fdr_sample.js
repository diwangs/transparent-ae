const fs = require('fs')
const path = require('path')

async function main() {
  // Check if all samples in `fdr/samples/{vanilla,transparent}` exist in `fdr/build/`
  const samplesDir = path.join(__dirname, '..', 'fdr', 'samples')
  const buildDir = path.join(__dirname, '..', 'fdr', 'build')

  const variants = ['vanilla', 'transparent']
  for (const variant of variants) {
    const variantSamplesDir = path.join(samplesDir, variant)
    const sampleFiles = fs.readdirSync(variantSamplesDir)

    for (const sampleFile of sampleFiles) {
      const sampleFilePath = path.join(variantSamplesDir, sampleFile)
      const sampleAlerts = require(sampleFilePath)['#select'].tuples

      const buildFilePath = path.join(buildDir, sampleFile)
      if (!fs.existsSync(buildFilePath)) {
        console.error(`Build file not found for sample: ${sampleFile}`)
        continue
      }
      const buildAlerts = require(buildFilePath)['#select'].tuples

      for (const sampleAlert of sampleAlerts) {
        const existsInBuild = buildAlerts.some(
          (buildAlert) => buildAlert[0] === sampleAlert[0] && buildAlert[1] === sampleAlert[1]
        )
        if (!existsInBuild) {
          console.error(`Alert not found in build for sample: ${sampleFile}, alert: ${JSON.stringify(sampleAlert)}`)
        }
      }
    }
  }
}

main()