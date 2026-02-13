# Development Workflow

This document captures the recommended day-to-day development flow for this repo.

## Branching and environments
- Create a feature branch for each change.
- Use staging for verification, then merge to main for production.
- Keep production and staging Azure Functions apps distinct in configuration.

## Local development (frontend)
1) Install deps: `npm install`
2) Run checks: `npm run lint`, `npm run typecheck`
3) Build: `npm run build`

## Local development (azure-functions)
1) Install deps: `cd azure-functions && npm install`
2) Build: `npm run build`
3) Run locally: `func start`
4) Smoke test: `http://localhost:7071/api/hello`

## Dependency consistency
- Keep `azure-functions/package.json` and `azure-functions/package.dist.json` aligned for runtime dependencies.
- When adding a new runtime dependency, add it to both files.

## CI/CD and deployment
- Staging: deploy after feature branch validation.
- Production: deploy only from main after staging verification.
- Always run `DEPLOY_CHECKLIST.md` before production deploys.

## Post-deploy validation
- Confirm `/api/hello` responds.
- Verify key endpoints like `/api/getcourses` with GET requests.
- Check Application Insights for startup/worker errors.
