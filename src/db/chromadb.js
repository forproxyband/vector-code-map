const { ChromaClient } = require('chromadb');
const VectorDB = require('./base');
const https = require('https');
const { OpenAI } = require('openai');

class CustomOpenAIEmbeddingFunction {
  constructor(config) {
    this.openai = new OpenAI({
      apiKey: config.openai_api_key || process.env.OPENAI_API_KEY
    });
    this.model = config.model_name || 'text-embedding-3-small';
  }

  async generate(texts) {
    if (!Array.isArray(texts)) {
      texts = [texts];
    }

    // Перевірка та конвертація всіх елементів у рядки
    const validTexts = texts.map(text => String(text || ""));
    if (validTexts.length === 0) {
      console.error(`no input to send to OpenAI`);

      return []
    } else {

      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: validTexts,
          encoding_format: 'float'
        });

        return response.data.map(item => item.embedding);
      } catch (error) {
        console.error('Error generating embeddings:', error);
        throw error;
      }
    }
  }
}


class ChromaDBAdapter extends VectorDB {
  constructor(config) {
    super();
    this.host = config.host;
    this.port = config.port;
    this.collectionName = config.collection;
    this.auth = config.auth || { enabled: false };
    this.client = null;
    this.collection = null;
    this.embeddingFunction = new CustomOpenAIEmbeddingFunction({
      openai_api_key: process.env.OPENAI_API_KEY,
      model_name: 'text-embedding-3-small'
    });
  }

  async connect() {

    // Створюємо URL для підключення
    const protocol = this.auth.ssl ? 'https' : 'http';
    const url = `${protocol}://${this.host}:${this.port}`;

    // Налаштування для клієнта
    const clientConfig = { path: url };

    // Додаємо параметри авторизації, якщо вони включені
    if (this.auth.enabled) {
      console.log(`Connecting to ChromaDB with ${this.auth.type} authentication`);

      // Налаштування для SSL/TLS, якщо потрібно
      if (this.auth.ssl) {
        clientConfig.fetchOptions = {
          agent: new https.Agent({
            rejectUnauthorized: false // Налаштуйте відповідно до ваших вимог безпеки
          })
        };
      }

      // Налаштування заголовків для різних типів авторизації
      clientConfig.fetchOptions = clientConfig.fetchOptions || {};
      clientConfig.fetchOptions.headers = {};

      if (this.auth.type === 'basic') {
        // Базова авторизація (username:password)
        const credentials = Buffer.from(this.auth.credentials).toString('base64');
        clientConfig.fetchOptions.headers['Authorization'] = `Basic ${credentials}`;
      } else if (this.auth.type === 'token') {
        // Авторизація через токен
        clientConfig.fetchOptions.headers['Authorization'] = `Bearer ${this.auth.credentials}`;
      } else if (this.auth.type === 'api_key') {
        // Авторизація через API ключ
        clientConfig.fetchOptions.headers['X-Api-Key'] = this.auth.credentials;
      }
    }

    // Створюємо клієнт ChromaDB з налаштуваннями
    this.client = new ChromaClient(clientConfig);

    // Отримуємо або створюємо колекцію
    try {
      // Спочатку перевіряємо, чи існує колекція
      const collections = await this.client.listCollections();

      const collectionExists = collections.some(c => c === this.collectionName);

      if (collectionExists) {
        this.collection = await this.client.getCollection({
          name: this.collectionName,
          embeddingFunction: this.embeddingFunction
        });
        console.log(`Connected to existing collection: ${this.collectionName}`);
      } else {
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          embeddingFunction: this.embeddingFunction
        });
        console.log(`Created new collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error(`Error connecting to ChromaDB: ${error.message}`);
      throw error;
    }

    return this;
  }

  async addDocuments(documents, metadatas, ids) {
    await this.collection.add({
      documents,
      metadatas,
      ids
    });
  }

  async deleteDocuments(ids) {
    await this.collection.delete({
      ids
    });
    console.log(`Deleted ${ids.length} documents from collection`);
  }
}

module.exports = ChromaDBAdapter;