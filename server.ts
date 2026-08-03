import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

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

// Helper to strip HTML tags and extract title/meta/body text
function parseHtmlContent(html: string) {
  // Extract Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/[\r\n\t]+/g, ' ').trim() : 'Untitled Page';

  // Extract Meta Description
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["'][^>]*>/i) ||
                    html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["'][^>]*>/i);
  const metaDescription = metaMatch ? metaMatch[1].trim() : '';

  // Extract JSON / Hydration data script contents (Next.js, Nuxt, React, LD+JSON, state objects)
  const jsonScriptMatches = html.match(/<script[^>]*type=["'](?:application\/json|application\/ld\+json)["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const nextDataMatches = html.match(/<script[^>]*id=["'](?:__NEXT_DATA__|__INITIAL_STATE__|__NUXT__)["'][^>]*>([\s\S]*?)<\/script>/gi) || [];

  const extractedJsonText = [...jsonScriptMatches, ...nextDataMatches]
    .map(s => s.replace(/<[^>]+>/g, ' ').replace(/[\\"{}\[\]]+/g, ' '))
    .join(' ');

  // Clean main Body HTML
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  // Combine visible body text with extracted hydration JSON data
  const combinedText = (cleaned + ' ' + extractedJsonText).trim();

  const words = combinedText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  return { title, metaDescription, visibleText: cleaned, jsonText: extractedJsonText, textContent: combinedText, wordCount };
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Function to find keyword occurrences & context snippets with source location (Visible Page vs Raw Code)
function searchKeywordsInText(
  visibleText: string,
  keywords: string[],
  options: {
    matchCase: boolean;
    exactPhrase: boolean;
    useRegex: boolean;
    contextLength: number;
  },
  jsonText: string = '',
  rawHtml?: string
) {
  const keywordMatches: Record<string, any> = {};
  let totalMatches = 0;

  keywords.forEach(rawKeyword => {
    const keyword = rawKeyword.trim();
    if (!keyword) return;

    const snippets: any[] = [];
    let visibleCount = 0;
    let rawCodeCount = 0;

    const runPatternSearch = (targetText: string, loc: 'visible' | 'raw_code') => {
      try {
        let pattern: RegExp;
        const flags = options.matchCase ? 'g' : 'gi';

        if (options.useRegex) {
          pattern = new RegExp(keyword, flags);
        } else if (options.exactPhrase) {
          pattern = new RegExp(escapeRegExp(keyword), flags);
        } else {
          const escaped = escapeRegExp(keyword);
          pattern = new RegExp(escaped, flags);
        }

        let match: RegExpExecArray | null;
        const maxSnippets = 30;

        while ((match = pattern.exec(targetText)) !== null) {
          if (loc === 'visible') visibleCount++;
          else rawCodeCount++;

          if (snippets.length < maxSnippets) {
            const matchIndex = match.index;
            const matchLength = match[0].length;
            const ctxLen = options.contextLength || 80;

            const start = Math.max(0, matchIndex - ctxLen);
            const end = Math.min(targetText.length, matchIndex + matchLength + ctxLen);

            let snippetText = targetText.substring(start, end);

            // Clean up snippet if from raw HTML code
            if (loc === 'raw_code') {
              snippetText = snippetText
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            }

            if (start > 0) snippetText = '...' + snippetText;
            if (end < targetText.length) snippetText = snippetText + '...';

            const matchIndexInSnippet = snippetText.toLowerCase().indexOf(keyword.toLowerCase());

            snippets.push({
              id: `snip-${keyword}-${snippets.length}-${matchIndex}`,
              keyword,
              text: snippetText,
              matchIndexInSnippet: matchIndexInSnippet >= 0 ? matchIndexInSnippet : 0,
              matchLength,
              location: loc
            });
          }

          if (match.index === pattern.lastIndex) {
            pattern.lastIndex++;
          }
        }
      } catch (err: any) {
        console.error(`Error matching keyword "${keyword}":`, err.message);
      }
    };

    // 1. Search visible page text
    runPatternSearch(visibleText, 'visible');

    // 2. Search SSR / JSON hydration script text
    if (jsonText.trim().length > 0) {
      runPatternSearch(jsonText, 'raw_code');
    }

    // 3. Fallback search on raw HTML if no matches found yet
    if (visibleCount === 0 && rawCodeCount === 0 && rawHtml) {
      runPatternSearch(rawHtml, 'raw_code');
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
    ? ['stealth_chrome', 'googlebot', 'safari']
    : ['standard', 'stealth_chrome'];

  let lastStatus = 0;
  let lastStatusText = '';
  let lastError = '';

  for (let i = 0; i < profilesToTry.length; i++) {
    const profile = profilesToTry[i];
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

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
        lastError = 'Connection timed out after 12 seconds';
      } else {
        lastError = err.message || 'Failed to fetch webpage';
      }
    }
  }

  // If all stealth attempts failed
  let finalErrorMsg = lastError || `HTTP Error ${lastStatus}: ${lastStatusText}`;
  if (lastStatus === 403) {
    finalErrorMsg = `HTTP Error 403: Forbidden (Protected by Bot Detection WAF/Cloudflare/Siemens Portal. Stealth Mode attempted Chrome & Googlebot headers)`;
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

  let searchTargets: Array<{ url: string; keywords: string[] }> = [];

  if (Array.isArray(targets) && targets.length > 0) {
    searchTargets = targets
      .map(t => ({
        url: normalizeUrl(t.url || ''),
        keywords: Array.isArray(t.keywords) ? t.keywords.map((k: any) => String(k).trim()).filter((k: string) => k.length > 0) : []
      }))
      .filter(t => t.url.length > 0 && (t.url.startsWith('http://') || t.url.startsWith('https://')) && t.keywords.length > 0);
  } else if (Array.isArray(urls) && urls.length > 0 && Array.isArray(keywords) && keywords.length > 0) {
    const cleanKw = keywords.map((k: any) => String(k).trim()).filter((k: string) => k.length > 0);
    searchTargets = urls
      .map(u => normalizeUrl(u))
      .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')))
      .map(url => ({ url, keywords: cleanKw }));
  }

  if (searchTargets.length === 0) {
    return res.status(400).json({ error: 'Please provide valid webpage URLs and keywords to search.' });
  }

  const stealthMode = options.stealthMode !== false; // Default true for maximum anti-bot resilience

  const searchOpts = {
    matchCase: Boolean(options.matchCase),
    exactPhrase: Boolean(options.exactPhrase),
    useRegex: Boolean(options.useRegex),
    contextLength: typeof options.contextLength === 'number' ? options.contextLength : 80,
    stealthMode
  };

  // Run fetches concurrently
  const pagePromises = searchTargets.map(async (target) => {
    const { url, keywords: targetKw } = target;
    const pageStartTime = Date.now();
    const fetchRes = await fetchWebpage(url, stealthMode);
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

    const { title, metaDescription, visibleText, jsonText, textContent, wordCount } = parseHtmlContent(fetchRes.html || '');
    const { keywordMatches, totalMatches } = searchKeywordsInText(visibleText, targetKw, searchOpts, jsonText, fetchRes.html || '');

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
