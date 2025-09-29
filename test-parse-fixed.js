const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

const xmlContent = fs.readFileSync('./decisions/Courtdecision/export-sample-fixed.xml', 'utf8');

const parser = new DOMParser();
const doc = parser.parseFromString(xmlContent, 'text/xml');

const root = doc.documentElement;
console.log('Root:', root.tagName);

const dokumenty = root.getElementsByTagName('Dokument');
console.log('Found', dokumenty.length, 'Dokument elements');

if (dokumenty.length > 0) {
  const first = dokumenty[0];
  const caseId = first.getElementsByTagName('JednaciCislo')[0]?.textContent;
  const court = first.getElementsByTagName('Soud')[0]?.textContent;
  const date = first.getElementsByTagName('DatumVydani')[0]?.textContent;
  console.log('\nFirst case:');
  console.log('  Case ID:', caseId);
  console.log('  Court:', court);
  console.log('  Date:', date);
}
