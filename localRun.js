require('dotenv').config();
const { getDbAdapter } = require('./src/db');
const { scanRepository } = require('./src/scanners');

async function localRun() {
  try {
    // Отримуємо налаштування з .env
    const mode = process.env.MODE || 'full';
    const dbType = process.env.DB_TYPE || 'chromadb';

    // OpenAI налаштування
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) throw new Error('OPENAI_API_KEY not set');
    
    const openaiModel = process.env.OPENAI_MODEL || 'text-embedding-3-small';
    
    // Налаштування для фільтрації файлів
    const fileExtensions = (process.env.FILE_EXTENSIONS || '.js,.ts,.jsx,.tsx,.html,.css,.md,.txt').split(',');
    const excludePatterns = (process.env.EXCLUDE_PATTERNS || 'node_modules/**,dist/**,.git/**').split(',');
    
    // Підключаємося до векторної бази даних
    let dbAdapter;
    
    if (dbType === 'chromadb') {
      const chromaHost = process.env.CHROMA_HOST;
      if (!chromaHost) throw new Error('CHROMA_HOST not set');
      
      const chromaPort = process.env.CHROMA_PORT || '8000';
      const chromaCollection = process.env.CHROMA_COLLECTION;
      if (!chromaCollection) throw new Error('CHROMA_COLLECTION not set');
      
      // Налаштування авторизації для ChromaDB
      const authEnabled = process.env.CHROMA_AUTH_ENABLED === 'true';
      const authConfig = {};
      
      if (authEnabled) {
        authConfig.enabled = true;
        authConfig.type = process.env.CHROMA_AUTH_TYPE || 'basic';
        authConfig.credentials = process.env.CHROMA_AUTH_CREDENTIALS;
        authConfig.ssl = process.env.CHROMA_SSL_ENABLED === 'true';
      }
      
      dbAdapter = await getDbAdapter('chromadb', {
        host: chromaHost,
        port: chromaPort,
        collection: chromaCollection,
        auth: authConfig
      });
    } else {
      throw new Error(`Unsupported database type: ${dbType}`);
    }
    
    // Запускаємо сканування репозиторію
    const repoPath = '.';
    
    console.log('We start scanning the repository...');
    await scanRepository({
      repoPath,
      dbAdapter,
      mode,
      fileExtensions,
      excludePatterns,
      openaiModel
    });
    
    console.log(`Vector code map generation completed in mode: ${mode}`);
  } catch (error) {
    console.error(`Помилка:  ${error.message}`);
    process.exit(1);
  }
}

localRun();
