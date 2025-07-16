const ChromaDBAdapter = require('./chromadb');

async function getDbAdapter(type, config) {
  switch (type) {
    case 'chromadb':
      const adapter = new ChromaDBAdapter(config);
      await adapter.connect();
      return adapter;
    default:
      throw new Error(`Unsupported database type: ${type}`);
  }
}

module.exports = {
  getDbAdapter
};