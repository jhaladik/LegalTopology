const fs = require('fs');
const path = require('path');

// Load test cases
const testCases = JSON.parse(fs.readFileSync('./test-cases.json', 'utf8'));

// Load results
const timestamp = process.argv[2];
if (!timestamp) {
  console.error('Usage: node analyze-results.js <timestamp>');
  process.exit(1);
}

const resultsDir = `./test-results/${timestamp}`;
if (!fs.existsSync(resultsDir)) {
  console.error(`Results directory not found: ${resultsDir}`);
  process.exit(1);
}

console.log('================================');
console.log('Legal Topology Test Analysis');
console.log(`Timestamp: ${timestamp}`);
console.log('================================\n');

// Analysis functions
function extractStatutes(text) {
  if (!text) return [];
  const matches = text.match(/§\d+/g);
  return matches ? [...new Set(matches)] : [];
}

function extractDoctrines(text) {
  if (!text) return [];
  const doctrines = [];
  const lowerText = text.toLowerCase();

  if (lowerText.includes('bezdůvodné obohacení') || lowerText.includes('§2991')) {
    doctrines.push('unjust_enrichment');
  }
  if (lowerText.includes('společníci') || lowerText.includes('§2728')) {
    doctrines.push('partnership');
  }
  if (lowerText.includes('vydržení') || lowerText.includes('§1089')) {
    doctrines.push('adverse_possession');
  }
  if (lowerText.includes('promlčení') || lowerText.includes('§609')) {
    doctrines.push('prescription');
  }
  if (lowerText.includes('podnájem') || lowerText.includes('§2275') || lowerText.includes('§2276')) {
    doctrines.push('lease_subletting');
  }

  return doctrines;
}

function scoreResult(testCase, result, isOld) {
  const score = {
    test_id: testCase.id,
    endpoint: isOld ? 'old (synthesize-multi)' : 'new (topology/synthesize)',
    scores: {}
  };

  // Extract analysis text
  let analysisText = '';
  if (result.analysis) {
    analysisText = result.analysis;
  } else if (result.message) {
    analysisText = result.message;
  }

  const foundStatutes = extractStatutes(analysisText);
  const foundDoctrines = extractDoctrines(analysisText);

  // Score statute retrieval
  if (testCase.expected_primary_statute) {
    score.scores.primary_statute_found = foundStatutes.includes(testCase.expected_primary_statute);
    score.scores.primary_statute_rank = foundStatutes.indexOf(testCase.expected_primary_statute) + 1 || 'not found';
  }

  // Score doctrine identification
  if (testCase.expected_doctrines) {
    const expectedSet = new Set(testCase.expected_doctrines);
    const foundSet = new Set(foundDoctrines);
    const intersection = [...expectedSet].filter(d => foundSet.has(d));

    score.scores.doctrine_recall = intersection.length / expectedSet.size;
    score.scores.doctrines_found = intersection;
    score.scores.doctrines_missing = [...expectedSet].filter(d => !foundSet.has(d));
  }

  // Check for wrong doctrines
  if (testCase.expected_NOT_found) {
    const wrongDoctrines = testCase.expected_NOT_found.filter(d => foundDoctrines.includes(d));
    score.scores.wrong_doctrines = wrongDoctrines;
    score.scores.false_positives = wrongDoctrines.length > 0;
  }

  // Check for required terms
  if (testCase.correct_answer_includes) {
    const termsCovered = testCase.correct_answer_includes.filter(term =>
      analysisText.toLowerCase().includes(term.toLowerCase())
    );
    score.scores.required_terms_coverage = termsCovered.length / testCase.correct_answer_includes.length;
    score.scores.terms_missing = testCase.correct_answer_includes.filter(term =>
      !analysisText.toLowerCase().includes(term.toLowerCase())
    );
  }

  // Overall grade
  let totalScore = 0;
  let maxScore = 0;

  if (score.scores.primary_statute_found !== undefined) {
    totalScore += score.scores.primary_statute_found ? 1 : 0;
    maxScore += 1;
  }
  if (score.scores.doctrine_recall !== undefined) {
    totalScore += score.scores.doctrine_recall;
    maxScore += 1;
  }
  if (score.scores.required_terms_coverage !== undefined) {
    totalScore += score.scores.required_terms_coverage;
    maxScore += 1;
  }
  if (score.scores.false_positives !== undefined) {
    totalScore += score.scores.false_positives ? 0 : 0.5;
    maxScore += 0.5;
  }

  score.overall_grade = maxScore > 0 ? (totalScore / maxScore * 100).toFixed(1) + '%' : 'N/A';

  return score;
}

