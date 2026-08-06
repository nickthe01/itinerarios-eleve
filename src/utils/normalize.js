const DIACRITICS_RANGE_START = 0x0300;
const DIACRITICS_RANGE_END = 0x036f;
const diacriticsPattern = new RegExp(
  '[\\u' + DIACRITICS_RANGE_START.toString(16).padStart(4, '0') +
  '-\\u' + DIACRITICS_RANGE_END.toString(16).padStart(4, '0') + ']',
  'g'
);

function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(diacriticsPattern, '')
    .replace(/\s+/g, ' ');
}

module.exports = { normalize };
