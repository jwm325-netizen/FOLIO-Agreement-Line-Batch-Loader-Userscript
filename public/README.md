# FOLIO ERM Agreement Line Batch Loader & Workbench

A client-side automation userscript and web workbench to **batch create FOLIO Agreement Lines** and associate them with **Purchase Order Lines (PO Lines)** from **EBSCO / FOLIO eHoldings CSV exports**.

Works alongside existing FOLIO userscripts (such as agreement line CSV exporters) by injecting a native **"Batch load agreement lines"** action into the FOLIO Agreements UI.

---

## 🎯 The Problem This Solves

When subscribing to e-resource packages (e.g. Springer, Elsevier, Wiley) tracked in FOLIO eHoldings, librarians need to link titles to FOLIO Agreement records and tie each agreement line to an active Purchase Order Line.

Doing this manually in the FOLIO UI requires:
1. Opening the agreement record.
2. Clicking **New agreement line**.
3. Searching the eHoldings knowledge base or entering external resource IDs.
4. Manually searching for the PO Line number (HRID) and selecting it.
5. Saving each line individually.

For a package with hundreds of titles, this requires hours of repetitive clicking.

This tool automates the process:
* **Imports eHoldings CSV exports**: Parses title names, package identifiers, and external KB IDs (`providerId-packageId-titleId`).
* **Auto-resolves PO Line HRIDs → UUIDs**: Automatically queries `mod-orders` (`GET /orders/order-lines?limit=1000&query=poLineNumber=="<HRID>"`) in chunked batches to find internal FOLIO UUIDs required by `mod-agreements`.
* **Creates Agreement Lines**: Dispatches `POST /erm/entitlements` with `authority: "ekb-title"`, `reference: "<providerId>-<packageId>-<titleId>"`, and linked `poLines: [{ poLineId: "<UUID>" }]`.
* **Safe & Direct**: Runs directly in the librarian's browser session using authenticated FOLIO tokens (`X-Okapi-Token`). No passwords or third-party servers needed.

---

## 🚀 Adapting the Userscript to Your Institution

The standalone userscript is located at [`folio-agreement-line-batch-loader.user.js`](./folio-agreement-line-batch-loader.user.js). 

Follow these steps to configure the script for your institution's FOLIO instance:

### Step 1: Update `@match` Directives

In `folio-agreement-line-batch-loader.user.js`, locate the metadata header at the top of the file. Update the `@match` directives to include your institution's FOLIO domain(s):

```javascript
// ==UserScript==
// @name         FOLIO Agreement Line Batch Loader
// ...
// @match        *://folio-test.your-institution.edu/*
// @match        *://folio.your-institution.edu/*
// ...
```

> **Tip:** If your institution is hosted by Index Data or EBSCO, use their domain pattern:
> ```javascript
> // @match        *://myinstitution-test.folio.indexdata.com/*
> // @match        *://myinstitution.folio.indexdata.com/*
> ```

---

### Step 2: Update `@connect` Directives

Tampermonkey and Violentmonkey require explicit permission to make cross-origin network requests (`GM_xmlhttpRequest`) to your Okapi backend API.

Add your institution's Okapi domain(s) to the `@connect` lines:

```javascript
// @connect      okapi-test.your-institution.edu
// @connect      okapi.your-institution.edu
```

*For Index Data hosted tenants:*
```javascript
// @connect      myinstitution-test-okapi.folio.indexdata.com
// @connect      myinstitution-okapi.folio.indexdata.com
```

---

### Step 3: Configure Institution Defaults (Fallback)

Scroll down to the `INSTITUTION_CONFIG` block around line 35 of `folio-agreement-line-batch-loader.user.js`:

```javascript
const INSTITUTION_CONFIG = {
    // Your institution's default tenant code (e.g., 'diku', 'institution_test', 'main')
    defaultTenant: 'my_tenant_id',

    // Fallback Okapi backend URL if not automatically inferred from browser URL
    defaultOkapiHost: 'https://folio-test-okapi.your-institution.edu',

    // Optional default agreement UUID (used when modal is opened outside an agreement page)
    defaultAgreementUuid: ''
};
```

