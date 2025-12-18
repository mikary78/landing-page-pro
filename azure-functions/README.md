# Azure Functions - Landing Page Pro

Azure Functions implementation replacing Supabase Edge Functions.

## Functions

### 1. processDocument
- **Endpoint**: `POST /api/processDocument`
- **Purpose**: AI-powered document processing with 5-stage curriculum generation
- **Auth**: Required (JWT Bearer token)
- **Request Body**:
```json
{
  "projectId": "uuid",
  "aiModel": "gemini" | "claude" | "chatgpt",
  "regenerateStageId": "uuid (optional)",
  "feedback": "string (optional)"
}
```

### 2. generateCurriculum
- **Endpoint**: `POST /api/generateCurriculum`
- **Purpose**: Generate course curriculum with modules and lessons
- **Auth**: Required (JWT Bearer token)
- **Request Body**:
```json
{
  "courseId": "uuid",
  "courseTitle": "string",
  "courseDescription": "string (optional)",
  "level": "string (optional)",
  "targetAudience": "string (optional)",
  "totalDuration": "string (optional)",
  "aiModel": "gemini" | "claude" | "chatgpt"
}
```

## Development

### Prerequisites
- Node.js 20+
- Azure Functions Core Tools v4
- Azure CLI

### Setup
1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `local.settings.json`:
```json
{
  "Values": {
    "AZURE_POSTGRES_HOST": "your-host",
    "AZURE_POSTGRES_DATABASE": "your-db",
    "AZURE_POSTGRES_USER": "your-user",
    "AZURE_POSTGRES_PASSWORD": "your-password",
    "AZURE_AD_B2C_CLIENT_ID": "your-client-id",
    "GEMINI_API_KEY": "your-api-key",
    "ANTHROPIC_API_KEY": "your-api-key",
    "OPENAI_API_KEY": "your-api-key"
  }
}
```

### Run Locally
```bash
npm run build
npm start
```

Functions will be available at:
- http://localhost:7071/api/processDocument
- http://localhost:7071/api/generateCurriculum

### Testing
```bash
# Test processDocument
curl -X POST http://localhost:7071/api/processDocument \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "uuid",
    "aiModel": "gemini"
  }'

# Test generateCurriculum
curl -X POST http://localhost:7071/api/generateCurriculum \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "uuid",
    "courseTitle": "Test Course",
    "aiModel": "gemini"
  }'
```

## Deployment

### 1. Create Azure Function App
```bash
az functionapp create \
  --resource-group rg-landing-page-pro \
  --name func-landing-page-pro \
  --storage-account stlandingpagepro \
  --consumption-plan-location koreacentral \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4
```

### 2. Configure Application Settings
```bash
az functionapp config appsettings set \
  --name func-landing-page-pro \
  --resource-group rg-landing-page-pro \
  --settings \
    AZURE_POSTGRES_HOST=psql-landing-page-pro.postgres.database.azure.com \
    AZURE_POSTGRES_DATABASE=landingpagepro \
    AZURE_POSTGRES_USER=pgadmin \
    AZURE_POSTGRES_PASSWORD=LandingPage2025!@#Strong \
    AZURE_AD_B2C_CLIENT_ID=<YOUR_CLIENT_ID> \
    GEMINI_API_KEY=<YOUR_API_KEY> \
    ANTHROPIC_API_KEY=<YOUR_API_KEY> \
    OPENAI_API_KEY=<YOUR_API_KEY>
```

### 3. Deploy
```bash
npm run build
func azure functionapp publish func-landing-page-pro
```

## Architecture

### Middleware
- **auth.ts**: JWT token verification using Azure AD B2C JWKS

### Libraries
- **database.ts**: PostgreSQL connection pooling and query helpers
- **ai-services.ts**: AI service integrations (Gemini, Claude, ChatGPT)

### AI Models
- **Gemini**: gemini-2.0-flash-exp (free)
- **Claude**: claude-3-5-haiku-20241022 ($0.25/MTok)
- **ChatGPT**: gpt-4o-mini ($0.15/MTok)

## Migration from Supabase

### Removed Dependencies
- `@supabase/supabase-js` → Direct PostgreSQL
- Supabase Auth → Azure AD B2C + JWT

### Database Changes
- RLS policies → Application-level filtering
- `auth.users.id` → `profiles.user_id` (Azure AD B2C ObjectId)

### Environment Variables Mapping
| Supabase | Azure Functions |
|----------|----------------|
| SUPABASE_URL | AZURE_POSTGRES_HOST |
| SUPABASE_SERVICE_ROLE_KEY | N/A (JWT verification) |
| SUPABASE_ANON_KEY | N/A (JWT verification) |

## Troubleshooting

### Error: "Connection refused"
- Check PostgreSQL firewall rules
- Verify connection string in local.settings.json

### Error: "Unauthorized"
- Verify JWT token is valid
- Check Azure AD B2C configuration
- Ensure JWKS URI is correct

### Error: "AI API error"
- Verify API keys in local.settings.json
- Check API rate limits and credits
- Ensure model names are correct

## Cost Estimation

### Azure Functions
- Consumption Plan: $0.20/million executions + $0.000016/GB-s
- Estimated: ~$5-10/month (with 10K requests/month)

### AI APIs
- Gemini: Free (2.0-flash-exp)
- Claude: $0.25/MTok (~$5/month for 20M tokens)
- ChatGPT: $0.15/MTok (~$3/month for 20M tokens)

Total: ~$13-23/month

## Support

For issues or questions, contact the development team or refer to:
- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Azure AD B2C Documentation](https://docs.microsoft.com/azure/active-directory-b2c/)
