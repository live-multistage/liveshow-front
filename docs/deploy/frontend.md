# Frontend — deploy em produção

## Imagem Docker (Next.js standalone)

O app é membro do workspace pnpm da raiz (`pnpm-lock.yaml` e `packages/design-system` ficam um nível acima), por isso o build roda com a **raiz do workspace como contexto**:

```bash
# a partir de /caminho/para/live-show (raiz do workspace)
docker build -f live-show-react/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api.seudominio.com/api \
  --build-arg NEXT_PUBLIC_ADS_MANAGER_URL=https://ads.seudominio.com \
  --build-arg NEXT_PUBLIC_SITE_URL=https://seudominio.com \
  -t live-show-react:latest .
```

O `.dockerignore` da raiz é uma allow-list (só `live-show-react`, `live-show-ads`, `packages/*` e os arquivos do pnpm entram no contexto). Imagem final ≈ 300 MB, usuário não-root, porta 3000, healthcheck em `/`.

`NEXT_PUBLIC_*` são embutidas no build — mudar a URL da API exige rebuild.

## Rodando

```yaml
services:
  web:
    image: live-show-react:latest
    restart: unless-stopped
    environment:
      PORT: 3000
    ports: ["3000:3000"]
```

Coloque o nginx do orchestrator (ou outro proxy TLS) na frente, roteando o domínio público para `web:3000` e `/api` para a API. O app espera a API em `NEXT_PUBLIC_API_URL`; em mesma origem use `/api` (o proxy interno `shouldProxyApi` trata localhost/mixed-content).

## Alternativa: Vercel

Importe o repositório com **Root Directory = `live-show-react`**, build command padrão (`pnpm build`), e defina `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_ADS_MANAGER_URL`, `NEXT_PUBLIC_SITE_URL`. A Vercel detecta o workspace pnpm pela raiz.

## Variáveis

| Nome | Uso |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base da API (ex.: `https://api.x.com/api`) |
| `NEXT_PUBLIC_ADS_MANAGER_URL` | Link para o app de anunciantes |
| `NEXT_PUBLIC_SITE_URL` | Origem pública (canonical/OG) |
| `PORT` | Porta do servidor standalone (padrão 3000) |