// Analyze all tests
const results = {
  single_issue: [],
  multi_issue: [],
  summary: {
    old_endpoint: { total: 0, passed: 0, avg_score: 0 },
    new_endpoint: { total: 0, passed: 0, avg_score: 0 }
  }
};

// Analyze single-issue tests
console.log('=== SINGLE ISSUE TESTS ===\n');
for (const testCase of testCases.single_issue_tests.slice(0, 5)) {
  const oldFile = path.join(resultsDir, `${testCase.id}_old.json`);
  const newFile = path.join(resultsDir, `${testCase.id}_new.json`);

  if (!fs.existsSync(oldFile) || !fs.existsSync(newFile)) {
    console.log(`${testCase.id}: Files not found, skipping\n`);
    continue;
  }

  const oldResult = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
  const newResult = JSON.parse(fs.readFileSync(newFile, 'utf8'));

  const oldScore = scoreResult(testCase, oldResult, true);
  const newScore = scoreResult(testCase, newResult, false);

  console.log(`${testCase.id}: ${testCase.name}`);
  console.log(`  Expected: ${testCase.expected_primary_statute}, Doctrines: ${testCase.expected_doctrines.join(', ')}`);
  console.log(`  OLD: Grade ${oldScore.overall_grade}`);
  console.log(`    - Primary statute found: ${oldScore.scores.primary_statute_found ? '✓' : '✗'}`);
  console.log(`    - Doctrine recall: ${(oldScore.scores.doctrine_recall * 100).toFixed(0)}%`);
  console.log(`    - Required terms: ${(oldScore.scores.required_terms_coverage * 100).toFixed(0)}%`);
  if (oldScore.scores.wrong_doctrines && oldScore.scores.wrong_doctrines.length > 0) {
    console.log(`    - ⚠️  Wrong doctrines: ${oldScore.scores.wrong_doctrines.join(', ')}`);
  }

  console.log(`  NEW: Grade ${newScore.overall_grade}`);
  console.log(`    - Primary statute found: ${newScore.scores.primary_statute_found ? '✓' : '✗'}`);
  console.log(`    - Doctrine recall: ${(newScore.scores.doctrine_recall * 100).toFixed(0)}%`);
  console.log(`    - Required terms: ${(newScore.scores.required_terms_coverage * 100).toFixed(0)}%`);
  if (newScore.scores.wrong_doctrines && newScore.scores.wrong_doctrines.length > 0) {
    console.log(`    - ⚠️  Wrong doctrines: ${newScore.scores.wrong_doctrines.join(', ')}`);
  }
  console.log('');

  results.single_issue.push({ test: testCase.id, old: oldScore, new: newScore });
}

