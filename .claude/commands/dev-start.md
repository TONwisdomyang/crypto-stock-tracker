# Development Start Command

**Description**: Start the development environment

**Usage**: `claude dev-start`

## Command
```bash
cd "${PROJECT_ROOT}" && npm run dev
```

## Purpose
- Starts Next.js development server with Turbopack
- Enables hot reload for development
- Serves the application on available port (3000 or 3001)

## When to Use
- Beginning development session
- Testing UI changes
- Viewing the crypto-stock tracker dashboard

## Expected Output
- Server starts on http://localhost:3000 or 3001
- Dashboard shows current stock-crypto correlations
- Baseline chart displays weekly comparison data