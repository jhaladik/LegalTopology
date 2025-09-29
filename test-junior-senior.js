// Test to see what's actually happening in junior/senior synthesis

const API_URL = 'https://legal-topology.jhaladik.workers.dev';

const testQuery = {
  question: "Soused 30 let chodí přes pozemek. Mohu oplotit?",
  use_tensions: true
};

console.log('Testing Junior/Senior Synthesis...\n');

async function test() {
  const response = await fetch(API_URL + '/api/synthesize-multi-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testQuery)
  });

  const result = await response.json();
  
  // Check if tension resolutions exist
  console.log('JUNIOR LAWYER RESOLUTIONS PRESENT?', 
    result.tension_resolutions ? 'YES' : 'NO');
  
  if (result.tension_resolutions) {
    console.log('\nNumber of resolutions:', result.tension_resolutions.length);
    result.tension_resolutions.forEach((r, i) => {
      console.log(`\nResolution ${i+1}: ${r.tension}`);
      console.log('Content preview:', r.resolution.substring(0, 200) + '...');
    });
  }

  // Check analysis quality
  console.log('\n\nFINAL ANALYSIS QUALITY CHECK:');
  const analysis = result.analysis || '';
  
  // Look for specific case citations
  const hasCaseCitations = analysis.includes('Cdo') || analysis.includes('C ');
  console.log('Has specific case citations?', hasCaseCitations);
  
  // Look for specific section references
  const hasSpecificSections = /§\d{3,4}/.test(analysis);
  console.log('Has specific section references?', hasSpecificSections);
  
  // Check if it mentions specific holdings
  const hasSpecificHoldings = analysis.includes('rozhodl') || analysis.includes('judikatura');
  console.log('References specific holdings?', hasSpecificHoldings);

  // Sample of analysis
  console.log('\nAnalysis sample (first 500 chars):');
  console.log(analysis.substring(0, 500));
}

test().catch(console.error);
