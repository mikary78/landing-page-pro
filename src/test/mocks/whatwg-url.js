// whatwg-url 모듈 모킹
// 테스트 환경에서 Supabase 의존성 문제를 해결하기 위한 빈 모듈
module.exports = {
  URL: globalThis.URL || class URL {
    constructor(url, base) {
      this.href = url;
      this.origin = '';
      this.protocol = '';
      this.host = '';
      this.hostname = '';
      this.port = '';
      this.pathname = '';
      this.search = '';
      this.hash = '';
    }
  },
  URLSearchParams: globalThis.URLSearchParams || class URLSearchParams {
    constructor(init) {
      this.params = new Map();
    }
    get(name) {
      return this.params.get(name);
    }
    set(name, value) {
      this.params.set(name, value);
    }
    has(name) {
      return this.params.has(name);
    }
    delete(name) {
      this.params.delete(name);
    }
  },
};

