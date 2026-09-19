const fs = require('fs');
// clean up all patch files
const files = fs.readdirSync('.');
for (const file of files) {
  if (file.startsWith('patch_') && file.endsWith('.cjs')) {
    fs.unlinkSync(file);
  }
}