#### How Automatic Environment Discovery Works:
The userscript automatically detects:
1. **Agreement UUID**: Scraped from the current URL (`/agreements/view/<uuid>` or `?agreementId=<uuid>`).
2. **Tenant ID**: Read from `localStorage` (`okapiTenant`), `sessionStorage` (`okapiTenant`), or cookies.
3. **Session Token**: Read from `sessionStorage` (`okapiToken`), `localStorage`, URL parameters, or browser cookies (`folioAccessToken`).
4. **Okapi Host**: Derived from the current hostname (e.g. `tenant.folio.indexdata.com` → `tenant-okapi.folio.indexdata.com`) or fallback to `INSTITUTION_CONFIG.defaultOkapiHost`.

---

### Step 4: Install in Tampermonkey

1. Install the [Tampermonkey browser extension](https://www.tampermonkey.net/) (Chrome, Firefox, Edge, or Safari).
2. Click the Tampermonkey extension icon in your browser toolbar and select **Dashboard**.
3. Click the **+** (Add a new script) tab.
4. Copy the entire contents of [`folio-agreement-line-batch-loader.user.js`](./folio-agreement-line-batch-loader.user.js).
5. Paste into the Tampermonkey editor and press <kbd>Ctrl+S</kbd> (or <kbd>Cmd+S</kbd> on macOS) to save.

---

## 📋 How to Use

1. Log into your institution's **FOLIO** instance.
2. Navigate to **Agreements** and open the agreement you want to link lines to.
3. Scroll down to the **Agreement lines** accordion.
4. Click **Actions** in the Agreement Lines header.
5. Select **📥 Batch load agreement lines (eHoldings CSV)**.
6. In the modal:
   - Click **⚡ Test Connection** in the header to verify active session communication with Okapi.
   - Drag & drop your exported eHoldings package CSV file.
   - Enter your PO Line HRID (e.g. `10045-1`) and click **Assign All** (or edit individual rows).
   - Click **🔍 Resolve HRIDs → UUIDs** to look up internal order line identifiers.
   - Click **Create Agreement Lines** to batch generate the lines in FOLIO.
7. Once finished, refresh the agreement page or accordion to view your newly attached agreement lines!

---

## 🔬 API & Integration Details

### 1. PO Line HRID-to-UUID Resolution
FOLIO agreement lines (`mod-agreements`) require the internal UUID (`id`) of the purchase order line rather than the human-readable number (`poLineNumber`).

The script looks up UUIDs using `mod-orders`:
```http
GET /orders/order-lines?limit=1000&query=poLineNumber=="10045-1"
```

To optimize network performance and avoid URL character limits, the script chunks lookups into batches of 25 using CQL `or` clauses:
```
poLineNumber=="10045-1" or poLineNumber=="10045-2" or poLineNumber=="10045-3"
```

### 2. Entitlement Creation Payload
Once UUIDs are resolved, the script posts to `mod-agreements`:
```http
POST /erm/entitlements
X-Okapi-Tenant: <tenant>
X-Okapi-Token: <token>
Content-Type: application/json

{
  "owner": "1af4efc0-c4d4-4134-b47a-765759bbec88",
  "type": "external",
  "authority": "ekb-title",
  "reference": "36-434-8776980",
  "description": "Abdominal Radiology",
  "poLines": [
    {
      "_delete": false,
      "poLineId": "d34a2084-7413-4604-8aa2-52ef7549c939"
    }
  ]
}
```

---

## 💻 Running the Web Workbench Locally

This repository includes a full interactive React + Tailwind workbench with:
- CSV Parser & Data Inspector.
- Bulk PO Line Assigner & Resolution Simulator.
- Live Orders API CQL Explorer.
- Userscript Customizer with dynamic institution switcher.

### Quick Start:

```bash
# 1. Clone this repository
git clone https://github.com/your-org/folio-batch-agreement-lines.git
cd folio-batch-agreement-lines

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 🔒 Security & Privacy

- **Client-Side Only**: All operations run locally inside the user's browser.
- **Zero Third-Party Transmission**: Data and tokens are only sent to the user's configured FOLIO Okapi endpoint.
- **Session Reuse**: Uses existing browser session storage/cookies without storing or asking for passwords.
- **Safe Staging Default**: Configured to default to testing/sandbox environments.

---

## 📄 License

Distributed under the [MIT License](./LICENSE). Free for academic, institutional, and commercial use.
