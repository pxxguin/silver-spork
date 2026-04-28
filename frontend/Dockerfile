FROM node:22-alpine AS build

WORKDIR /app

# 패키지 정보 복사 및 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 빌드 시 사용할 백엔드 API URL 환경변수 설정
# docker-compose.yml 에서 인자를 전달받습니다.
ARG PUBLIC_API_URL="http://localhost:8000"
ENV PUBLIC_API_URL=$PUBLIC_API_URL

# Astro 빌드
RUN npm run build

# Nginx를 사용한 정적 파일 서빙
FROM nginx:alpine

# astro.config.mjs의 base 설정이 '/4thCvBackend'이므로, 
# 해당 경로로 접속했을 때 리소스를 찾을 수 있도록 폴더 구조를 맞춥니다.
COPY --from=build /app/dist /usr/share/nginx/html/4thCvBackend

# 루트 경로 접속 시 4thCvBackend로 리다이렉트 (선택 사항)
RUN echo '<meta http-equiv="refresh" content="0; url=/4thCvBackend/" />' > /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
