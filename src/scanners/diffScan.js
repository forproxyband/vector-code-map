const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const { processFiles } = require('../utils/fileUtils');

async function scanDiff({ 
  repoPath, 
  dbAdapter, 
  fileExtensions, 
  excludePatterns,
  openaiModel
}) {
  console.log('Running diff scan for changed files');

  const commitSha = process.env.GITHUB_SHA;

  console.log(`commitSha ${commitSha}`);

  const git = simpleGit(repoPath);

  const diffSummary = await git.diffSummary([`${commitSha}^..${commitSha}`]);

  const changedFiles1 = diffSummary.files
      .map(file => file.file)
      .filter(file => fileExtensions.some(ext => file.endsWith(ext)))
      .filter(file => !excludePatterns.some(pattern => {
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');

        return new RegExp(`^${regexPattern}$`).test(file);
      }))
      .map(file => path.resolve(repoPath, file));

  console.log(`Found ${changedFiles1.length} changed files in commit ${commitSha}`);


  // Отримуємо змінені файли з останнього коміту
  const status = await git.status();

  console.log(`git status ${status.current}`)
  console.log(`git files count ${status.files.length}`)
  console.log(`git created ${status.created.length}`)
  console.log(`git modified ${status.modified.length}`)
  console.log(`git renamed ${status.renamed.length}`)

  // Збираємо файли, які були змінені
  const changedFiles = [
    ...status.modified,
    ...status.created,
    ...status.renamed.map(file => file.to)
  ]
    .filter(file => fileExtensions.some(ext => file.endsWith(ext)))
    .filter(file => !excludePatterns.some(pattern => {
      // Конвертуємо glob паттерн у регулярний вираз
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');
      
      return new RegExp(`^${regexPattern}$`).test(file);
    }))
    .map(file => path.resolve(repoPath, file));
  
  // Видалені файли
  const deletedFiles = status.deleted
    .filter(file => fileExtensions.some(ext => file.endsWith(ext)))
    .filter(file => !excludePatterns.some(pattern => {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\?/g, '[^/]');
      
      return new RegExp(`^${regexPattern}$`).test(file);
    }));
  
  console.log(`Found ${changedFiles.length} changed files`);
  console.log(`Found ${deletedFiles.length} deleted files`);
  
  // Видаляємо документи для видалених файлів
  for (const file of deletedFiles) {
    const relPath = path.relative(repoPath, file);
    await dbAdapter.deleteDocuments([relPath]);
  }
  
  // Обробляємо змінені файли
  if (changedFiles.length > 0) {
    await processFiles({
      files: changedFiles,
      dbAdapter,
      repoPath,
      openaiModel
    });
  }
}

module.exports = {
  scanDiff
};