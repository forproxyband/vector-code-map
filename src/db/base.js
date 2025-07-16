class VectorDB {
  async connect() {
    throw new Error('Method connect() must be implemented');
  }
  
  async addDocuments(documents, metadata, ids) {
    throw new Error('Method addDocuments() must be implemented');
  }
  
  async deleteDocuments(ids) {
    throw new Error('Method deleteDocuments() must be implemented');
  }
}

module.exports = VectorDB;