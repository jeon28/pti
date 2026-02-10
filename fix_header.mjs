import fs from 'fs';
const data = fs.readFileSync('pti.db');
const stripped = data.slice(4);
fs.writeFileSync('pti_fixed.db', stripped);
console.log('Stripped 4 bytes. New size:', stripped.length);
