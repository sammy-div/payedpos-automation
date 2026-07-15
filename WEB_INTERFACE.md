# Web Interface & Deployment Guide

## 🌐 Web Dashboard

A beautiful, responsive web interface to trigger PayedPOS automation tasks from any browser.

### Features

✅ **Export Dashboard** - Full exports with multiple formats (Excel, Word, JSON)  
✅ **Search** - Auto-detect search fields and search any route  
✅ **Analytics** - Count, group, sort, and analyze data  
✅ **Snapshot Comparison** - Compare two exports and see changes  
✅ **File Downloads** - Direct download of generated reports  
✅ **Live Logs** - View recent automation logs  
✅ **Real-time Status** - See what's running  

### Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm run server

# 3. Open in browser
# http://localhost:3000
```

### Running with Hot Reload (Development)

```bash
npm run server:dev
```

---

## 🚀 Deployment Options

### **Option 1: Vercel (Recommended for Simplicity)**

Vercel works well **if exports complete within 10 seconds**. For longer exports, use other options.

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Log in
vercel login

# 3. Deploy
vercel

# Follow prompts, then set environment variables
```

**In Vercel Dashboard:**
1. Go to Settings → Environment Variables
2. Add:
   - `PAYEDPOS_BASE_URL` = your URL
   - `PAYEDPOS_USERNAME` = your username
   - `PAYEDPOS_PASSWORD` = your password

**Limitations:**
- Max 10-second execution (Vercel Function timeout)
- Not ideal for long exports
- Monthly cost after free tier

---

### **Option 2: Railway (Best for PayedPOS)**

Railway is perfect because:
- 24/7 uptime
- No execution time limits
- Pay-as-you-go ($5-10/month typical)
- Easy GitHub integration

**Step 1:** Create Railway account at https://railway.app

**Step 2:** Deploy from GitHub

```bash
# Push code to GitHub first
git add .
git commit -m "Add web interface"
git push
```

Then:
1. Go to Railway.app → New Project
2. Select "Deploy from GitHub"
3. Choose your repository
4. Set environment variables:
   - `PAYEDPOS_BASE_URL`
   - `PAYEDPOS_USERNAME`
   - `PAYEDPOS_PASSWORD`
   - `NODE_ENV=production`
5. Deploy!

Your dashboard will be at: `https://your-app.up.railway.app`

---

### **Option 3: DigitalOcean App Platform**

Great middle-ground option.

**Step 1:** Connect GitHub repository

**Step 2:** Create `Procfile`:

```
web: npm run server
```

**Step 3:** Add to DigitalOcean

1. Go to DigitalOcean → Apps
2. Create → GitHub
3. Select your repository
4. Set environment variables
5. Deploy!

Cost: ~$5-12/month

---

### **Option 4: Docker + AWS/GCP/Azure**

For enterprise deployments.

**Create Dockerfile:**

```dockerfile
FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm run setup:playwright

COPY . .

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "run", "server"]
```

**Create docker-compose.yml:**

```yaml
version: '3.8'

services:
  payedpos:
    build: .
    ports:
      - "3000:3000"
    environment:
      PAYEDPOS_BASE_URL: ${PAYEDPOS_BASE_URL}
      PAYEDPOS_USERNAME: ${PAYEDPOS_USERNAME}
      PAYEDPOS_PASSWORD: ${PAYEDPOS_PASSWORD}
    volumes:
      - ./output:/app/output
      - ./snapshots:/app/snapshots
      - ./logs:/app/logs
```

---

### **Option 5: GitHub Actions + Cloud Storage**

**No server needed!** Schedule exports and upload results.

Create `.github/workflows/deploy.yml`:

```yaml
name: PayedPOS Web Server

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install
        run: npm install
      
      - name: Setup Playwright
        run: npm run setup:playwright
      
      - name: Deploy to Render
        run: |
          npm install -g render-cli
          render-cli deploy
        env:
          RENDER_API_KEY: ${{ secrets.RENDER_API_KEY }}
```

