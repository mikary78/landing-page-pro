# Tavily MCP API 통합 가이드

## 작성일: 2026-01-11

## 개요

Tavily는 **MCP (Model Context Protocol) 서버**로도 제공됩니다. MCP를 통해 통합하면 더 구조화된 방식으로 웹 검색 기능을 사용할 수 있습니다.

---

## MCP vs REST API 비교

### 현재 방식 (REST API 직접 호출)
- ✅ 간단하고 직접적
- ✅ 추가 의존성 없음
- ✅ Azure Functions에서 바로 사용 가능
- ❌ 구조화된 프로토콜 없음

### MCP 방식
- ✅ 표준화된 프로토콜
- ✅ AI 모델과의 통합이 더 자연스러움
- ✅ 확장성과 유지보수성 향상
- ❌ MCP 서버 설정 필요
- ❌ 추가 의존성 (`@modelcontextprotocol/sdk` 등)

---

## Tavily MCP 서버 사용 방법

### 1. MCP 서버 설정

Tavily는 공식 MCP 서버를 제공합니다. 다음 중 하나의 방법으로 사용할 수 있습니다:

#### 방법 A: npm 패키지로 MCP 서버 실행
```bash
npm install -g @tavily/mcp-server
tavily-mcp-server --api-key YOUR_TAVILY_API_KEY
```

#### 방법 B: Docker로 실행
```bash
docker run -e TAVILY_API_KEY=your-api-key tavily/mcp-server
```

### 2. Azure Functions에서 MCP 클라이언트로 연결

```typescript
// azure-functions/src/lib/web-search-mcp.ts (새 파일)
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

let mcpClient: Client | null = null;

async function getTavilyMCPClient(): Promise<Client | null> {
  if (mcpClient) return mcpClient;
  
  try {
    // MCP 서버 프로세스 실행
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@tavily/mcp-server'],
      env: {
        TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
      },
    });
    
    mcpClient = new Client({
      name: 'tavily-client',
      version: '1.0.0',
    }, {
      capabilities: {},
    });
    
    await mcpClient.connect(transport);
    return mcpClient;
  } catch (error) {
    console.error('[Tavily MCP] 연결 실패:', error);
    return null;
  }
}

export async function webSearchViaMCP(query: string, maxResults = 5): Promise<WebSearchResponse> {
  const client = await getTavilyMCPClient();
  if (!client) {
    return {
      provider: 'none',
      query,
      retrievedAt: new Date().toISOString(),
      results: [],
      error: 'MCP client 연결 실패',
    };
  }
  
  try {
    // MCP tools 호출
    const result = await client.callTool({
      name: 'tavily_search',
      arguments: {
        query,
        max_results: maxResults,
      },
    });
    
    // 결과 파싱
    const results: WebSearchResult[] = (result.content || []).map((item: any) => ({
      title: item.title || '',
      url: item.url || '',
      snippet: item.content || '',
      publishedDate: item.published_date,
      score: item.score,
    }));
    
    return {
      provider: 'tavily',
      query,
      retrievedAt: new Date().toISOString(),
      results,
    };
  } catch (error) {
    console.error('[Tavily MCP] 검색 실패:', error);
    return {
      provider: 'tavily',
      query,
      retrievedAt: new Date().toISOString(),
      results: [],
      error: `MCP 검색 실패: ${error}`,
    };
  }
}
```

---

## 현재 구현 방식 (REST API) vs MCP 방식

### 현재 방식 (권장) ✅
```typescript
// azure-functions/src/lib/web-search.ts
export async function webSearch(query: string, maxResults = 5): Promise<WebSearchResponse> {
  if (process.env.TAVILY_API_KEY) {
    return tavilySearch(query, maxResults); // 직접 REST API 호출
  }
  // ...
}
```

**장점**:
- 간단하고 직접적
- 추가 의존성 없음
- Azure Functions에서 바로 사용 가능
- 성능 오버헤드 없음

### MCP 방식 (선택사항)
```typescript
// MCP 서버를 통한 호출
const result = await webSearchViaMCP(query, maxResults);
```

**장점**:
- 표준화된 프로토콜
- 다른 MCP 도구와 통합 용이
- AI 모델과의 자연스러운 통합

**단점**:
- MCP 서버 프로세스 실행 필요
- 추가 의존성 설치 필요
- Azure Functions 환경에서 프로세스 관리 복잡

---

## 권장 사항

### 현재 프로젝트에서는 REST API 방식 유지 권장

**이유**:
1. **간단함**: 직접 HTTP 호출로 충분히 효율적
2. **성능**: 프로세스 오버헤드 없음
3. **안정성**: Azure Functions에서 프로세스 관리 불필요
4. **유지보수**: 코드가 단순하고 이해하기 쉬움

### MCP를 고려해야 하는 경우

다음 상황에서는 MCP 통합을 고려할 수 있습니다:
- 여러 MCP 도구를 통합해야 할 때
- AI 모델이 직접 MCP 도구를 호출해야 할 때
- 표준화된 프로토콜이 중요한 엔터프라이즈 환경

---

## MCP 통합 구현 (선택사항)

MCP를 사용하고 싶다면 다음 단계를 따르세요:

### 1. MCP SDK 설치
```bash
cd azure-functions
npm install @modelcontextprotocol/sdk
```

### 2. MCP 서버 실행 방법

#### 옵션 A: 별도 서비스로 실행
- Azure Container Instances에 MCP 서버 배포
- Azure Functions에서 HTTP로 MCP 서버 호출

#### 옵션 B: Azure Functions 내에서 실행 (비권장)
- 프로세스 관리 복잡
- Cold start 시간 증가
- 리소스 사용량 증가

### 3. 하이브리드 방식 (권장)
```typescript
// REST API를 기본으로, 필요시 MCP 사용
export async function webSearch(query: string, maxResults = 5): Promise<WebSearchResponse> {
  // 기본: REST API 사용
  if (process.env.TAVILY_API_KEY) {
    return tavilySearch(query, maxResults);
  }
  
  // MCP 사용 옵션 (환경 변수로 제어)
  if (process.env.USE_TAVILY_MCP === 'true') {
    return webSearchViaMCP(query, maxResults);
  }
  
  // ...
}
```

---

## 결론

**현재는 REST API 방식 유지 권장** ✅

- Tavily REST API가 충분히 효율적이고 간단함
- MCP는 추가 복잡성만 증가시킴
- 필요시 나중에 MCP로 전환 가능하도록 코드 구조화됨

**MCP를 사용하려면**:
1. MCP 서버를 별도 서비스로 배포
2. Azure Functions에서 HTTP로 호출
3. 또는 환경 변수로 MCP/REST 선택 가능하도록 구현

---

## 참고 자료
- [Tavily 공식 문서](https://docs.tavily.com)
- [MCP 프로토콜 스펙](https://modelcontextprotocol.io)
- [Tavily MCP 서버](https://github.com/tavily/mcp-server) (있는 경우)
