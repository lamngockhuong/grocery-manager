# Deployment Guide

## Overview

Grocery Manager is deployed as a Google Apps Script Web App. This guide covers initial setup, deployment, and ongoing maintenance.

**Tech Stack:**

- Google Apps Script v8 runtime
- Google Sheets (6-sheet relational database)
- No external servers required

## Prerequisites

- Google Account (Gmail or Google Workspace)
- Access to Google Drive
- Chrome/Firefox/Safari browser (modern)
- Node.js 14+
- pnpm

## Quick Start (clasp CLI)

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Login to Google

```bash
pnpm exec clasp login
```

### Step 3: Create GAS Project (first time only)

```bash
pnpm exec clasp create --title "Grocery Manager" --type standalone --rootDir src
```

This creates `.clasp.json` (already in `.gitignore`).

### Step 4: Push & Run Setup

```bash
pnpm push       # push code to GAS
pnpm open       # open GAS editor in browser
```

In GAS editor: Select `setupSheets()` → Run → Authorize

**Result:** Tự động tạo spreadsheet mới + lưu ID vào Script Properties + tạo 6 sheets + thêm admin user.

**Nếu muốn dùng spreadsheet có sẵn:** Chạy `setupSpreadsheetId('your-spreadsheet-id')` trong GAS editor trước khi chạy `setupSheets()`. Hoặc vào Project Settings → Script Properties → thêm key `SPREADSHEET_ID`.

**Đổi tên app:** Vào Project Settings → Script Properties → thêm key `APP_NAME` với giá trị mong muốn (mặc định: `Quản Lý Tạp Hoá`). Tên hiển thị ở navbar và tiêu đề trang.

### Step 6: Deploy

```bash
pnpm run deploy     # push + create timestamped deployment
```

### Step 7: Access App

```bash
pnpm open:webapp    # open deployed web app in browser
```

### Available Scripts

| Script             | Description                      |
| ------------------ | -------------------------------- |
| `pnpm push`        | Push code to GAS                 |
| `pnpm push:watch`  | Auto-push on file changes        |
| `pnpm run deploy`  | Push + create timestamped deploy |
| `pnpm open`        | Open GAS editor in browser       |
| `pnpm open:webapp` | Open deployed web app            |
| `pnpm logs`        | View execution logs              |
| `pnpm status`      | Check file sync status           |

### Updating the App

```bash
# Make code changes in src/
pnpm run deploy                                    # new deployment (new URL)
pnpm exec clasp deploy --update {DEPLOY_ID}    # update existing (keep URL)
```

---

## Post-Deployment Setup

### Add Users

After deployment, add other users:

1. Open Google Sheet (created in Step 4)
2. Go to **Users** sheet
3. Add rows:

   ```bash
   email              | name        | role    | created_at
   admin@gmail.com    | Admin User  | admin   | 2024-01-01T00:00:00Z
   viewer@gmail.com   | Store Staff | viewer  | 2024-01-01T00:00:00Z
   ```

4. Users open deployment URL:
   - Login with their Google account
   - If in Users sheet: Access granted
   - If not in Users sheet: Error "Tài khoản không có quyền truy cập"

### Configure Spreadsheet ID (if needed)

If you want the app to use a specific spreadsheet:

1. Create Google Sheet
2. Copy Spreadsheet ID from URL:

   ```bash
   https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
   ```

3. Update `Config.gs`:

   ```javascript
   var SPREADSHEET_ID = '{SPREADSHEET_ID}';
   ```

4. Re-deploy

**Default behavior:** Leave `SPREADSHEET_ID = ''` and use the active spreadsheet from GAS context.

---

## Troubleshooting

### "User does not have access to perform this action"

**Cause:** User email not in Users sheet

**Fix:**

1. Open Google Sheet
2. Go to Users sheet
3. Add user's email with role 'admin' or 'viewer'
4. User refreshes browser and tries again

### "Cannot find spreadsheet with ID..."

**Cause:** Invalid or missing SPREADSHEET_ID in Config.gs

**Fix:**

