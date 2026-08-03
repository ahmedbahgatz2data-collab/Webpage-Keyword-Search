export interface SearchOptions {
  matchCase: boolean;
  exactPhrase: boolean;
  useRegex: boolean;
  contextLength: number; // characters before and after match
  stealthMode?: boolean; // Anti-bot / modern Chrome browser headers bypass mode
}

export interface Snippet {
  id: string;
  keyword: string;
  text: string; // context snippet text
  matchIndexInSnippet: number; // position within snippet
  matchLength: number;
  location?: 'visible' | 'raw_code'; // 'visible' = Visible Page Text, 'raw_code' = Raw Code / SSR Data
}

export interface KeywordMatch {
  keyword: string;
  count: number;
  snippets: Snippet[];
  foundIn?: 'visible' | 'raw_code' | 'both'; // 'visible' = Visible Page Text, 'raw_code' = Raw Code / SSR Data, 'both' = Found in both
}

export interface PageResult {
  url: string;
  title: string;
  metaDescription?: string;
  status: 'success' | 'error' | 'fetching';
  errorMessage?: string;
  httpStatus?: number;
  wordCount: number;
  totalMatches: number;
  targetKeywords: string[]; // Keywords specified for this URL
  foundKeywords: string[]; // Keywords present with count > 0
  notFoundKeywords: string[]; // Keywords searched but NOT found
  keywordMatches: Record<string, KeywordMatch>;
  textContent?: string;
  fetchTimeMs: number;
}

export interface UrlKeywordTarget {
  id: string;
  url: string;
  keywords: string[];
}

export interface SearchRequest {
  targets?: { url: string; keywords: string[] }[];
  urls?: string[];
  keywords?: string[];
  options: SearchOptions;
}

export interface SearchResponse {
  results: PageResult[];
  searchTimeMs: number;
  timestamp: string;
}

export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  targets?: { url: string; keywords: string[] }[];
  urls: string[];
  keywords: string[];
  totalMatches: number;
  pagesCount: number;
}

export interface PresetSample {
  id: string;
  name: string;
  description: string;
  targets?: { url: string; keywords: string[] }[];
  urls: string[];
  keywords: string[];
}
