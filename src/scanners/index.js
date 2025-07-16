const { scanFull } = require('./fullScan');
const { scanDiff } = require('./diffScan');

async function scanRepository({ 
  repoPath, 
  dbAdapter, 
  mode, 
  fileExtensions, 
  excludePatterns,
  openaiModel
}) {
  console.log(`Starting repository scan in ${mode} mode`);
  console.log(`Repository path: ${repoPath}`);
  console.log(`File extensions: ${fileExtensions.join(', ')}`);
  console.log(`Exclude patterns: ${excludePatterns.join(', ')}`);
  
  if (mode === 'full') {
    await scanFull({
      repoPath,
      dbAdapter,
      fileExtensions,
      excludePatterns,
      openaiModel
    });
  } else if (mode === 'diff') {
    await scanDiff({
      repoPath,
      dbAdapter,
      fileExtensions,
      excludePatterns,
      openaiModel
    });
  } else {
    throw new Error(`Unsupported scan mode: ${mode}`);
  }
}

module.exports = {
  scanRepository
};