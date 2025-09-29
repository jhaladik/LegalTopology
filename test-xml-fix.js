const fs = require('fs');

let xmlContent = fs.readFileSync('./decisions/Courtdecision/export-sample.xml', 'utf8');

console.log('Original first line:', xmlContent.split('\n')[0]);

// Fix ALL single quotes in XML declaration to double quotes
xmlContent = xmlContent.replace(/^<\?xml ([^?]+)\?>/, (match, attrs) => {
  const fixed = attrs.replace(/='([^']*)'/g, '="$1"');
  return `<?xml ${fixed}?>`;
});

console.log('Fixed first line:', xmlContent.split('\n')[0]);

// Write fixed version
fs.writeFileSync('./decisions/Courtdecision/export-sample-fixed.xml', xmlContent, 'utf8');
console.log('Wrote fixed version');
