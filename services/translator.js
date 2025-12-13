const translate = require('google-translate-api-x');

/**
 * Translate text to Kannada
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (default: 'kn' for Kannada)
 * @returns {Promise<string>} Translated text
 */
async function translateToKannada(text, targetLang = 'kn') {
  if (!text || typeof text !== 'string') return '';
  
  try {
    const result = await translate(text, { to: targetLang });
    return result.text;
  } catch (error) {
    console.error('Translation error:', error.message);
    return text; // Return original if translation fails
  }
}

/**
 * Translate multiple texts in batch
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language code
 * @returns {Promise<string[]>} Array of translated texts
 */
async function translateBatch(texts, targetLang = 'kn') {
  const promises = texts.map(text => translateToKannada(text, targetLang));
  return Promise.all(promises);
}

module.exports = {
  translateToKannada,
  translateBatch
};
