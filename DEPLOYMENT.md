# Deployment Guide

This project can be deployed to GitHub Pages or Cloudflare Pages. The CMS and API routes are automatically excluded from production builds.

## 🚀 GitHub Pages Deployment

### Automatic Deployment (Recommended)

1. Push your code to GitHub
2. Go to your repository Settings → Pages
3. Under "Build and deployment", select "GitHub Actions" as the source
4. The workflow will automatically run on every push to `main`

The site will be available at `https://yourusername.github.io/graetzlmap/`

### Manual Deployment

```bash
npm run build:prod
# Upload the contents of the `dist` folder to your hosting
```

## ☁️ Cloudflare Pages Deployment

### Via Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to "Workers & Pages" → "Create application" → "Pages"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command**: `npm run build:prod`
   - **Build output directory**: `dist`
   - **Node version**: `20`
5. Click "Save and Deploy"

### Via Wrangler CLI

```bash
npm install -g wrangler
npm run build:prod
wrangler pages deploy dist
```

## 🛠️ Development vs Production

### Development (with CMS)
```bash
npm run dev
# CMS available at http://localhost:4321/cms
```

### Production Build (without CMS)
```bash
npm run build:prod
# CMS and API routes are excluded
```

### Regular Build (with everything)
```bash
npm run build
# Includes CMS (for deploying to a server with Node.js)
```

## 📝 Notes

- **Production builds** (`build:prod`) create a static site without the CMS
  - Step 1: Compiles all individual POI files into `/public/data/all-pois.json`
  - Step 2: Builds static site
  - Step 3: Removes CMS and API routes from output
- The CMS and API routes require a Node.js server and won't work on static hosting
- If you need the CMS in production, deploy to a platform that supports Node.js (Vercel, Netlify, Railway, etc.)
- Data files in `/public/data/` are included in all builds and are read-only in production
- The map automatically uses static JSON in production, API in development
