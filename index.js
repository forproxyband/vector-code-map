const core = require('@actions/core');
const { getDbAdapter } = require('./src/db');
const { scanRepository } = require('./src/scanners');

async function run() {
  try {
    // Отримуємо налаштування з GitHub Actions
    const mode = core.getInput('mode') || 'full';
    const dbType = core.getInput('db_type') || 'chromadb';
    
    // OpenAI налаштування
    const openaiApiKey = core.getInput('openai_api_key', { required: true });
    const openaiModel = core.getInput('openai_model') || 'text-embedding-3-small';
    
    // Налаштування для фільтрації файлів
    const fileExtensions = (core.getInput('file_extensions') || '.js,.ts,.jsx,.tsx,.html,.css,.md,.txt').split(',');
    const excludePatterns = (core.getInput('exclude_patterns') || 'node_modules/**,dist/**,.git/**').split(',');
    
    // Підключаємося до векторної бази даних
    let dbAdapter;

    const { execSync } = require('child_process');
    try {
      execSync('git config --global --add safe.directory /github/workspace');
      console.log('Added /github/workspace as safe directory');
    } catch (error) {
      console.error('Failed to configure safe directory:', error.message);
    }


    if (dbType === 'chromadb') {
      const chromaHost = core.getInput('chroma_host', { required: true });
      const chromaPort = core.getInput('chroma_port') || '8000';
      const chromaCollection = core.getInput('chroma_collection', { required: true });
      
      // Налаштування авторизації для ChromaDB
      const authEnabled = core.getInput('chroma_auth_enabled') === 'true';
      const authConfig = {};
      
      if (authEnabled) {
        authConfig.enabled = true;
        authConfig.type = core.getInput('chroma_auth_type') || 'basic';
        authConfig.credentials = core.getInput('chroma_auth_credentials');
        authConfig.ssl = core.getInput('chroma_ssl_enabled') === 'true';
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
    
    // Встановлюємо OpenAI API ключ 1
    process.env.OPENAI_API_KEY = openaiApiKey;
    
    // Запускаємо сканування репозиторію
    const repoPath = process.env.GITHUB_WORKSPACE || '.';
    
    await scanRepository({
      repoPath,
      dbAdapter,
      mode,
      fileExtensions,
      excludePatterns,
      openaiModel
    });
    
    core.info(`Vector code map generation completed in ${mode} mode`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();