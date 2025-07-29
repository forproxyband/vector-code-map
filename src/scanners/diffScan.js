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

  const git = simpleGit(repoPath);

  const diffResult = await git.diff([`${commitSha}^..${commitSha}`, '--name-status', '-M']);


  const changedFiles = [];
  const deletedFiles = [];

  diffResult.split('\n').forEach(line => {
    if (!line.trim()) return;

    const parts = line.split('\t');
    const status = parts[0];

    // Перевіряємо чи це перейменований файл
    if (status.startsWith('R')) {
      // Для перейменованих файлів формат: R<score>\t<oldPath>\t<newPath>
      const oldPath = parts[1];
      const newPath = parts[2];

      const oldMatchesExtension = fileExtensions.some(ext => oldPath.endsWith(ext));
      const newMatchesExtension = fileExtensions.some(ext => newPath.endsWith(ext));

      const oldMatchesExcludePattern = excludePatterns.some(pattern => {
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');

        return new RegExp(`^${regexPattern}$`).test(oldPath);
      });

      const newMatchesExcludePattern = excludePatterns.some(pattern => {
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');

        return new RegExp(`^${regexPattern}$`).test(newPath);
      });

      // Додаємо старий шлях до видалених, якщо він відповідає критеріям
      if (oldMatchesExtension && !oldMatchesExcludePattern) {
        deletedFiles.push(oldPath);
      }

      // Додаємо новий шлях до змінених, якщо він відповідає критеріям
      if (newMatchesExtension && !newMatchesExcludePattern) {
        changedFiles.push(path.resolve(repoPath, newPath));
      }
    } else {
      const filePath = parts[1];

      // Перевіряємо розширення та патерни
      const matchesExtension = fileExtensions.some(ext => filePath.endsWith(ext));
      const matchesExcludePattern = excludePatterns.some(pattern => {
        const regexPattern = pattern
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');

        return new RegExp(`^${regexPattern}$`).test(filePath);
      });

      if (matchesExtension && !matchesExcludePattern) {
        if (status === 'D') {
          // Видалений файл
          deletedFiles.push(filePath);
        } else if (status === 'A' || status === 'M') {
          // Доданий (A) або змінений (M) файл
          changedFiles.push(path.resolve(repoPath, filePath));
        }
      }
    }
  });


  // const changedFiles = diffSummary.files
  //     .map(file => file.file)
  //     .filter(file => fileExtensions.some(ext => file.endsWith(ext)))
  //     .filter(file => !excludePatterns.some(pattern => {
  //       const regexPattern = pattern
  //           .replace(/\*\*/g, '.*')
  //           .replace(/\*/g, '[^/]*')
  //           .replace(/\?/g, '[^/]');
  //
  //       return new RegExp(`^${regexPattern}$`).test(file);
  //     }))
  //     .map(file => path.resolve(repoPath, file));

  console.log(`Found ${changedFiles.length} changed files in commit ${commitSha}`);


  // Отримуємо змінені файли з останнього коміту
  const status = await git.status();
  //
  // console.log(`git status ${status.current}`)
  // console.log(`git files count ${status.files.length}`)
  // console.log(`git created ${status.created.length}`)
  // console.log(`git modified ${status.modified.length}`)
  // console.log(`git renamed ${status.renamed.length}`)

  // Збираємо файли, які були змінені
  // const changedFiles = [
  //   ...status.modified,
  //   ...status.created,
  //   ...status.renamed.map(file => file.to)
  // ]
  //   .filter(file => fileExtensions.some(ext => file.endsWith(ext)))
  //   .filter(file => !excludePatterns.some(pattern => {
  //     // Конвертуємо glob паттерн у регулярний вираз
  //     const regexPattern = pattern
  //       .replace(/\*\*/g, '.*')
  //       .replace(/\*/g, '[^/]*')
  //       .replace(/\?/g, '[^/]');
  //
  //     return new RegExp(`^${regexPattern}$`).test(file);
  //   }))
  //   .map(file => path.resolve(repoPath, file));
  
  // Видалені файли
  // const deletedFiles = status.deleted
  //   .filter(file => fileExtensions.some(ext => file.endsWith(ext)))
  //   .filter(file => !excludePatterns.some(pattern => {
  //     const regexPattern = pattern
  //       .replace(/\*\*/g, '.*')
  //       .replace(/\*/g, '[^/]*')
  //       .replace(/\?/g, '[^/]');
  //
  //     return new RegExp(`^${regexPattern}$`).test(file);
  //   }));
  
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