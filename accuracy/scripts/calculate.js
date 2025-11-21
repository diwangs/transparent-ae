/**
 * Calculate the FNR and FDR for Table 4 in the paper.
 * 
 * It will be defined by the known CVE of those projects, specifically the 
 * location of its sink (i.e., file and line number)
 * 
 * We only define sink label and not source because true positives (i.e., CVEs) 
 * are almost always only defined by sinks in their description and/or fixes. 
 * This is because sources are often generic and can be used in many contexts, 
 * while sinks are more specific.
 * 
 * For evaluating false positives, we need the source label to help validate 
 * exploitability. However, for the purpose of counting, we only need the sink.
 */

const fs = require('fs')
const path = require('path')

// FNR constants
const alertFnDir = '../fnr/build/'
const knownDir = '../fnr/labels/'

// FDR constants
const alertFpDir = '../fdr/samples/'
const transparentAlertFpDir = path.join(alertFpDir, 'transparent')
const vanillaAlertFpDir = path.join(alertFpDir, 'vanilla')
const exploitableDir = '../fdr/labels/'
const transparentExploitableDir = exploitableDir
const vanillaExploitableDir = exploitableDir

async function main() {
  /**
   * FNR
   */
  const knownListNames = fs.readdirSync(knownDir)
  let knownCount = 0
  let transparentFnList = []
  let vanillaFnList = []
  // Iterate through repositories that is known to have vulnerabilities
  for (const knownListName of knownListNames) {
    // Get the known vulnerability list for the current repository
    const knownListPath = path.join(knownDir, knownListName)
    const knownList = require(knownListPath)
    knownCount += knownList.length

    // Get the false negatives for TranSPArent
    const transparentAlertFnListPath = path.join(alertFnDir, knownListName.replace('.json', '_t.json'))
    if (fs.readFileSync(transparentAlertFnListPath, 'utf8').trim() === '') {
      // Empty file means nothing found, all truths are missed.
      transparentFnList = transparentFnList.concat(knownList)
    } else {
      const transparentAlertFnList = require(transparentAlertFnListPath)
      transparentFnList = transparentFnList.concat(getFnList(transparentAlertFnList, knownList))
    }

    // Get the false negatives for Vanilla CodeQL
    const vanillaAlertFnListPath = path.join(alertFnDir, knownListName.replace('.json', '_b.json'))
    if (fs.readFileSync(vanillaAlertFnListPath, 'utf8').trim() === '') {
      // Empty file means nothing found, all truths are missed.
      vanillaFnList = vanillaFnList.concat(knownList)
    } else {
      const vanillaAlertFnList = require(vanillaAlertFnListPath)
      vanillaFnList = vanillaFnList.concat(getFnList(vanillaAlertFnList, knownList))
    }
  }

  /**
   * FDR
   */
  let transparentAlertCount = 0
  let transparentFpList = []
  const transparentAlertFpNames = fs.readdirSync(transparentAlertFpDir)
  for (const alertFpName of transparentAlertFpNames) {
    const alertFpPath = path.join(transparentAlertFpDir, alertFpName)
    const alertFpList = require(alertFpPath)

    // Check if alertFpName ends with _t.json or _b.json
    if (alertFpName.endsWith('_t.json')) {
      transparentAlertCount += alertFpList['#select'].tuples.length

      // check if the alert is exploitable
      const exploitablePath = path.join(transparentExploitableDir, alertFpName.replace('_t.json', '.json'))
      if (fs.existsSync(exploitablePath)) {
        // If there is an exploitable list, check against it
        const exploitableList = require(exploitablePath)
        transparentFpList = transparentFpList.concat(getFpList(alertFpList, exploitableList))
      } else {
        // If there is no exploitable list, all alerts are false positives
        transparentFpList = transparentFpList.concat(alertFpList['#select'].tuples.map(item => {
          return {
            relativePath: item[0],
            startLine: Number(item[1])
          }
        }))
      }
    }
  }

  let vanillaAlertCount = 0
  let vanillaFpList = []
  const vanillaAlertFpNames = fs.readdirSync(vanillaAlertFpDir)
  for (const alertFpName of vanillaAlertFpNames) {
    const alertFpPath = path.join(vanillaAlertFpDir, alertFpName)
    const alertFpList = require(alertFpPath)

    // Check if alertFpName ends with _t.json or _b.json
    if (alertFpName.endsWith('_b.json')) {
      vanillaAlertCount += alertFpList['#select'].tuples.length

      // check if the alert is exploitable
      const exploitablePath = path.join(vanillaExploitableDir, alertFpName.replace('_b.json', '.json'))
      if (fs.existsSync(exploitablePath)) {
        // If there is an exploitable list, check against it
        const exploitableList = require(exploitablePath)
        vanillaFpList = vanillaFpList.concat(getFpList(alertFpList, exploitableList))
      } else {
        // If there is no exploitable list, all alerts are false positives
        vanillaFpList = vanillaFpList.concat(alertFpList['#select'].tuples.map(item => {
          return {
            relativePath: item[0],
            startLine: Number(item[1])
          }
        }))
      }
    }
  }

  /**
   * Tabulation
   */
  // Count the length of the lists for tabulation
  const transparentFnCount = transparentFnList.length // 11/56
  const vanillaFnCount = vanillaFnList.length         // 35/56
  const transparentFpCount = transparentFpList.length // 24/57  
  const vanillaFpCount = vanillaFpList.length         // 17/34

  // Print the results as table
  console.log(`---`)
  console.log(`Table 4 \t\t FNR \t\t\t FDR`)

  console.log(`TranSPArent:    \t ${transparentFnCount}/${knownCount} (${(transparentFnCount/knownCount*100).toFixed(1)}%);   \t ${transparentFpCount}/${transparentAlertCount} (${(transparentFpCount/transparentAlertCount*100).toFixed(1)}%);`)
  console.log(`Vanilla CodeQL: \t ${vanillaFnCount}/${knownCount} (${(vanillaFnCount/knownCount*100).toFixed(1)}%); \t ${vanillaFpCount}/${vanillaAlertCount} (${(vanillaFpCount/vanillaAlertCount*100).toFixed(1)}%);`)
}

