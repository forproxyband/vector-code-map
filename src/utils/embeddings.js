const { OpenAI } = require('openai');

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
}

async function getEmbedding(text, model = 'text-embedding-3-small') {
  const openai = getOpenAIClient();

  // Перевірка на null або undefined
  if (!text) {
    console.warn('Empty text provided for embedding');
    return new Array(1536).fill(0); // Повертаємо нульовий вектор
  }

  let input;

  if (Array.isArray(text)) {
    // Якщо text вже масив, перетворюємо кожен елемент на рядок
    input = text.map(item => String(item));
  } else {
    // Якщо одиночний елемент, перетворюємо на рядок
    input = String(text);
  }


  try {
    const response = await openai.embeddings.create({
      model,
      encoding_format: 'float',
      input
    });

    if (Array.isArray(input)) {
      return response.data.map(item => item.embedding);
    } else {
      return response.data[0].embedding;
    }
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    console.error('Request details:', { model, inputType: typeof input,
      isArray: Array.isArray(input),
      sample: Array.isArray(input) ? input.slice(0, 2) : input.substring(0, 50) });
    throw error;
  }
}

module.exports = {
  getEmbedding
};