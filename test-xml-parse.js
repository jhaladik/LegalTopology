const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

let xmlContent = fs.readFileSync('./decisions/Courtdecision/export-sample.xml', 'utf8');

console.log('XML file size:', xmlContent.length);
console.log('First 200 chars:', xmlContent.substring(0, 200));

xmlContent = xmlContent.replace(/^<\?xml version='1.0' encoding='UTF-8'\?>/, '<?xml version="1.0" encoding="UTF-8"?>');

const parser = new DOMParser({
  errorHandler: {
    warning: () => {},
    error: () => {},
    fatalError: (e) => console.error('Fatal:', e)
  }
});
const doc = parser.parseFromString(xmlContent, 'text/xml');

const root = doc.documentElement;
console.log('Root element:', root ? root.tagName : 'NO ROOT');

const dokumenty = doc.getElementsByTagName('Dokument');
console.log(`Found ${dokumenty.length} Dokument elements`);

if (root) {
  const children = root.childNodes;
  console.log(`Root has ${children.length} children`);
  for (let i = 0; i < Math.min(5, children.length); i++) {
    const child = children[i];
    console.log(`  Child ${i}: ${child.nodeName} (type: ${child.nodeType})`);
  }
}

if (dokumenty.length > 0) {
  const first = dokumenty[0];
  console.log('\nFirst document elements:');
  const jednaciCislo = first.getElementsByTagName('JednaciCislo');
  console.log(`JednaciCislo: ${jednaciCislo.length} elements`);
  if (jednaciCislo.length > 0) {
    console.log(`  Value: ${jednaciCislo[0].textContent}`);
  }

  const soud = first.getElementsByTagName('Soud');
  console.log(`Soud: ${soud.length} elements`);
  if (soud.length > 0) {
    console.log(`  Value: ${soud[0].textContent}`);
  }
}