/**
 * Get ground truth data that doesn't appear in an alert list.
 * This will iterate through the truth list and check if each truth is in the
 * alert list. If not, it is considered a missed true positive (i.e., false negative).
 * 
 * This function works on single respository basis.
 * 
 * @param {Object} alertList List of alert produced by the tool
 * @param {Array} truthList List of ground truth data
 * @returns {Array} Array of objects of false positives in `truthList`
 */
function getFnList(alertList, truthList) {
  const result = []
  // console.log(alertList, truthList)

  for (const truth of truthList) {
    const relativePath = truth.relativePath
    const startLine = truth.startLine

    const found = alertList['#select'].tuples.some(item => {
      // item[0] is path, item[1] is line number
      return item[0] === relativePath && Number(item[1]) === startLine
    })

    if (!found) {
      result.push(truth)
    }
  }

  return result
}

/**
 * Get the false positives (FP) from the alert list and the exploitable list.
 * This will iterate through the alert list and check if each alert is in the
 * exploitable list. If not, it is considered a false positive.
 * 
 * The path represents a list for a single repository.
 * 
 * @param {Object} alertList List of alert produced by the tool
 * @param {Array} exploitableList List of known vulnerabilities
 * @returns {Array} Array of objects of false positives in `exploitableList`
 */
function getFpList(alertList, exploitableList) {
  const result = []

  for (const alert of alertList['#select'].tuples) {
    const relativePath = alert[0]
    const lineNumber = Number(alert[1])

    const found = exploitableList.some(item => {
      return item.relativePath === relativePath && item.startLine === lineNumber
    })
    
    if (!found) {
      result.push({
        relativePath: relativePath,
        startLine: lineNumber
      })
    }
  }

  return result
}

main().catch(console.error)

// FDR: 81/165 (49.1%) 90/169 -> 79 TP -> 76/155
// Decrease 14 data points that are false
// TODO: create "samples" folder to decrease more granularly