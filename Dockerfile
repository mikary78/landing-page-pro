# ============================================
# Landing Page Pro - 프론트엔드 Dockerfile
# ============================================
# Multi-stage 빌드를 사용하여 최적화된 프로덕션 이미지 생성
#
# 빌드: docker build -t landing-page-pro:latest .
# 실행: docker run -p 80:80 landing-page-pro:latest
# ============================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 (캐시 최적화)
COPY package*.json ./

# 의존성 설치
RUN npm ci --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 빌드 인수 (환경별 빌드)
ARG VITE_APP_ENV=production
ARG VITE_AZURE_FUNCTIONS_URL
ARG VITE_ENTRA_CLIENT_ID
ARG VITE_ENTRA_TENANT_ID
ARG VITE_ENTRA_AUTHORITY

# 환경 변수 설정
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_AZURE_FUNCTIONS_URL=$VITE_AZURE_FUNCTIONS_URL
ENV VITE_ENTRA_CLIENT_ID=$VITE_ENTRA_CLIENT_ID
ENV VITE_ENTRA_TENANT_ID=$VITE_ENTRA_TENANT_ID
ENV VITE_ENTRA_AUTHORITY=$VITE_ENTRA_AUTHORITY

# 프로덕션 빌드
RUN npm run build

# ---- Stage 2: Production ----
FROM nginx:alpine AS production

# nginx 설정 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 빌드된 파일 복사
COPY --from=builder /app/dist /usr/share/nginx/html

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

# 포트 노출
EXPOSE 80

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]
