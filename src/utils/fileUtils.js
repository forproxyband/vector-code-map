const fs = require('fs').promises;
const path = require('path');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { getEmbedding } = require('./embeddings');

async function processFiles({ files, dbAdapter, repoPath, openaiModel }) {
  // Створюємо текстовий сплітер
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });

  for (const filePath of files) {
    console.log(`Processing ${filePath}`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Розбиваємо на чанки
      const chunks = await textSplitter.splitText(content);
      // Готуємо метадані
      const relPath = path.relative(repoPath, filePath);
      
      const documents = [];
      const metadatas = [];
      const ids = [];
      
      for (let i = 0; i < chunks.length; i++) {
        // Унікальний ID для кожного чанка
        const chunkId = `${relPath}_${i}`;

        documents.push(chunks[i]);
        metadatas.push({
          file_path: relPath,
          chunk_index: i,
          total_chunks: chunks.length
        });
        ids.push(chunkId);
      }
      
      // Додаємо до бази даних
      await dbAdapter.addDocuments(documents, metadatas, ids);
      
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error);
    }
  }
}

module.exports = {
  getEmbedding,
  processFiles
};