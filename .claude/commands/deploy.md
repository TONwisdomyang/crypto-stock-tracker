# Deploy Command

**Description**: Build and deploy the application

**Usage**: `claude deploy`

## Command
```bash
cd "${PROJECT_ROOT}" && npm run build && npm run export
```

## Purpose
- Builds the Next.js application for production
- Generates static files for Cloudflare Pages
- Optimizes assets and bundles

## When to Use
- Before deploying to production
- Testing production build locally
- After making significant changes

## Prerequisites
- All data files should be up to date
- No lint or TypeScript errors
- All tests passing (if any)

## Output
- `out/` directory with static files ready for deployment