1. In GAS editor, open Config.gs
2. Check SPREADSHEET_ID:
   - If empty string: OK (uses active sheet)
   - If not empty: Verify it's a valid sheet you have access to
3. Redeploy

### "Execution timed out" (>6 minutes)

**Cause:** Large operation took too long

**Fix:**

1. Check Google Apps Script logs for what timed out
2. Optimize the operation:
   - Add pagination to reports
   - Reduce product count being processed
   - Implement server-side filtering
3. Contact developer if issue persists

### "Cache key too large" (>100KB)

**Cause:** Cached data exceeds 100KB limit

**Fix:**

- CacheHelper automatically chunks (already handled in v1.0)
- If error persists, check CacheHelper.set() calls

### "Product not found" or "Price not updated"

**Cause:** Cache stale or data inconsistency

**Fix:**

1. Clear browser cache:
   - F12 (DevTools) → Storage → Clear all
2. Refresh page
3. If still broken: Check Google Sheets directly for data
4. Report as bug with screenshot

### Deployment URL not working

**Cause:** Wrong execute permissions or deployment deleted

**Fix:**

1. In GAS editor: Click **Deploy** → **Manage deployments**
2. Check if deployment exists (should have green checkmark)
3. If missing: Click **New deployment** to create fresh
4. Verify **Execute as** is set to your account
5. Share new URL

### "Tài khoản không có quyền truy cập hệ thống" (Account no permission)

**Cause:** User not found in Users sheet OR user email mismatch

**Fix:**

1. Check which email user is logged in as:
   - Open deployment URL
   - Look at error message or browser console
   - User's email shown in Google account picker
2. Open Users sheet
3. Find that email and add if missing:

   ```bash
   user@gmail.com | User Name | viewer | 2024-01-01T00:00:00Z
   ```

4. User refreshes browser

---

## Performance Tuning

### Initial Load Too Slow?

1. **First load (no cache):**
   - Dashboard: 2-3 seconds (normal)
   - Products: 1-2 seconds (normal)

2. **Slow on all loads?**
   - Check GAS logs: Click **Execution log** > Look for slow operations
   - If getAll() taking >1s: Your sheet is very large (>10K rows)
     - Split data into multiple sheets
     - Implement pagination (v1.1)

3. **Concurrent users slow?**
   - GAS has rate limits: 100 req/100s per user
   - Reduce client-side polling
   - Cache more aggressively

### Optimize Cache

Current settings in `CacheHelper.gs`:

```javascript
var CACHE_TTL = 600; // 10 minutes
var CHUNK_SIZE = 90000; // 90KB chunks
```

**Adjust if needed:**

- Increase CACHE_TTL to 1800 (30 min) for slower change rate
- Decrease to 300 (5 min) for faster updates
- Note: Longer TTL = stale data risk, shorter TTL = more API calls

---

## Backup & Data Protection

### Manual Backup

**Important:** Google Sheets auto-saves, but backup important data.

1. Open Google Sheet
2. **File** > **Download** > **Microsoft Excel**
3. Save as `backup-YYYY-MM-DD.xlsx`
4. Store in Drive or email

**Frequency:** Monthly (or before major changes)

### Scheduled Backup (v2.0 Feature)

Planned in v2.0: Auto-backup to Google Drive daily

For now: Manual backup or use Google Sheets' version history:

1. Open Google Sheet
2. **File** > **Version history** > **See version history**
3. Restore previous version if needed

---

## Monitoring & Logs

### View Execution Logs

1. In GAS editor: Click **Execution log** (bottom panel)
2. See logs for each function call
3. Look for errors (red) or slow operations (>1s)

### Enable Verbose Logging

Add to any function you want to debug:

```javascript
Logger.log('Starting operation: ' + new Date().toISOString());
Logger.log('Product count: ' + products.length);
Logger.log('Cache hit for: ' + CACHE_KEY);
```

Run function and check Execution log.

### Monitor Quota

GAS has per-user quotas:

- 100 requests/100 seconds (hard limit)
- 6-minute execution timeout per call
- CacheService 100KB per key (handled)