// Analyze multi-issue tests
console.log('\n=== MULTI ISSUE TESTS ===\n');
for (const testCase of testCases.multi_issue_tests.slice(0, 3)) {
  const oldFile = path.join(resultsDir, `${testCase.id}_old.json`);
  const newFile = path.join(resultsDir, `${testCase.id}_new.json`);

  if (!fs.existsSync(oldFile) || !fs.existsSync(newFile)) {
    console.log(`${testCase.id}: Files not found, skipping\n`);
    continue;
  }

  const oldResult = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
  const newResult = JSON.parse(fs.readFileSync(newFile, 'utf8'));

  // For multi-issue, check if all expected issues were identified
  const expectedStatutes = testCase.expected_issues.map(i => i.statute);

  let oldAnalysis = oldResult.analysis || oldResult.message || '';
  let newAnalysis = newResult.analysis || newResult.message || '';

  const oldStatutes = extractStatutes(oldAnalysis);
  const newStatutes = extractStatutes(newAnalysis);

  const oldCoverage = expectedStatutes.filter(s => oldStatutes.includes(s)).length / expectedStatutes.length;
  const newCoverage = expectedStatutes.filter(s => newStatutes.includes(s)).length / expectedStatutes.length;

  console.log(`${testCase.id}: ${testCase.name}`);
  console.log(`  Expected issues: ${testCase.expected_issues.length}`);
  console.log(`  Expected statutes: ${expectedStatutes.join(', ')}`);
  console.log(`  OLD: ${(oldCoverage * 100).toFixed(0)}% coverage (${oldStatutes.length} statutes found)`);
  console.log(`  NEW: ${(newCoverage * 100).toFixed(0)}% coverage (${newStatutes.length} statutes found)`);

  if (testCase.competing_doctrines) {
    console.log(`  Doctrine conflict: ${Object.keys(testCase.competing_doctrines)[0]}`);
    const conflict = testCase.competing_doctrines[Object.keys(testCase.competing_doctrines)[0]];
    const oldHasWrong = oldAnalysis.toLowerCase().includes(conflict.wrong.split('(')[0].toLowerCase());
    const newHasWrong = newAnalysis.toLowerCase().includes(conflict.wrong.split('(')[0].toLowerCase());
    console.log(`    OLD: ${oldHasWrong ? '⚠️  Has wrong doctrine' : '✓ Avoided wrong doctrine'}`);
    console.log(`    NEW: ${newHasWrong ? '⚠️  Has wrong doctrine' : '✓ Avoided wrong doctrine'}`);
  }
  console.log('');

  results.multi_issue.push({
    test: testCase.id,
    old_coverage: oldCoverage,
    new_coverage: newCoverage
  });
}

// Summary statistics
console.log('\n=== SUMMARY ===\n');

const oldScores = results.single_issue.map(r => parseFloat(r.old.overall_grade));
const newScores = results.single_issue.map(r => parseFloat(r.new.overall_grade));

const avgOld = (oldScores.reduce((a, b) => a + b, 0) / oldScores.length).toFixed(1);
const avgNew = (newScores.reduce((a, b) => a + b, 0) / newScores.length).toFixed(1);

console.log(`Single-Issue Tests:`);
console.log(`  OLD endpoint average: ${avgOld}%`);
console.log(`  NEW endpoint average: ${avgNew}%`);
console.log(`  Improvement: ${(avgNew - avgOld).toFixed(1)}%\n`);

const oldMultiAvg = (results.multi_issue.reduce((sum, r) => sum + r.old_coverage, 0) / results.multi_issue.length * 100).toFixed(1);
const newMultiAvg = (results.multi_issue.reduce((sum, r) => sum + r.new_coverage, 0) / results.multi_issue.length * 100).toFixed(1);

console.log(`Multi-Issue Tests:`);
console.log(`  OLD endpoint average coverage: ${oldMultiAvg}%`);
console.log(`  NEW endpoint average coverage: ${newMultiAvg}%`);
console.log(`  Improvement: ${(newMultiAvg - oldMultiAvg).toFixed(1)}%\n`);

// Save detailed results
const reportFile = path.join(resultsDir, 'analysis_report.json');
fs.writeFileSync(reportFile, JSON.stringify({
  timestamp,
  results,
  summary: {
    single_issue: { old_avg: avgOld, new_avg: avgNew, improvement: (avgNew - avgOld).toFixed(1) },
    multi_issue: { old_avg: oldMultiAvg, new_avg: newMultiAvg, improvement: (newMultiAvg - oldMultiAvg).toFixed(1) }
  }
}, null, 2));

console.log(`Detailed analysis saved to: ${reportFile}\n`);