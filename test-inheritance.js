const API_URL = 'https://legal-topology.jhaladik.workers.dev';

const testQuery = {
  question: "Otec zemřel a v závěti odkázal rodinný dům v hodnotě 8 milionů Kč nejstaršímu synovi. Ostatní tři děti nebyli v závěti vůbec zmíněni, ale nyní požadují své zákonné dědické podíly. Nejstarší syn argumentuje, že o otce roky pečoval a ostatní sourozenci s ním nemluvili. Dvě z dětí jsou nezletilé, zastoupené matkou. Dům má navíc hypotéku 2 miliony Kč.",
  use_tensions: true
};

console.log('INHERITANCE CASE TEST');
console.log('Question:', testQuery.question);
console.log('\nCalling API...\n');

async function test() {
  const start = Date.now();
  const response = await fetch(API_URL + '/api/synthesize-multi-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testQuery)
  });

  const result = await response.json();
  
  console.log('TENSIONS:');
  result.topological_analysis.tensions.forEach(t => {
    console.log('- ' + t.tension_type + ': ' + t.competing_values.join(' vs '));
  });

  console.log('\nDOCTRINES:');
  result.topological_analysis.competing_doctrines.forEach(d => {
    console.log('- ' + d.doctrine + ' (' + d.weight + ')');
  });

  console.log('\nSTATUTES:', result.legal_research.statutes_found);
  console.log('CASES:', result.legal_research.cases_found);
  console.log('\nANALYSIS (first 800 chars):');
  console.log(result.analysis.substring(0, 800));
  console.log('\nTime:', (Date.now() - start) / 1000, 'seconds');
}

test();
