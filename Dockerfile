FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Variáveis públicas embutidas pelo Vite no bundle estático.
# NUNCA passe segredos privados via ARG/ENV no frontend.
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_API_URL="/api"
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV VITE_API_URL=${VITE_API_URL}

COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine
# Upstream da API resolvido em runtime via envsubst (sem IP hardcoded).
# Default aponta para o serviço "api" na rede Docker compartilhada;
# em produção basta sobrescrever API_UPSTREAM no ambiente do container.
ENV API_UPSTREAM=http://api:3000
# Faz o entrypoint do nginx detectar o resolver DNS a partir do
# /etc/resolv.conf do container (sem IP de DNS hardcoded) e expô-lo como
# ${NGINX_LOCAL_RESOLVERS} para o template — necessário para o proxy_pass
# com variável resolver o upstream em runtime.
ENV NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

# A imagem oficial do nginx processa /etc/nginx/templates/*.template com
# envsubst no entrypoint e grava o resultado em /etc/nginx/conf.d/.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/nginx-health || exit 1
