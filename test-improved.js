const API_URL = 'https://legal-topology.jhaladik.workers.dev';

const testQuery = {
  question: "Soused 30 let chodí přes pozemek ke své chatě. Mohu oplotit?",
  use_tensions: true
};

console.log('Testing IMPROVED Junior/Senior Synthesis...\n');

async function test() {
  const start = Date.now();
  const response = await fetch(API_URL + '/api/synthesize-multi-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testQuery)
  });

  const result = await response.json();
  
  // Check junior lawyer resolutions
  console.log('JUNIOR LAWYER RESOLUTIONS:', 
    result.tension_resolutions ? 'YES (' + result.tension_resolutions.length + ')' : 'NO');
  
  if (result.tension_resolutions) {
    result.tension_resolutions.forEach((r, i) => {
      console.log('\n--- Resolution', i+1, ':', r.tension, '---');
      console.log(r.resolution.substring(0, 400));
    });
  }

  // Quality check
  console.log('\n\nQUALITY CHECK:');
  const analysis = result.analysis || '';
  
  console.log('- Has "22 Cdo 2570/98"?', analysis.includes('22 Cdo 2570/98'));
  console.log('- Has "pouhé strpění"?', analysis.includes('pouhé strpění'));
  console.log('- Has specific holdings?', analysis.includes('stanovil') || analysis.includes('rozhodl'));
  console.log('- Processing time:', ((Date.now() - start) / 1000).toFixed(1), 'seconds');

  console.log('\nFIRST 600 CHARS OF SYNTHESIS:');
  console.log(analysis.substring(0, 600));
}

test().catch(console.error);
