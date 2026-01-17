# 2026-01-17: Azure Functions runtime recovery

## Summary
- Identified runtime load failure via Application Insights traces.
- Root cause: missing runtime dependency `@azure/storage-queue` in the deploy package.
- Fix: added `@azure/storage-queue` to `azure-functions/package.dist.json`, rebuilt, and republished.

## Evidence
- Trace error: `Worker was unable to load entry point "index.js": Cannot find module '@azure/storage-queue'`.
- After redeploy, `/api/hello` returned `200 OK`.

## Changes
- `azure-functions/package.dist.json`: add `@azure/storage-queue` dependency.
- Rebuilt `azure-functions` and republished to `func-landing-page-pro`.

## Notes
- Kudu/SCM access returned 404, so logstream via SCM was not available.
- Functions list in Azure was visible, but runtime could not load without the missing dependency.
