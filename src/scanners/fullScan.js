const { glob } = require('glob');
const path = require('path');
const { processFiles } = require('../utils/fileUtils');

async function fullScan({
  repoPath, 
  dbAdapter, 
  fileExtensions, 
  excludePatterns,
  openaiModel
}) {
  console.log('Running full repository scan');
  
  // Знаходимо всі файли з відповідними розширеннями
  let allFiles = [];
  
  for (const ext of fileExtensions) {
    const files = await glob(`**/*${ext}`, { 
      cwd: repoPath,
      absolute: true
    });
    allFiles = [...allFiles, ...files];
  }
  
  // Виключаємо файли за патернами
  for (const pattern of excludePatterns) {
    const excludedFiles = await glob(pattern, { 
      cwd: repoPath,
      absolute: true 
    });
    allFiles = allFiles.filter(file => !excludedFiles.includes(file));
  }
  
  console.log(`Found ${allFiles.length} files to process`);
  
  // Обробляємо файли
  await processFiles({
    files: allFiles,
    dbAdapter,
    repoPath,
    openaiModel
  });
}

module.exports = {
  scanFull: fullScan
};