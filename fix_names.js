const fs = require('fs');

let content = fs.readFileSync('app/index.tsx', 'utf8');

const replacements = {
  'icon_question.png': 'question-svgrepo-com.svg',
  'logo_grilu_vector.png': 'griloVetorizado.svg',
  'icon_location.png': 'location-pin-alt-1-svgrepo-com.svg',
  'icon_book.png': 'book-open-svgrepo-com.svg',
  'icon_sun.png': 'sun-svgrepo-com.svg',
  'icon_moon.png': 'moon-svgrepo-com.svg',
  'icon_export.png': 'arrow-up-right-from-square-svgrepo-com.svg',
  'icon_trash.png': 'trash-xmark-alt-svgrepo-com.svg',
  'tpanel_logo.png': 'TPanel.png',
  'logo_ufs.png': 'ufs_horizontal_positiva.png',
  'logo_griluee.png': 'logoGRILUU.png'
};

for (const [newN, oldN] of Object.entries(replacements)) {
  content = content.replace(new RegExp(newN, 'g'), oldN);
}

fs.writeFileSync('app/index.tsx', content);
