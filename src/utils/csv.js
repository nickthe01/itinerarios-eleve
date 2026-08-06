function csvField(value) {
  const str = String(value == null ? '' : value);
  if (/[;"\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function buildCsv(headers, rows) {
  const lines = [headers.map((h) => h.label).join(';')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvField(row[h.key])).join(';'));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

module.exports = { buildCsv };
