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

  // Clean HTML
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

  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  return { title, metaDescription, textContent: cleaned, wordCount };
}

// Helper to escape regex special characters
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Function to find keyword occurrences & context snippets
function searchKeywordsInText(
  text: string,
  keywords: string[],
  options: {
    matchCase: boolean;
    exactPhrase: boolean;
    useRegex: boolean;
    contextLength: number;
  }
) {
  const keywordMatches: Record<string, any> = {};
  let totalMatches = 0;

  keywords.forEach(rawKeyword => {
    const keyword = rawKeyword.trim();
    if (!keyword) return;

    const snippets: any[] = [];
    let count = 0;

    try {
      let pattern: RegExp;
      const flags = options.matchCase ? 'g' : 'gi';

      if (options.useRegex) {
        pattern = new RegExp(keyword, flags);
      } else if (options.exactPhrase) {
        pattern = new RegExp(escapeRegExp(keyword), flags);
      } else {
        // Whole word or boundary matching if standard spaces
        const escaped = escapeRegExp(keyword);
        pattern = new RegExp(escaped, flags);
      }

      let match: RegExpExecArray | null;
      const maxSnippets = 30; // Limit max snippets per keyword to avoid payload bloat

      while ((match = pattern.exec(text)) !== null) {
        count++;
        if (snippets.length < maxSnippets) {
          const matchIndex = match.index;
          const matchLength = match[0].length;
          const ctxLen = options.contextLength || 80;

          const start = Math.max(0, matchIndex - ctxLen);
          const end = Math.min(text.length, matchIndex + matchLength + ctxLen);

          let snippetText = text.substring(start, end);
          if (start > 0) snippetText = '...' + snippetText;
          if (end < text.length) snippetText = snippetText + '...';

          const matchIndexInSnippet = matchIndex - start + (start > 0 ? 3 : 0);

          snippets.push({
            id: `snip-${keyword}-${snippets.length}-${matchIndex}`,
            keyword,
            text: snippetText,
            matchIndexInSnippet,
            matchLength
          });
        }

        // Avoid infinite loop on zero-width regex match
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }
      }
    } catch (err: any) {
      console.error(`Error matching keyword "${keyword}":`, err.message);
    }

    keywordMatches[keyword] = {
      keyword,
      count,
      snippets
    };

    totalMatches += count;
  });

  return { keywordMatches, totalMatches };
}

// Fetch single webpage with timeout
async function fetchWebpage(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        statusText: response.statusText,
        error: `HTTP Error ${response.status}: ${response.statusText}`
      };
    }

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
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { ok: false, error: 'Connection timed out after 12 seconds' };
    }
    return { ok: false, error: err.message || 'Failed to fetch webpage' };
  }
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

  const searchOpts = {
    matchCase: Boolean(options.matchCase),
    exactPhrase: Boolean(options.exactPhrase),
    useRegex: Boolean(options.useRegex),
    contextLength: typeof options.contextLength === 'number' ? options.contextLength : 80
  };

  // Run fetches concurrently
  const pagePromises = searchTargets.map(async (target) => {
    const { url, keywords: targetKw } = target;
    const pageStartTime = Date.now();
    const fetchRes = await fetchWebpage(url);
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

    const { title, metaDescription, textContent, wordCount } = parseHtmlContent(fetchRes.html || '');
    const { keywordMatches, totalMatches } = searchKeywordsInText(textContent, targetKw, searchOpts);

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
