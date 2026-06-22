const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'assets/images');
const files = fs.readdirSync(imgDir).filter(f => f.endsWith('.svg'));

async function processSVGs() {
  for (const file of files) {
    const inputPath = path.join(imgDir, file);
    const pngName = file.replace('.svg', '.png');
    const outputPath = path.join(imgDir, pngName);
    
    // Some SVGs don't have explicit dimensions which causes sharp to fail or make tiny images.
    // We can read the SVG and force dimensions if necessary, or pass density.
    let svgContent = fs.readFileSync(inputPath, 'utf8');
    
    // ensure stroke is solid, fill is whatever, so tintColor works
    
    await sharp(Buffer.from(svgContent), { density: 300 })
      .resize(128, 128)
      .png()
      .toFile(outputPath);
    console.log(`Converted ${file} to ${pngName}`);
  }
}

processSVGs().catch(console.error);
