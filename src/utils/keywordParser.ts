/**
 * Keyword Tokenizer and Parser
 * Intelligently extracts individual keywords while respecting:
 * 1. Quoted terms (e.g. "AVB1,5/2/8", 'item, with, comma', “smart quotes”)
 *    - Preserves internal commas, slashes, semicolons, and spaces.
 *    - Strips the outer enclosing quotes.
 * 2. European decimal numbers and technical codes (e.g. AVB1,5/2/8, ST 2,5, 3,5mm):
 *    - Commas between digits (e.g. 1,5 or ١،٥) are NOT treated as delimiters.
 * 3. Delimiters outside quotes:
 *    - Newlines (\r, \n)
 *    - Semicolons (;)
 *    - Pipes (|)
 *    - Tabs (\t)
 *    - Commas (,) and Arabic commas (،) (unless between digits)
 */
export function splitKeywords(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  const trimmed = raw.trim();
  const results: string[] = [];

  // 1. If the entire string is enclosed in matching quotes (e.g. "AVB1,5/2/8")
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
    (trimmed.startsWith('“') && trimmed.endsWith('”') && trimmed.length >= 2) ||
    (trimmed.startsWith('«') && trimmed.endsWith('»') && trimmed.length >= 2)
  ) {
    const unquoted = trimmed.slice(1, -1).trim();
    if (unquoted) return [unquoted];
  }

  // 2. Tokenize by scanning character by character
  let currentToken = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const prevChar = i > 0 ? trimmed[i - 1] : '';
    const nextChar = i < trimmed.length - 1 ? trimmed[i + 1] : '';

    // Check for quote boundary
    if ((char === '"' || char === "'" || char === '“' || char === '”' || char === '«' || char === '»') && prevChar !== '\\') {
      if (inQuotes) {
        if (
          char === quoteChar ||
          (quoteChar === '“' && char === '”') ||
          (quoteChar === '«' && char === '»')
        ) {
          inQuotes = false;
          quoteChar = '';
          continue;
        }
      } else {
        inQuotes = true;
        quoteChar = char;
        continue;
      }
    }

    if (inQuotes) {
      currentToken += char;
      continue;
    }

    // Delimiters outside quotes:
    // - Newline (\r, \n)
    // - Semicolon (;)
    // - Pipe (|)
    // - Tab (\t)
    if (char === '\n' || char === '\r' || char === ';' || char === '|' || char === '\t') {
      const clean = currentToken.trim();
      if (clean) results.push(clean);
      currentToken = '';
      continue;
    }

    // Comma (,) or Arabic comma (،)
    if (char === ',' || char === '،') {
      // If comma is between digits (e.g. 1,5 in AVB1,5/2/8), treat as part of number/code!
      const isDigitBefore = /\d/.test(prevChar);
      const isDigitAfter = /\d/.test(nextChar);

      if (isDigitBefore && isDigitAfter) {
        currentToken += char;
        continue;
      }

      // Delimiter
      const clean = currentToken.trim();
      if (clean) results.push(clean);
      currentToken = '';
      continue;
    }

    currentToken += char;
  }

  const finalToken = currentToken.trim();
  if (finalToken) {
    results.push(finalToken);
  }

  // Clean remaining outer quotes and filter empty
  return results
    .map(k => k.replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim())
    .filter(k => k.length > 0);
}

/**
 * Builds a regex pattern string that allows flexible whitespace between letters and digits (Space-Insensitive).
 * For example:
 * - "HLD110-500/16" matches "HLD110-500/16" and "HLD 110-500/16"
 * - "HLD 110-500/16" matches "HLD 110-500/16" and "HLD110-500/16"
 * - "neural network" matches "neural network", but NOT "neuralnetwork" (words stay separated)
 */
export function buildFlexibleKeywordPattern(keyword: string): string {
  let escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const letterChar = '[a-zA-Z\\u0600-\\u06FF]';
  const digitChar = '[0-9\\u0660-\\u0669]';

  // Letter followed by optional whitespace followed by digit -> allow optional whitespace
  escaped = escaped.replace(new RegExp(`(${letterChar})\\s*(${digitChar})`, 'g'), '$1\\s*$2');

  // Digit followed by optional whitespace followed by letter -> allow optional whitespace
  escaped = escaped.replace(new RegExp(`(${digitChar})\\s*(${letterChar})`, 'g'), '$1\\s*$2');

  // Remaining whitespace (between words or between numbers) matches one or more whitespace
  escaped = escaped.replace(/\s+/g, '\\s+');

  return escaped;
}
