# Smart Communication Glove - Final Software

This is the final cloud software project for the multilingual Smart Communication Glove.

## Main features

- Cloudflare Worker REST API
- Cloudflare D1 database
- Cloudflare Workers AI translation
- English + Tamil + Telugu + Malayalam + Hindi
- Dynamic Finger 1-5 message editing
- Emergency finger configuration
- 10-second full-screen emergency dashboard alert
- Event history
- Device API-key authentication
- Separate dashboard/admin API-key authentication
- Public cloud dashboard
- No localhost required after deployment

## Current deployed URL

```text
https://gloves-proj.smartglove-skibui.workers.dev
```

## Important security note

Production API secret values are NOT stored inside this ZIP.

They are Cloudflare Worker secrets:

```text
DEVICE_API_KEY
ADMIN_API_KEY
```

If deploying to a new Cloudflare account, create new secret values.

## Requirements

Install Node.js LTS.

Then:

```powershell
npm install
```

## Local development

Create `.dev.vars` from `.dev.vars.example`:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Edit the local keys if required.

Initialize local D1:

```powershell
npm run db:init:local
```

Run:

```powershell
npm run dev
```

## Cloud deployment

Login:

```powershell
npx wrangler login --device
```

### Existing project

`wrangler.jsonc` currently contains the existing D1 database ID.

To deploy to the existing Cloudflare account:

```powershell
npm run deploy
```

### New Cloudflare account / student deployment

Create a new D1 database:

```powershell
npx wrangler d1 create gloves-db --location=apac
```

Replace the `database_id` in `wrangler.jsonc`.

Set secrets:

```powershell
npx wrangler secret put DEVICE_API_KEY
npx wrangler secret put ADMIN_API_KEY
```

Initialize remote D1:

```powershell
npm run db:init:remote
```

Deploy:

```powershell
npm run deploy
```

## API endpoints

### Health

```text
GET /api/health
```

### ESP32 configuration sync

```text
GET /api/device-config
Header: X-API-Key
```

### ESP32 finger event

```text
POST /api/event
Header: X-API-Key
Content-Type: application/json
```

Body:

```json
{
  "device_id": "GLOVE_001",
  "finger": 1
}
```

### Dashboard config

```text
GET /api/config
Header: X-Admin-Key
```

### Edit finger message

```text
PUT /api/config/1
Header: X-Admin-Key
Content-Type: application/json
```

Body:

```json
{
  "message": "Please call my family",
  "emergency": false
}
```

The backend automatically generates Tamil, Telugu, Malayalam and Hindi using:

```text
@cf/ai4bharat/indictrans2-en-indic-1B
```

### Events

```text
GET /api/events?limit=30
Header: X-Admin-Key
```

### Latest event

```text
GET /api/latest?after=0
Header: X-Admin-Key
```

## Translation language codes

```text
Tamil     tam_Taml
Telugu    tel_Telu
Malayalam mal_Mlym
Hindi     hin_Deva
```

## Project structure

```text
gloves_proj_final/
|-- src/
|   `-- index.js
|-- public/
|   |-- index.html
|   |-- styles.css
|   `-- app.js
|-- scripts/
|   `-- test-event.ps1
|-- .dev.vars.example
|-- .gitignore
|-- package.json
|-- schema.sql
|-- wrangler.jsonc
`-- README.md
```
