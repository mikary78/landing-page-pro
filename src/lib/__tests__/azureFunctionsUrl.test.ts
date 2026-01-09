import { describe, expect, it } from "vitest";
import { buildAzureFunctionsUrl } from "@/lib/azureFunctionsUrl";

describe("buildAzureFunctionsUrl", () => {
  it("removes the classic '...?'+endpoint 404 pitfall by using URL parsing", () => {
    const base = "https://func-landing-page-pro.azurewebsites.net/?";
    const url = buildAzureFunctionsUrl(base, "/api/generation/start");
    expect(url).toBe("https://func-landing-page-pro.azurewebsites.net/api/generation/start");
  });

  it("keeps base pathname (e.g. /api) when endpoint does not include it", () => {
    const base = "https://func-landing-page-pro.azurewebsites.net/api";
    const url = buildAzureFunctionsUrl(base, "/generation/start");
    expect(url).toBe("https://func-landing-page-pro.azurewebsites.net/api/generation/start");
  });

  it("does not duplicate base pathname when endpoint already includes it", () => {
    const base = "https://func-landing-page-pro.azurewebsites.net/api";
    const url = buildAzureFunctionsUrl(base, "/api/generation/start");
    expect(url).toBe("https://func-landing-page-pro.azurewebsites.net/api/generation/start");
  });

  it("preserves query params (e.g. function key code)", () => {
    const base = "https://example.azurewebsites.net/?code=ABC123";
    const url = buildAzureFunctionsUrl(base, "/api/hello");
    expect(url).toBe("https://example.azurewebsites.net/api/hello?code=ABC123");
  });

  it("works with localhost base", () => {
    const url = buildAzureFunctionsUrl("http://localhost:7071", "/api/hello");
    expect(url).toBe("http://localhost:7071/api/hello");
  });
});

