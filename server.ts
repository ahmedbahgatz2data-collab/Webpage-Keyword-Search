import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to normalize URL
function normalizeUrl(urlStr: string): string {
  let trimmed = urlStr.trim();
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

// Helper to clean noise and decode common HTML entities
function cleanNoise(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width characters
    .replace(/\\"/g, '"')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface StructuralBlock {
  text: string;
  domPath: string;
  contextType: 'sentence' | 'paragraph' | 'table_row' | 'key_value' | 'list_item' | 'heading' | 'raw_code' | 'general';
}

// Extract Sentence and Paragraph Boundary Snippet safely
function extractSentenceBoundarySnippet(
  fullText: string,
  matchIndex: number,
  matchLength: number,
  contextLength: number = 90
): { text: string; matchIndexInSnippet: number } {
  if (!fullText) return { text: '', matchIndexInSnippet: 0 };

  const textLength = fullText.length;
  const sentencePunctuation = /[.!?؛。\n\r]/;

  // Search backwards for sentence boundary or whitespace
  const lookbackLimit = Math.max(0, matchIndex - Math.floor(contextLength * 1.5));
  let sentenceStart = -1;

  for (let i = matchIndex - 1; i >= lookbackLimit; i--) {
    if (sentencePunctuation.test(fullText[i])) {
      sentenceStart = i + 1;
      break;
    }
  }

  if (sentenceStart === -1) {
    const spaceIndex = fullText.lastIndexOf(' ', Math.max(0, matchIndex - contextLength));
    sentenceStart = spaceIndex !== -1 ? spaceIndex + 1 : Math.max(0, matchIndex - contextLength);
  }

  while (sentenceStart < matchIndex && /\s/.test(fullText[sentenceStart])) {
    sentenceStart++;
  }

  // Search forwards for sentence boundary or whitespace
  const lookforwardLimit = Math.min(textLength, matchIndex + matchLength + Math.floor(contextLength * 1.5));
  let sentenceEnd = -1;

  for (let i = matchIndex + matchLength; i < lookforwardLimit; i++) {
    if (sentencePunctuation.test(fullText[i])) {
      sentenceEnd = i + 1;
      break;
    }
  }

  if (sentenceEnd === -1) {
    const spaceIndex = fullText.indexOf(' ', Math.min(textLength, matchIndex + matchLength + contextLength));
    sentenceEnd = spaceIndex !== -1 ? spaceIndex : Math.min(textLength, matchIndex + matchLength + contextLength);
  }

  let snippetText = fullText.substring(sentenceStart, sentenceEnd).trim();
  snippetText = cleanNoise(snippetText);

  if (sentenceStart > 0 && !snippetText.startsWith('...')) {
    snippetText = '...' + snippetText;
  }
  if (sentenceEnd < textLength && !snippetText.endsWith('...')) {
    snippetText = snippetText + '...';
  }

  const cleanKeywordMatch = fullText.substring(matchIndex, matchIndex + matchLength).toLowerCase();
  const matchIndexInSnippet = snippetText.toLowerCase().indexOf(cleanKeywordMatch);

  return {
    text: snippetText,
    matchIndexInSnippet: matchIndexInSnippet >= 0 ? matchIndexInSnippet : 0
  };
}

// Helper to parse HTML, extract metadata, clean text, and pre-extract structural blocks in one fast pass
function parseHtmlContent(html: string) {
  try {
    if (!html || html.trim().length === 0) {
      return { title: 'Empty Page', metaDescription: '', visibleText: '', jsonText: '', textContent: '', wordCount: 0, blocks: [] };
    }

    const $ = cheerio.load(html);

    // 1. Extract Title & Meta
    const title = cleanNoise($('title').first().text()) || 'Untitled Page';
    const metaDescription = cleanNoise(
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      ''
    );

    // 2. Extract Hydration / SSR JSON Scripts
    const jsonScripts: string[] = [];
    $('script[type="application/json"], script[type="application/ld+json"], script[id*="__NEXT_DATA__"], script[id*="__INITIAL_STATE__"], script[id*="__NUXT__"]').each((_, el) => {
      const content = $(el).html() || '';
      if (content.trim()) {
        jsonScripts.push(content.trim());
      }
    });

    const extractedJsonText = jsonScripts
      .map(s => cleanNoise(s.replace(/[\\"{}\[\]]+/g, ' ')))
      .join(' ');

    // 3. Pre-extract High-Value Structural Blocks (Tables, Definition Lists, Headings) in ONE fast pass
    const blocks: StructuralBlock[] = [];

    // Extract Table Rows (Fast & Targeted)
    $('table').slice(0, 15).each((tableIdx, tableEl) => {
      const $tbl = $(tableEl);
      const caption = cleanNoise($tbl.find('caption').text());
      const tableTitle = caption ? `Table: "${caption}"` : `Table #${tableIdx + 1}`;

      let headers = $tbl.find('thead tr th, thead tr td').map((_, th) => cleanNoise($(th).text())).get().filter(h => h.length > 0);
      if (headers.length === 0) {
        headers = $tbl.find('tr:first-child th').map((_, th) => cleanNoise($(th).text())).get().filter(h => h.length > 0);
      }

      $tbl.find('tr').slice(0, 40).each((rowIdx, trEl) => {
        const cells = $(trEl).find('td, th').map((_, c) => cleanNoise($(c).text())).get().filter(c => c.length > 0);
        if (cells.length > 0) {
          let rowText = '';
          if (headers.length > 0 && headers.length === cells.length) {
            rowText = `[جدول / مواصفات] ` + headers.map((h, i) => `${h}: ${cells[i]}`).join(' | ');
          } else {
            rowText = `[صف جدول] ` + cells.join(' | ');
          }
          blocks.push({
            text: rowText,
            domPath: `${tableTitle} > Row #${rowIdx + 1}`,
            contextType: 'table_row'
          });
        }
      });
    });

    // Extract Definition Lists (dl, dt, dd)
    $('dl').slice(0, 20).each((_, dlEl) => {
      $(dlEl).find('dt').slice(0, 30).each((_, dtEl) => {
        const dtText = cleanNoise($(dtEl).text());
        const ddText = cleanNoise($(dtEl).next('dd').text());
        if (dtText && ddText) {
          blocks.push({
            text: `[مواصفة] ${dtText}: ${ddText}`,
            domPath: 'Definition List / Specifications',
            contextType: 'key_value'
          });
        }
      });
    });

    // Extract Headings
    $('h1, h2, h3, h4').slice(0, 30).each((_, hEl) => {
      const hText = cleanNoise($(hEl).text());
      const tag = (hEl as any).tagName?.toUpperCase() || 'H';
      if (hText && hText.length > 2 && hText.length < 150) {
        blocks.push({
          text: hText,
          domPath: `Heading (${tag})`,
          contextType: 'heading'
        });
      }
    });

    // 4. Remove scripts/styles & clean visible text
    $('script, style, noscript, svg, canvas, template, iframe, object, embed').remove();
    const visibleText = cleanNoise($('body').text() || $.root().text());
    const combinedText = (visibleText + ' ' + extractedJsonText).trim();
    const wordCount = combinedText.split(/\s+/).filter(w => w.length > 0).length;

    return {
      title,
      metaDescription,
      visibleText,
      jsonText: extractedJsonText,
      textContent: combinedText,
      wordCount,
      blocks
    };
  } catch (e: any) {
    console.error('Error in parseHtmlContent:', e.message);
    const cleaned = cleanNoise(html);
    return {
      title: 'Untitled Page',
      metaDescription: '',
      visibleText: cleaned,
      jsonText: '',
      textContent: cleaned,
      wordCount: cleaned.split(/\s+/).filter(w => w.length > 0).length,
      blocks: []
    };
  }
}

// Function to find keyword occurrences & context snippets safely & instantaneously
function searchKeywordsInText(
  visibleText: string,
  keywords: string[],
  options: {
    matchCase: boolean;
    exactPhrase: boolean;
    useRegex: boolean;
    contextLength: number;
    smartContext?: boolean;
  },
  jsonText: string = '',
  blocks: StructuralBlock[] = []
) {
  const keywordMatches: Record<string, any> = {};
  let totalMatches = 0;
  const maxSnippets = 30;

  keywords.forEach(rawKeyword => {
    const keyword = rawKeyword.trim();
    if (!keyword) return;

    const snippets: any[] = [];
    let visibleCount = 0;
    let rawCodeCount = 0;

    const flags = options.matchCase ? 'g' : 'gi';
    let pattern: RegExp;

    try {
      if (options.useRegex) {
        pattern = new RegExp(keyword, flags);
      } else if (options.exactPhrase) {
        pattern = new RegExp(escapeRegExp(keyword), flags);
      } else {
        pattern = new RegExp(escapeRegExp(keyword), flags);
      }
    } catch {
      pattern = new RegExp(escapeRegExp(keyword), flags);
    }

    // 1. Check structural blocks first (Tables, Key-Values, Headings)
    if (options.smartContext !== false && blocks && blocks.length > 0) {
      for (const block of blocks) {
        if (snippets.length >= maxSnippets) break;
        const blockPattern = new RegExp(pattern.source, pattern.flags);
        const match = blockPattern.exec(block.text);
        if (match) {
          const matchIdx = block.text.toLowerCase().indexOf(keyword.toLowerCase());
          snippets.push({
            id: `snip-${keyword}-${snippets.length}-block`,
            keyword,
            text: block.text,
            matchIndexInSnippet: matchIdx >= 0 ? matchIdx : 0,
            matchLength: match[0].length,
            location: 'visible',
            domPath: block.domPath,
            contextType: block.contextType
          });
        }
      }
    }

    // 2. Search visible text
    if (visibleText && visibleText.length > 0) {
      try {
        const textPattern = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;
        let lastIndex = -1;

        while ((match = textPattern.exec(visibleText)) !== null) {
          visibleCount++;

          if (snippets.length < maxSnippets) {
            const matchIndex = match.index;
            const matchLength = match[0].length;

            const snipRes = extractSentenceBoundarySnippet(
              visibleText,
              matchIndex,
              matchLength,
              options.contextLength || 90
            );

            // Avoid adding identical duplicate snippet text
            if (!snippets.some(s => s.text === snipRes.text)) {
              snippets.push({
                id: `snip-${keyword}-${snippets.length}-${matchIndex}`,
                keyword,
                text: snipRes.text,
                matchIndexInSnippet: snipRes.matchIndexInSnippet,
                matchLength,
                location: 'visible',
                domPath: 'Main Content > Paragraph',
                contextType: 'sentence'
              });
            }
          }

          // Prevent zero-length regex infinite loops
          if (textPattern.lastIndex === lastIndex || match[0].length === 0) {
            textPattern.lastIndex++;
          }
          lastIndex = textPattern.lastIndex;
        }
      } catch (err: any) {
        console.error(`Error searching visibleText for "${keyword}":`, err.message);
      }
    }

    // 3. Search JSON Hydration scripts if present
    if (jsonText && jsonText.length > 0) {
      try {
        const jsonPattern = new RegExp(pattern.source, pattern.flags);
        let match: RegExpExecArray | null;
        let lastIndex = -1;

        while ((match = jsonPattern.exec(jsonText)) !== null) {
          rawCodeCount++;

          if (snippets.length < maxSnippets) {
            const matchIndex = match.index;
            const matchLength = match[0].length;
            const ctxLen = options.contextLength || 90;

            const start = Math.max(0, matchIndex - ctxLen);
            const end = Math.min(jsonText.length, matchIndex + matchLength + ctxLen);

            let snippetText = jsonText.substring(start, end).replace(/[\\"{}\[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
            if (start > 0) snippetText = '...' + snippetText;
            if (end < jsonText.length) snippetText = snippetText + '...';

            const matchIdx = snippetText.toLowerCase().indexOf(keyword.toLowerCase());

            snippets.push({
              id: `snip-${keyword}-${snippets.length}-${matchIndex}-json`,
              keyword,
              text: snippetText,
              matchIndexInSnippet: matchIdx >= 0 ? matchIdx : 0,
              matchLength,
              location: 'raw_code',
              domPath: 'SSR Hydration State > JSON Data',
              contextType: 'raw_code'
            });
          }

          if (jsonPattern.lastIndex === lastIndex || match[0].length === 0) {
            jsonPattern.lastIndex++;
          }
          lastIndex = jsonPattern.lastIndex;
        }
      } catch (err: any) {
        console.error(`Error searching jsonText for "${keyword}":`, err.message);
      }
    }

    const count = visibleCount + rawCodeCount;
    let foundIn: 'visible' | 'raw_code' | 'both' = 'visible';
    if (visibleCount > 0 && rawCodeCount > 0) {
      foundIn = 'both';
    } else if (rawCodeCount > 0) {
      foundIn = 'raw_code';
    }

    keywordMatches[keyword] = {
      keyword,
      count,
      snippets,
      foundIn
    };

    totalMatches += count;
  });

  return { keywordMatches, totalMatches };
}

// Fetch single webpage with timeout & Stealth Mode anti-bot bypass support
async function fetchWebpage(url: string, stealthMode: boolean = true) {
  const getHeadersProfile = (profileType: 'stealth_chrome' | 'googlebot' | 'safari' | 'standard') => {
    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {}

    if (profileType === 'googlebot') {
      return {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      };
    }

    if (profileType === 'safari') {
      return {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': hostname ? `https://${hostname}/` : 'https://www.google.com/'
      };
    }

    if (profileType === 'stealth_chrome') {
      return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/'
      };
    }

    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    };
  };

  const profilesToTry: Array<'stealth_chrome' | 'googlebot' | 'safari' | 'standard'> = stealthMode
    ? ['stealth_chrome', 'googlebot']
    : ['standard', 'stealth_chrome'];

  let lastStatus = 0;
  let lastStatusText = '';
  let lastError = '';

  for (let i = 0; i < profilesToTry.length; i++) {
    const profile = profilesToTry[i];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500); // 7.5 seconds timeout per attempt

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: getHeadersProfile(profile),
        redirect: 'follow'
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/') && !contentType.includes('html') && !contentType.includes('xml')) {
          return {
            ok: false,
            status: response.status,
            error: `URL returned non-HTML content type (${contentType})`
          };
        }

        const html = await response.text();
        return {
          ok: true,
          status: response.status,
          html
        };
      }

      lastStatus = response.status;
      lastStatusText = response.statusText;

      // If status is 403 or 401 or 429, continue to next stealth profile attempt
      if ([403, 401, 405, 429, 503].includes(response.status)) {
        lastError = `HTTP Error ${response.status}: ${response.statusText}`;
        continue;
      } else {
        // Hard failure like 404
        return {
          ok: false,
          status: response.status,
          statusText: response.statusText,
          error: `HTTP Error ${response.status}: ${response.statusText}`
        };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        lastError = 'Connection timed out after 7.5 seconds';
      } else {
        lastError = err.message || 'Failed to fetch webpage';
      }
    }
  }

  // If all stealth attempts failed
  let finalErrorMsg = lastError || `HTTP Error ${lastStatus}: ${lastStatusText}`;
  if (lastStatus === 403) {
    finalErrorMsg = `HTTP Error 403: Forbidden (Protected by Bot Detection WAF/Cloudflare. Stealth Mode attempted Chrome & Googlebot headers)`;
  }

  return {
    ok: false,
    status: lastStatus || 403,
    statusText: lastStatusText,
    error: finalErrorMsg
  };
}

// Health route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Primary Search API Endpoint
app.post('/api/fetch-and-search', async (req, res) => {
  const startTime = Date.now();
  const { targets, urls = [], keywords = [], options = {} } = req.body;

  let searchTargets: Array<{ url: string; keywords: string[]; rawHtml?: string }> = [];

  if (Array.isArray(targets) && targets.length > 0) {
    searchTargets = targets
      .map(t => ({
        url: t.rawHtml ? (t.url || 'local-file.html') : normalizeUrl(t.url || ''),
        keywords: Array.isArray(t.keywords) ? t.keywords.map((k: any) => String(k).trim()).filter((k: string) => k.length > 0) : [],
        rawHtml: t.rawHtml
      }))
      .filter(t => t.url.length > 0 && (t.rawHtml || t.url.startsWith('http://') || t.url.startsWith('https://')) && t.keywords.length > 0);
  } else if (Array.isArray(urls) && urls.length > 0 && Array.isArray(keywords) && keywords.length > 0) {
    const cleanKw = keywords.map((k: any) => String(k).trim()).filter((k: string) => k.length > 0);
    searchTargets = urls
      .map(u => normalizeUrl(u))
      .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')))
      .map(url => ({ url, keywords: cleanKw }));
  }

  if (searchTargets.length === 0) {
    return res.status(400).json({ error: 'Please provide valid webpage URLs or local HTML files and keywords to search.' });
  }

  const stealthMode = options.stealthMode !== false; // Default true for maximum anti-bot resilience

  const searchOpts = {
    matchCase: Boolean(options.matchCase),
    exactPhrase: Boolean(options.exactPhrase),
    useRegex: Boolean(options.useRegex),
    contextLength: typeof options.contextLength === 'number' ? options.contextLength : 80,
    smartContext: options.smartContext !== false,
    stealthMode
  };

  // Run fetches concurrently
  const pagePromises = searchTargets.map(async (target) => {
    const { url, keywords: targetKw, rawHtml } = target;
    const pageStartTime = Date.now();
    let fetchRes;

    if (rawHtml) {
      fetchRes = {
        ok: true,
        status: 200,
        html: rawHtml
      };
    } else {
      fetchRes = await fetchWebpage(url, stealthMode);
    }
    const fetchTimeMs = Date.now() - pageStartTime;

    if (!fetchRes.ok) {
      return {
        url,
        title: url,
        status: 'error' as const,
        errorMessage: fetchRes.error,
        httpStatus: fetchRes.status,
        wordCount: 0,
        totalMatches: 0,
        targetKeywords: targetKw,
        foundKeywords: [],
        notFoundKeywords: targetKw,
        keywordMatches: {},
        fetchTimeMs
      };
    }

    const { title, metaDescription, visibleText, jsonText, textContent, wordCount, blocks } = parseHtmlContent(fetchRes.html || '');
    const { keywordMatches, totalMatches } = searchKeywordsInText(visibleText, targetKw, searchOpts, jsonText, blocks);

    const foundKeywords = targetKw.filter(kw => (keywordMatches[kw]?.count || 0) > 0);
    const notFoundKeywords = targetKw.filter(kw => !keywordMatches[kw] || (keywordMatches[kw]?.count || 0) === 0);

    return {
      url,
      title: title || url,
      metaDescription,
      status: 'success' as const,
      httpStatus: fetchRes.status,
      wordCount,
      totalMatches,
      targetKeywords: targetKw,
      foundKeywords,
      notFoundKeywords,
      keywordMatches,
      textContent, // Return text content for full view
      fetchTimeMs
    };
  });

  const results = await Promise.all(pagePromises);
  const searchTimeMs = Date.now() - startTime;

  res.json({
    results,
    searchTimeMs,
    timestamp: new Date().toISOString()
  });
});

// Gemini AI Analysis Endpoint
app.post('/api/ai-analyze', async (req, res) => {
  try {
    const { url, title, textContent, keywords, userQuery } = req.body;

    if (!textContent || textContent.length < 10) {
      return res.status(400).json({ error: 'No text content available to analyze.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const truncatedText = textContent.slice(0, 15000); // Pass up to 15k characters
    const prompt = `You are a research analyst assistant. 
Analyze the following webpage content extracted from:
URL: ${url}
Title: ${title}

Keywords of Interest: ${keywords?.join(', ')}
${userQuery ? `User Question: "${userQuery}"` : ''}

Webpage Extract:
"""
${truncatedText}
"""

Provide a concise, helpful summary focusing on how the webpage relates to the specified keywords.
Format your response as a JSON object with two fields:
1. "summary": A 2-3 sentence overview of what this webpage discusses regarding the keywords.
2. "keyTakeaways": An array of 3 to 5 bullet point insights regarding the keywords or answers to the user question.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text?.trim() || '{}';
    let parsedData = { summary: '', keyTakeaways: [] };
    try {
      parsedData = JSON.parse(jsonText);
    } catch {
      parsedData = {
        summary: response.text || 'Analysis completed.',
        keyTakeaways: ['Review context snippets for detailed keyword matches.']
      };
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error('AI Analysis error:', err);
    res.status(500).json({ error: err.message || 'AI analysis failed.' });
  }
});

// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
