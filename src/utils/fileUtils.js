const fs = require('fs').promises;
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');

async function processFiles({ files, dbAdapter, repoPath, openaiModel, collectionName = null }) {
  // Створюємо текстовий сплітер
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    lengthFunction: (text) => {
      // Проста оцінка кількості токенів: ~4 символи = 1 токен
      return Math.ceil(text.length / 4);
    }
  });

  // Максимальна кількість токенів у пакеті документів
  const MAX_TOKENS_PER_BATCH = process.env.MAX_TOKENS_PER_BATCH || 250000; // Беремо з запасом від 300000

  let documents = [];
  let metadatas = [];
  let ids = [];
  let currentBatchTokens = 0;

  const totalFiles = files.length;
  let processedFiles = 0;
  let lastReportedPercentage = -5; // Починаємо з від'ємного значення, щоб гарантовано вивести 0%
  let totalChunks = 0;
  let processedChunks = 0;


  function reportProgress() {
    const percentage = Math.floor((processedFiles / totalFiles) * 100);

    if (percentage >= lastReportedPercentage + 5) {
      console.log(`Progress: ${percentage}% (processed ${processedFiles}/${totalFiles} files, ${processedChunks} chunks)`);
      lastReportedPercentage = percentage;
    }
  }

  async function sendBatch() {
    if (documents.length === 0) return;

    try {
      // Додаємо до бази даних
      await dbAdapter.addDocuments(documents, metadatas, ids, collectionName);

      // Очищаємо пакет
      documents = [];
      metadatas = [];
      ids = [];
      currentBatchTokens = 0;
    } catch (error) {
      console.error(`Error adding document package:`, error);
    }
  }

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Розбиваємо на чанки
      const chunks = await textSplitter.splitText(content);
      // Готуємо метадані
      const relPath = path.relative(repoPath, filePath);

      totalChunks += chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        // Унікальний ID для кожного чанка
        const chunkId = `${relPath}_${i}`;

        // Оцінка кількості токенів у чанку
        const chunkTokens = Math.ceil(chunks[i].length / 4);
        // Якщо додавання чанка перевищить ліміт токенів - відправляємо накопичений пакет
        if (currentBatchTokens + chunkTokens > MAX_TOKENS_PER_BATCH) {
          await sendBatch();
        }

        documents.push(chunks[i]);
        metadatas.push({
          file_path: relPath,
          chunk_index: i,
          total_chunks: chunks.length
        });
        ids.push(chunkId);
        currentBatchTokens += chunkTokens;
        processedChunks++;
      }

      if (documents.length > 0) {
        await sendBatch();
      }
      // Додаємо до бази даних
      // await dbAdapter.addDocuments(documents, metadatas, ids);

      processedFiles++;
      reportProgress();

    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);

      processedFiles++;
      reportProgress();

    }
  }

  // Відправляємо останній пакет
  if (documents.length > 0) {
    await sendBatch();
  }

}

module.exports = {
  processFiles
};