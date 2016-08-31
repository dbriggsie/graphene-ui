const fs = require('fs');
const path = require('path');


let commit = fs.readFileSync(path.join( '..', '.git', 'ORIG_HEAD')).toString('utf8');
commit = '<!-- commit ' + commit + ' -->';
let index = fs.readFileSync(path.join('dist', 'index.html')).toString('utf8');


let meta = `
<!-- 
custom
meta
information
--> 
`;
meta+=`${commit}`;


meta = index.split(`<!-- META -->`).join(meta);

fs.writeFileSync(path.join('dist', 'index.html'), meta, 'utf8');

console.log('writed ', commit);
