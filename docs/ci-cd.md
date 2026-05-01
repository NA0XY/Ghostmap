# Ghostmap CI/CD

GitHub Actions workflow: `.github/workflows/cicd.yml`

## Behavior

- Pull requests to `main`:
  - Build `@ghostmap/core`
  - Test `@ghostmap/core`
  - Type-check `@ghostmap/web`
  - Type-check `@ghostmap/worker`
- Push to `main`:
  - Build and deploy `apps/web` to Cloudflare Pages project `ghostmap`
  - Trigger Render deploy hook for `apps/worker`

## Required GitHub Secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`

## Secret Values

- `CLOUDFLARE_API_TOKEN`: Cloudflare token with Pages deploy permission for your account/project.
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare account ID (same account owning project `ghostmap`).
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL used by `apps/web`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key used by `apps/web`.
- `RENDER_API_KEY`: Render API key used to trigger deploys.
- `RENDER_SERVICE_ID`: Render service id for `ghostmap-worker` (for example `srv-...`).
