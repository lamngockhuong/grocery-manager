# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Grocery store price management web app (500-2000 SKU) built entirely on Google Apps Script + Google Sheets. Single-page application served via `doGet()`, no build step.

## Architecture

```bash
Browser SPA (Materialize CSS)
  └── google.script.run (async RPC)
        └── api* wrapper functions (Code.gs) — try-catch + {success, data, error}
              └── Service modules (IIFE pattern) — business logic + auth
                    └── SheetHelper.gs — generic CRUD
                          └── Google Sheets (6 sheets as database)
                    └── CacheHelper.gs — chunked CacheService (10min TTL)
```

**Key patterns:**

- All backend modules use IIFE (`var Module = (function() { ... })()`) to avoid GAS global scope pollution
- All API functions return `{ success: boolean, data?: any, error?: string }`
- Auth: `Session.getActiveUser().getEmail()` → Users sheet lookup → admin/viewer role
- Frontend: hash-based SPA routing (`#products`, `#categories`, etc.), all pages server-side included via `<?!= include('filename') ?>`
- Write operations use `LockService.getScriptLock()` for atomicity (price update, restock)
- Price changes auto-log to PriceHistory sheet

## Database (Google Sheets)

6 sheets: Products, Prices, Inventory, PriceHistory, Users, Categories. Column definitions in `Config.gs` COLUMNS object. All IDs are UUID-based (prefix + `Utilities.getUuid()`). `SPREADSHEET_ID` stored in Script Properties via `PropertiesService.getScriptProperties()`.

## Development

**No local build/test/lint** — this is a GAS project. Uses `clasp` CLI (local dev dependency) via pnpm.

```bash
pnpm install                # install dependencies
pnpm exec clasp login       # first-time: authenticate with Google
pnpm push                   # push src/ to GAS
pnpm run deploy                 # push + create new deployment
pnpm open                   # open GAS editor in browser
pnpm open:webapp            # open deployed web app
pnpm push:watch             # auto-push on file changes
pnpm logs                   # view execution logs
pnpm status                 # check file sync status
```

**First-time setup:** Run `setupSheets()` in GAS editor (`pnpm open`) to create all 6 sheets with headers.

## File Dependencies

```bash
Config.gs          ← loaded first (constants used everywhere)
SheetHelper.gs     ← depends on Config (COLUMNS, ID_PREFIXES)
CacheHelper.gs     ← depends on Config (CACHE_TTL)
Auth.gs            ← depends on SheetHelper, Config
CategoryService.gs ← depends on SheetHelper, Auth, CacheHelper
PriceService.gs    ← depends on SheetHelper, Auth, CacheHelper
ProductService.gs  ← depends on SheetHelper, Auth, CacheHelper, PriceService, InventoryService, CategoryService
InventoryService.gs← depends on SheetHelper, Auth, CacheHelper
ReportService.gs   ← depends on all Services
Code.gs            ← depends on all modules (API layer + setup)
```

## Deploy & Access Control

**Deployment settings** (`appsscript.json`):

- `executeAs: "USER_ACCESSING"` — runs under visitor's permissions, `getActiveUser()` returns their email
- `access: "ANYONE"` — any Google account with the link can open it, app-level auth controls actual access

**Grant access to a new user (4 steps):**

1. Add email to **Users sheet** in Google Sheets (columns: email, name, role, createdAt)
2. **Share the spreadsheet** with that email (Editor) — required because `USER_ACCESSING` needs sheet read/write permissions
3. Send the **deployment URL** (`/exec`) to the user — get URL: `pnpm exec clasp deployments`
4. User visits URL → picks account → clicks "Advanced" → "Go to app" → "Allow" (one-time only)

**Roles:** `admin` = full CRUD | `viewer` = read-only

**Deploy commands:**

```bash
pnpm push && pnpm run deploy   # push code + create new deployment
pnpm exec clasp deployments    # list deployments + URLs
```

**Notes:**

- Each `pnpm run deploy` creates a new version URL; old URLs keep their old config
- Users not in the Users sheet see an "Access denied" page
- OAuth popup appears once per user, subsequent visits go straight to the app

## GAS Constraints

- 6-minute execution timeout per call
- 100 requests/100s/user rate limit
- CacheService: 100KB/key (CacheHelper handles chunking)
- `Session.getActiveUser()` only works when deployed as "Execute as: User accessing the web app"
- No ES modules — all code shares global scope, order matters
- HTML files use `.html` extension even for JS (`app.js.html`) and CSS (`styles.css.html`)