---

## 📊 Recommended Setup

### For Personal Use
- **Railway** (easiest)
- Cost: $5-10/month
- Free tier available

### For Small Business
- **DigitalOcean App Platform**
- Cost: $5-12/month
- Good reliability

### For Automation Only
- **GitHub Actions** (scheduled)
- Cost: Free
- No server needed

### For Heavy Usage
- **Docker on AWS/GCP**
- Cost: $20-50/month
- Unlimited scaling

---

## 🔑 Environment Variables

Required for web server:

```env
# PayedPOS Credentials
PAYEDPOS_BASE_URL=https://payedpos.vercel.app
PAYEDPOS_USERNAME=your_username
PAYEDPOS_PASSWORD=your_password

# Server
PORT=3000                    # Optional, defaults to 3000
NODE_ENV=production          # Optional
```

---

## 📡 API Endpoints

All endpoints are JSON-based.

### POST `/api/export`

Export data from dashboard

```json
{
  "route": "dashboard",
  "formats": ["excel", "word", "snapshot"]
}
```

Response:
```json
{
  "status": "success",
  "result": {
    "extracted": { "rowCount": 150 },
    "excel": { "path": "..." },
    "word": { "path": "..." },
    "snapshot": { "path": "..." }
  }
}
```

### POST `/api/search`

Search and extract

```json
{
  "route": "merchants",
  "query": "coffee shop"
}
```

### POST `/api/analyze`

Analyze data

```json
{
  "route": "pos-terminals",
  "operation": "countBy",
  "field": "Status"
}
```

### POST `/api/compare-snapshots`

Compare two snapshots

```json
{
  "snapshot1": "snapshot-2026-07-14T19-17-24-991Z.json",
  "snapshot2": "snapshot-2026-07-14T19-20-02-718Z.json"
}
```

### GET `/api/exports`

List available exports

### GET `/api/snapshots`

List available snapshots

### GET `/api/logs`

Get recent logs

### GET `/download/export/:filename`

Download an export file

### GET `/download/snapshot/:filename`

Download a snapshot

### GET `/health`

Health check

---

## 🎨 UI Features

### Dashboard Sections

1. **Full Export** - Click to generate all exports
2. **Search** - Find specific records
3. **Analytics** - Count, group, sort data
4. **Recent Exports** - Browse and download files
5. **Snapshots** - Compare two exports
6. **Logs** - View automation logs

### Real-time Updates

- Files refresh every 5 seconds
- Status indicator shows if running
- Buttons disable during execution
- Results displayed inline

---

## 🔒 Security

- ✅ Environment variables for secrets
- ✅ Read-only operations enforced
- ✅ CORS configured
- ✅ Path traversal prevention
- ✅ Input validation

---

## 📱 Responsive Design

- ✅ Works on desktop
- ✅ Tablet friendly
- ✅ Mobile responsive
- ✅ Touch-friendly buttons

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run server
```

### Playwright Not Found

```bash
npm run setup:playwright
```

### Credentials Not Working

Check environment variables:
```bash
echo $PAYEDPOS_BASE_URL
echo $PAYEDPOS_USERNAME
echo $PAYEDPOS_PASSWORD
```

### Exports Not Downloading

Check `output/` directory permissions:
```bash
chmod 755 output/
```

---

## 💡 Tips

1. **Schedule Exports** - Use Railway's cron job feature
2. **Monitor Logs** - Check logs tab for errors
3. **Backup Snapshots** - Download regularly
4. **Cache Results** - Keep downloaded files for reference
5. **Automate Workflows** - Use API endpoints in your own scripts

---

## 🚀 Quick Start

**Simplest setup:**

```bash
# 1. Install Express
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with credentials

# 3. Run server
npm run server

# 4. Open browser
# http://localhost:3000
```

**Deploy to Railway:**

```bash
# Just push to GitHub - Railway auto-deploys!
git push
```

---

Start here: `npm run server` then visit `http://localhost:3000` 🎉
