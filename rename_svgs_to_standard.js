const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'assets/images');

const renames = {
  'arrow-up-right-from-square-svgrepo-com.svg': 'icon_export.svg',
  'book-open-svgrepo-com.svg': 'icon_book.svg',
  'griloVetorizado.svg': 'icon_grilu.svg',
  'location-pin-alt-1-svgrepo-com.svg': 'icon_location.svg',
  'moon-svgrepo-com.svg': 'icon_moon.svg',
  'question-svgrepo-com.svg': 'icon_question.svg',
  'sun-svgrepo-com.svg': 'icon_sun.svg',
  'trash-xmark-alt-svgrepo-com.svg': 'icon_trash.svg'
};

// Rename files
for (const [oldName, newName] of Object.entries(renames)) {
  const oldPath = path.join(imgDir, oldName);
  const newPath = path.join(imgDir, newName);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed ${oldName} to ${newName}`);
  }
}

// Update app/index.tsx
const indexPath = path.join(__dirname, 'app/index.tsx');
let content = fs.readFileSync(indexPath, 'utf8');

for (const [oldName, newName] of Object.entries(renames)) {
  content = content.replace(new RegExp(oldName, 'g'), newName);
}

fs.writeFileSync(indexPath, content);
console.log('Updated app/index.tsx');
