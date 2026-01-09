export interface WebSearchResult {
  title: string;
  url: string;
  snippet?: string;
  publishedDate?: string;
  score?: number;
}

export interface WebSearchResponse {
  provider: 'tavily' | 'serper' | 'none';
  query: string;
  retrievedAt: string;
  results: WebSearchResult[];
  error?: string;
}

async function tavilySearch(query: string, maxResults: number): Promise<WebSearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      provider: 'none',
      query,
      retrievedAt: new Date().toISOString(),
      results: [],
      error: 'TAVILY_API_KEY is not set',
    };
  }

  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
      search_depth: 'basic',
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return {
      provider: 'tavily',
      query,
      retrievedAt: new Date().toISOString(),
      results: [],
      error: `Tavily error: ${resp.status} ${text}`,
    };
  }

  const json: any = await resp.json();
  const results: WebSearchResult[] = (json.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
    publishedDate: r.published_date,
    score: r.score,
  }));

  return {
    provider: 'tavily',
    query,
    retrievedAt: new Date().toISOString(),
    results,
  };
}

async function serperSearch(query: string, maxResults: number): Promise<WebSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return {
      provider: 'none',
      query,
      retrievedAt: new Date().toISOString(),
      results: [],
      error: 'SERPER_API_KEY is not set',
    };
  }

  const resp = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ q: query, num: Math.min(maxResults, 10) }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return {
      provider: 'serper',
      query,
      retrievedAt: new Date().toISOString(),
      results: [],
      error: `Serper error: ${resp.status} ${text}`,
    };
  }

  const json: any = await resp.json();
  const organic = json.organic || [];
  const results: WebSearchResult[] = organic.slice(0, maxResults).map((r: any) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
    publishedDate: r.date,
  }));

  return {
    provider: 'serper',
    query,
    retrievedAt: new Date().toISOString(),
    results,
  };
}

/**
 * Web search wrapper with pluggable providers.
 * Priority: Tavily → Serper → none.
 */
export async function webSearch(query: string, maxResults = 5): Promise<WebSearchResponse> {
  if (process.env.TAVILY_API_KEY) {
    return tavilySearch(query, maxResults);
  }
  if (process.env.SERPER_API_KEY) {
    return serperSearch(query, maxResults);
  }
  return {
    provider: 'none',
    query,
    retrievedAt: new Date().toISOString(),
    results: [],
    error: 'No web search provider configured (set TAVILY_API_KEY or SERPER_API_KEY)',
  };
}

