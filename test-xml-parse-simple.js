const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');

let xmlContent = fs.readFileSync('./decisions/Courtdecision/export-sample.xml', 'utf8');

// Fix single quotes in XML declaration
xmlContent = xmlContent.replace(/^<\?xml version='1.0' encoding='UTF-8'\?>/, '<?xml version="1.0" encoding="UTF-8"?>');

const parser = new DOMParser();
const doc = parser.parseFromString(xmlContent, 'text/xml');

const root = doc.documentElement;
console.log('Root:', root.tagName);

const dokumenty = root.getElementsByTagName('Dokument');
console.log('Found',  dokumenty.length, 'Dokument elements');

if (dokumenty.length > 0) {
  const first = dokumenty[0];
  const caseId = first.getElementsByTagName('JednaciCislo')[0]?.textContent;
  const court = first.getElementsByTagName('Soud')[0]?.textContent;
  console.log('First case:', caseId, 'from', court);
}
