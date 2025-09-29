/**
 * Test script to understand the tension-based vectorization flow
 * This shows exactly what data is sent to vectorization and how it comes back
 */

const API_URL = 'https://legal-topology.jhaladik.workers.dev';

// Test case: Classic tension scenario
const testQuery = {
  question: "Soused už 30 let chodí přes můj pozemek ke své chatě. Cesta není nikde zapsaná v katastru. Teď jsem se rozhodl pozemek oplotit. Může mi v tom zabránit?",
  use_tensions: true
};

console.log('========================================');
console.log('TENSION-BASED LEGAL TOPOLOGY FLOW TEST');
console.log('========================================\n');

async function testTensionFlow() {
  try {
    console.log('📝 ORIGINAL QUESTION:');
    console.log(testQuery.question);
    console.log('\n----------------------------------------\n');

    // Call the V2 endpoint
    console.log('🚀 Calling /api/synthesize-multi-v2...\n');

    const response = await fetch(`${API_URL}/api/synthesize-multi-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testQuery)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();

    // STEP 1: TOPOLOGICAL ANALYSIS
    console.log('📊 STEP 1: TOPOLOGICAL ANALYSIS (query-decomposer-v2.ts)');
    console.log('=========================================');

    if (result.topological_analysis) {
      const topo = result.topological_analysis;

      console.log('\n🎯 Identified Tensions:');
      topo.tensions.forEach((t, i) => {
        console.log(`  ${i + 1}. ${t.competing_values.join(' vs. ')}`);
        console.log(`     Type: ${t.tension_type}`);
        console.log(`     Strength: ${(t.strength * 100).toFixed(0)}%`);
        console.log(`     Reasoning: ${t.reasoning || 'N/A'}\n`);
      });

      console.log('⚡ Competing Doctrines:');
      topo.competing_doctrines.forEach(d => {
        console.log(`  - ${d.doctrine} (weight: ${(d.weight * 100).toFixed(0)}%)`);
        console.log(`    Resolves: ${d.resolves_tensions.join(', ')}`);
        console.log(`    Creates: ${d.creates_problems.join(', ')}`);
        console.log(`    Reasoning: ${d.reasoning}\n`);
      });

      console.log('⏰ Temporal Factors:');
      console.log(`  Duration: ${topo.temporal_factors.duration || 'N/A'}`);
      console.log(`  Creates expectation: ${topo.temporal_factors.creates_expectation}`);
      console.log(`  Years: ${topo.temporal_factors.years || 'N/A'}\n`);

      console.log('🔬 Absurdity Test:');
      console.log(`  Without primary doctrine: ${topo.absurdity_test.without_primary_doctrine}`);
      console.log(`  Confirms: ${topo.absurdity_test.confirms_doctrine}\n`);
    }

    // STEP 2: VECTOR STRATEGIES
    console.log('\n📐 STEP 2: VECTOR STRATEGIES (tension-vectorizer.ts)');
    console.log('=========================================');

    if (result.search_strategy) {
      const strategy = result.search_strategy;

      console.log(`\nVector strategies created: ${strategy.vector_strategies}`);
      console.log(`Used tensions: ${strategy.used_tensions}`);

      console.log('\n🔍 Search Provenance:');
      console.log(JSON.stringify(strategy.search_provenance, null, 2));
    }

    // STEP 3: WHAT VECTORS WERE CREATED
    console.log('\n\n🔢 STEP 3: VECTOR CREATION PROCESS');
    console.log('=========================================');
    console.log('Based on tensions, these vector operations occurred:\n');

    if (result.topological_analysis && result.topological_analysis.tensions) {
      result.topological_analysis.tensions.forEach((tension, i) => {
        console.log(`Tension ${i + 1}: ${tension.tension_type}`);
        console.log('  Vector formula:');

        // Show what the tension-vectorizer would do
        const tensionVectorOps = getTensionVectorOperations(tension.tension_type);
        console.log(`    BASE: "${tension.competing_values.join(' ')}"`);
        console.log(`    ADD: ${JSON.stringify(tensionVectorOps.add)}`);
        console.log(`    SUBTRACT: ${JSON.stringify(tensionVectorOps.subtract)}`);
        console.log(`    WEIGHT: ${tension.strength}`);
        console.log('');
      });
    }

    // STEP 4: SEARCH RESULTS
    console.log('\n📚 STEP 4: VECTOR SEARCH RESULTS');
    console.log('=========================================');

    console.log(`\nStatutes found: ${result.legal_research.statutes_found}`);
    console.log(`Cases found: ${result.legal_research.cases_found}`);
    console.log(`Doctrine clusters: ${result.legal_research.doctrine_clusters}`);

    console.log('\nTop Statutes:');
    result.statutory_foundation.slice(0, 3).forEach(s => {
      console.log(`  ${s.section}: relevance ${(s.relevance * 100).toFixed(0)}%`);
      console.log(`    Source: ${s.source.join(', ')}`);
    });

    console.log('\nTop Cases:');
    result.case_law.slice(0, 3).forEach(c => {
      console.log(`  ${c.case_id}: relevance ${(c.relevance * 100).toFixed(0)}%`);
      console.log(`    Court: ${c.court}`);
      console.log(`    Source: ${c.source.join(', ')}`);
    });

    // STEP 5: SYNTHESIS
    console.log('\n\n✍️ STEP 5: FINAL SYNTHESIS');
    console.log('=========================================');
    console.log('The LLM received:');
    console.log('- Identified tensions and their strengths');
    console.log('- Competing doctrines with weights');
    console.log('- Relevant statutes (tension/doctrine/keyword sourced)');
    console.log('- Case law with cluster information');
    console.log('- Absurdity test results\n');

    console.log('Analysis excerpt (first 500 chars):');
    console.log(result.analysis.substring(0, 500) + '...\n');

    // METADATA
    console.log('\n📊 METADATA');
    console.log('=========================================');
    console.log(`Model: ${result.metadata.model}`);
    console.log(`Processing time: ${result.metadata.processing_time_ms}ms`);
    console.log(`Analysis depth: ${result.metadata.analysis_depth}`);
    console.log(`Version: ${result.metadata.version}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Helper function to show what vector operations would happen
function getTensionVectorOperations(tensionType) {
  const tensionVectorMap = {
    'formal_vs_factual': {
      add: ['faktický stav', 'dlouhodobé užívání', 'dobrá víra', 'legitimní očekávání'],
      subtract: ['formální náležitosti', 'zápis v katastru', 'písemná forma']
    },
    'time_creates_rights': {
      add: ['vydržení', 'promlčení', 'legitimní očekávání', 'dobromyslná držba'],
      subtract: ['okamžitost', 'novost', 'přerušení']
    },
    'protection_vs_autonomy': {
      add: ['ochrana spotřebitele', 'nerovnováha sil', 'zneužití', 'slabší strana'],
      subtract: ['smluvní volnost', 'autonomie', 'B2B', 'profesionál']
    },
    // Add more as needed
  };

  return tensionVectorMap[tensionType] || { add: [], subtract: [] };
}

// Run the test
console.log('Starting test...\n');
testTensionFlow().then(() => {
  console.log('\n========================================');
  console.log('TEST COMPLETE');
  console.log('========================================');
});