Check if hitting limits:

- Dashboard loading very slowly: Might be rate-limited
- Try again after 100s
- Reduce concurrent operations

---

## Scaling to Production

### Small Deployment (1-10 users, <500 products)

Current setup works out-of-box:

- GAS Web App handles traffic
- Google Sheets fast enough
- Cache keeps response times low
- Deploy as-is

### Medium Deployment (10-50 users, 500-2K products)

Monitor performance:

1. Track dashboard load time (should be <2s cached)
2. Track API response times in GAS logs
3. If degrading: Implement v1.1 improvements:
   - Pagination in UI
   - Server-side filtering
   - ID map caching

### Large Deployment (50+ users, 2K+ products)

Consider:

1. Migrate to separate Spreadsheet per region
2. Implement API layer (v4.0) for scalability
3. Consider moving from GAS to cloud backend (AWS/GCP)
4. Add read replicas for reports (v3.0)

**Contact developer for architecture consultation.**

---

## Disaster Recovery

### Data Loss Recovery

1. **If Sheets were accidentally deleted:**
   - Open Google Sheets: Drive > Trash
   - Restore sheets from trash (if <30 days old)

2. **If deployment URL broken:**
   - Create new deployment (Step 6)
   - Share new URL
   - Old deployment can be deleted

3. **If all data corrupted:**
   - Check version history (File > Version history)
   - Restore previous version
   - Or: Run setupSheets() again to reset (WARNING: wipes data)

### Business Continuity

Grocery Manager:

- Uses Google infrastructure (99.9% uptime)
- No single point of failure
- All data in user's Google Drive (user owns it)
- Can switch Google Accounts if needed

**RTO (Recovery Time Objective):** <1 hour (redeploy + restore backup)
**RPO (Recovery Point Objective):** <1 day (manual daily backup)

---

## Version Upgrades

### Upgrading to v1.1 (When Released)

1. Download v1.1 source files
2. In GAS editor: Replace each file with new version
3. Pay attention to:
   - Breaking changes in Config.gs (if any)
   - Database schema changes (new columns)
4. If database changes:
   - Open Google Sheet
   - Manually add new columns to affected sheets
   - Re-run setupSheets() with backup first
5. Redeploy

---

## Deployment Checklist

- [ ] Google Account created
- [ ] Google Apps Script project created
- [ ] All 19 source files uploaded to GAS
- [ ] Config.gs SPREADSHEET_ID set (or left blank)
- [ ] Google Sheet created for data
- [ ] setupSheets() function run successfully
- [ ] Web App deployed (new deployment)
- [ ] Deployment URL copied
- [ ] Admin user added to Users sheet
- [ ] Tested in browser (can see products, create product, etc.)
- [ ] Other users added to Users sheet
- [ ] Users can access deployment URL
- [ ] Backup created

---

## Support & Troubleshooting

**Having issues?**

1. Check [Troubleshooting](#troubleshooting) section above
2. Check Google Apps Script logs (Execution log)
3. Search error message online
4. Contact development team with:
   - Error message (full text)
   - GAS execution log (screenshot)
   - What you were doing when error occurred
   - Which function failed (if known)

**Common resources:**

- [Google Apps Script documentation](https://developers.google.com/apps-script)
- [Google Sheets API docs](https://developers.google.com/sheets/api)
- [Materialize CSS docs](https://materializecss.com/) (UI framework)

---

## Additional Resources

- [project-overview-pdr.md](./project-overview-pdr.md) - Feature overview
- [codebase-summary.md](./codebase-summary.md) - Code structure
- [system-architecture.md](./system-architecture.md) - Technical architecture
- [code-standards.md](./code-standards.md) - Coding conventions
- [project-roadmap.md](./project-roadmap.md) - Future plans

---

**Last Updated:** February 2025
**Deployment Methods Supported:** GAS Web Editor, clasp CLI
**GAS Runtime:** V8 (ES6+)
**Minimum Browser:** Chrome 60+, Firefox 55+, Safari 11+
