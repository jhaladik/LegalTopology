const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const xmlContent = fs.readFileSync('./decisions/Courtdecision/export-sample.xml', 'utf8');

console.log('XML file size:', xmlContent.length);

const options = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  ignoreDeclaration: true,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
  cdataTagName: false,
  allowBooleanAttributes: true
};

const parser = new XMLParser(options);
const result = parser.parse(xmlContent);

console.log('Parsed result keys:', Object.keys(result));

if (result.Dokumenty) {
  console.log('Dokumenty found!');
  const dokumenty = result.Dokumenty;
  console.log('Dokumenty keys:', Object.keys(dokumenty));
  
  if (dokumenty.Dokument) {
    const docs = Array.isArray(dokumenty.Dokument) ? dokumenty.Dokument : [dokumenty.Dokument];
    console.log(`Found ${docs.length} documents`);
    
    if (docs.length > 0) {
      console.log('\nFirst document:');
      console.log('JednaciCislo:', docs[0].JednaciCislo);
      console.log('Soud:', docs[0].Soud);
      console.log('DatumVydani:', docs[0].DatumVydani);
      console.log('Keys:', Object.keys(docs[0]));
    }
  }
}
