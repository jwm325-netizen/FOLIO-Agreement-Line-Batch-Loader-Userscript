// ==UserScript==
// @name         FOLIO Agreement Line Batch Loader
// @namespace    https://github.com/folio-org/folio-batch-agreement-lines
// @version      1.3.0
// @description  Batch create Agreement Lines and link PO Lines from eHoldings CSV exports in FOLIO ERM
// @author       FOLIO ERM Community
// @match        *://*-test.folio.indexdata.com/*
// @match        *://*.folio.indexdata.com/*
// @match        *://folio-test.*.edu/*
// @match        *://folio.*.edu/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      *-okapi.folio.indexdata.com
// @connect      *
// @run-at       document-idle
// ==/UserScript==

/**
 * ============================================================================
 * INSTITUTION CONFIGURATION:
 * ============================================================================
 * To adapt this script to your institution:
 *
 * 1. MATCH RULES: Update the @match directives in the metadata header above to
 *    match your institution's FOLIO web interface URLs.
 *    Example:
 *      // @match  https://folio-test.your-institution.edu/*
 *      // @match  https://folio.your-institution.edu/*
 *
 * 2. OKAPI CONNECT RULES: Update the @connect directives above with your Okapi
 *    backend domain to grant cross-origin request permissions in Tampermonkey.
 *    Example:
 *      // @connect okapi-test.your-institution.edu
 *      // @connect okapi.your-institution.edu
 *
 * 3. FALLBACK DEFAULTS: Set your institution's tenant ID and fallback Okapi
 *    endpoint below if not automatically detected from the active FOLIO session.
 * ============================================================================
 */
const INSTITUTION_CONFIG = {
    // Your institution's default tenant code (e.g. 'diku', 'institution_test', 'main')
    defaultTenant: 'institution_test',

    // Fallback Okapi URL when not inferred from browser location
    defaultOkapiHost: 'https://folio-test-okapi.institution.edu',

    // Optional default agreement UUID (used when modal opened outside an agreement page)
    defaultAgreementUuid: ''
};

GM_addStyle(`
    .batch-load-menu-item {
        padding: 10px 16px;
        width: 100%;
        background: none;
        border: none;
        text-align: left;
        display: flex;
        align-items: center;
        cursor: pointer;
        color: #333;
        font-size: 14px;
        font-family: "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .batch-load-menu-item:hover {
        background-color: #f0f0f0;
    }
    .batch-load-menu-item::before {
        content: "📥";
        margin-right: 10px;
        font-size: 15px;
    }

    #batch-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(2px);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    #batch-modal {
        background: #ffffff;
        width: 92%;
        max-width: 1100px;
        height: 85vh;
        border-radius: 12px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #cbd5e1;
    }
    .batch-modal-header {
        padding: 14px 20px;
        background: #ffffff;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .batch-modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: #f8fafc;
    }
    .batch-modal-footer {
        padding: 14px 20px;
        background: #ffffff;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .dropzone-box {
        border: 2px dashed #94a3b8;
        background: #ffffff;
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .dropzone-box.dragover {
        border-color: #2563eb;
        background: #eff6ff;
    }
    .controls-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
        background: #ffffff;
        padding: 14px;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
    }
    .controls-grid label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #475569;
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.025em;
    }
    .controls-grid input {
        width: 100%;
        box-sizing: border-box;
        padding: 6px 10px;
        font-size: 12px;
        font-family: monospace;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        background: #f8fafc;
    }
    .batch-table-container {
        flex: 1;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: auto;
        min-height: 220px;
    }
    .batch-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        text-align: left;
    }
    .batch-table th {
        background: #f1f5f9;
        color: #334155;
        font-weight: 600;
        padding: 8px 12px;
        border-bottom: 1px solid #cbd5e1;
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .batch-table td {
        padding: 8px 12px;
        border-bottom: 1px solid #e2e8f0;
        color: #1e293b;
    }
    .batch-table tr:hover {
        background-color: #f8fafc;
    }
    .conn-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 600;
    }
    .badge-ok { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-err { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
    .badge-info { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .btn-action {
        background: #2563eb;
        color: white;
        border: none;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s;
    }
    .btn-action:hover:not(:disabled) { background: #1d4ed8; }
    .btn-action:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-action-secondary {
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #cbd5e1;
        padding: 7px 14px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
    }
    .btn-action-secondary:hover { background: #e2e8f0; }
    .spinner-sm {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: currentColor;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
`);

(function() {
    'use strict';

    let parsedData = [];
    let modalBackdrop = null;

    // 1. Agreement UUID discovery from URL or configuration
    const getUUID = () => {
        const url = window.location.href;
        const match = url.match(/\/agreements\/([a-f0-9-]{36})/i)
            || url.match(/agreementId=([a-f0-9-]{36})/i)
            || window.location.pathname.match(/\/agreements(?:\/view)?\/([0-9a-fA-F-]{36})/)?.[1]
            || window.location.href.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0]
            || INSTITUTION_CONFIG.defaultAgreementUuid;
        return match || '';
    };

    // 2. Tenant detection: Inspects browser storage, session, or configured default
    const getTenant = () => {
        return (
            localStorage.getItem('okapiTenant') ||
            sessionStorage.getItem('okapiTenant') ||
            sessionStorage.getItem('tenant') ||
            localStorage.getItem('tenant') ||
            INSTITUTION_CONFIG.defaultTenant
        ).replace(/"/g, '').trim();
    };

    // 3. Okapi Host resolution: automatically detects Okapi subdomain or configured host
    const getOkapiHost = () => {
        if (INSTITUTION_CONFIG.defaultOkapiHost) {
            return INSTITUTION_CONFIG.defaultOkapiHost.replace(/\/$/, '');
        }
        const hostname = window.location.hostname;
        if (hostname.includes('.folio.indexdata.com') && !hostname.includes('-okapi')) {
            return window.location.origin.replace('.folio.indexdata.com', '-okapi.folio.indexdata.com');
        }
        if (hostname.startsWith('folio.')) {
            return window.location.protocol + '//' + hostname.replace(/^folio\./, 'okapi.');
        }
        return window.location.origin;
    };

    // 4. Token retrieval (folioAccessToken or okapiToken from storage, params, or cookies)
    const getToken = () => {
        const urlParams = new URLSearchParams(window.location.search);
        let hashParams = null;
        if (window.location.hash && window.location.hash.includes('?')) {
            try {
                hashParams = new URLSearchParams(window.location.hash.substring(window.location.hash.indexOf('?') + 1));
            } catch (e) {}
        }
        return (typeof GM_getValue !== 'undefined' ? GM_getValue('folio_token', '') : '') ||
            urlParams.get('folioAccessToken') ||
            urlParams.get('token') ||
            (hashParams ? hashParams.get('folioAccessToken') : '') ||
            localStorage.getItem('okapiToken')?.replace(/"/g, '') ||
            sessionStorage.getItem('okapiToken')?.replace(/"/g, '') ||
            getCookie('folioAccessToken') ||
            getCookie('okapiToken') ||
            '';
    };

    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return '';
    }

    // 5. Native FOLIO Actions Dropdown Hook
    function checkForDropdown() {
        const dropdowns = document.querySelectorAll('[class*="DropdownMenu"], [data-test-dropdown-menu], div[role="menu"]');
        dropdowns.forEach(menu => {
            if (menu.querySelector('.batch-load-menu-item')) return;

            const hasExportLines = Array.from(menu.querySelectorAll('button, a')).some(el =>
                (el.textContent || '').toLowerCase().includes('export agreement lines') ||
                (el.textContent || '').toLowerCase().includes('export')
            );
            const isAgreementLinesContext = window.location.href.includes('/agreements/') || !!document.getElementById('accordion-toggle-button-lines');

            if (hasExportLines || isAgreementLinesContext) {
                const batchBtn = document.createElement('button');
                batchBtn.type = 'button';
                batchBtn.className = 'batch-load-menu-item';
                batchBtn.innerHTML = '<span>Batch load agreement lines (eHoldings CSV)</span>';
                batchBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    menu.style.display = 'none';
                    openBatchModal();
                });
                menu.appendChild(batchBtn);
            }
        });
    }

    const observer = new MutationObserver(checkForDropdown);
    observer.observe(document.body, { childList: true, subtree: true });

    // 6. Modal UI Construction
    function openBatchModal() {
        if (!modalBackdrop) createModalDOM();
        const activeUuid = getUUID();
        const agreementInput = document.getElementById('batch-agreement-uuid');
        if (agreementInput && activeUuid) agreementInput.value = activeUuid;
        modalBackdrop.style.display = 'flex';
    }

    function closeBatchModal() {
        if (modalBackdrop) modalBackdrop.style.display = 'none';
    }

    function createModalDOM() {
        const okapiHost = getOkapiHost();
        const isTestServer = window.location.hostname.includes('test') || window.location.hostname.includes('stage') || okapiHost.includes('test');

        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'batch-modal-backdrop';
        modalBackdrop.innerHTML = `
            <div id="batch-modal">
                <div class="batch-modal-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:16px; font-weight:bold; color:#0f172a;">Batch Load Agreement Lines</span>
                        <span class="${isTestServer ? 'badge-ok' : 'badge-warn'} conn-badge">
                            ${isTestServer ? '🧪 Test / Staging Server' : '⚠️ Production Server'}
                        </span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button id="batch-btn-test-conn" class="btn-action-secondary" style="padding:4px 10px; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="Test FOLIO connection and token">
                            ⚡ Test Connection
                        </button>
                        <button id="batch-modal-close" style="border:none; background:none; cursor:pointer; font-size:24px; color:#94a3b8; line-height:1; padding:0 4px;" title="Close">&times;</button>
                    </div>
                </div>

                <div class="batch-modal-body" id="batch-modal-body">
                    <!-- Dynamic Connection Feedback (hidden until tested) -->
                    <div id="batch-conn-result" style="display:none; font-size:12px; padding:8px 12px; border-radius:6px; margin-bottom:2px;"></div>

                    <!-- CSV Upload Dropzone -->
                    <div class="dropzone-box" id="batch-dropzone">
                        <div style="font-size:24px; margin-bottom:4px;">📄</div>
                        <div style="font-weight:600; color:#1e293b; font-size:13px;">Drag &amp; drop eHoldings package titles CSV export here</div>
                        <div style="font-size:11px; color:#64748b; margin-top:4px;">Supports standard EBSCO / FOLIO eHoldings exported CSV files</div>
                        <input type="file" id="batch-file-input" accept=".csv" style="display:none;" />
                    </div>

                    <!-- Bulk Configuration Controls -->
                    <div class="controls-grid">
                        <div>
                            <label>Target Agreement UUID</label>
                            <div style="display:flex; gap:6px;">
                                <input type="text" id="batch-agreement-uuid" placeholder="e.g. 1af4efc0-c4d4-4134-b47a-765759bbec88" value="${escapeHtml(getUUID())}" />
                                <button type="button" id="batch-btn-apply-agreement" class="btn-action-secondary" style="white-space:nowrap; padding:4px 8px; font-size:11px;">Apply All</button>
                            </div>
                        </div>
                        <div>
                            <label>Default PO Line HRID or Prefix</label>
                            <div style="display:flex; gap:6px;">
                                <input type="text" id="batch-poline-prefix" placeholder="e.g. 10045-1" value="10045-1" />
                                <button type="button" id="batch-btn-apply-poline" class="btn-action-secondary" style="white-space:nowrap; padding:4px 8px; font-size:11px;">Assign All</button>
                            </div>
                        </div>
                    </div>

                    <!-- Parsed Records Table -->
                    <div class="batch-table-container">
                        <table class="batch-table" id="batch-data-table">
                            <thead>
                                <tr>
                                    <th style="width:40px;">#</th>
                                    <th>Title Name</th>
                                    <th style="width:130px;">Resource Ref</th>
                                    <th style="width:140px;">PO Line (HRID / UUID)</th>
                                    <th style="width:180px;">Target Agreement UUID</th>
                                    <th style="width:130px;">Status</th>
                                </tr>
                            </thead>
                            <tbody id="batch-table-body">
                                <tr>
                                    <td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">
                                        No CSV file loaded. Upload your eHoldings package CSV above to preview and edit records.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="batch-modal-footer">
                    <div style="font-size:12px; color:#64748b;" id="batch-footer-status">
                        Ready to process.
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button type="button" id="batch-btn-resolve-polines" class="btn-action-secondary" disabled>
                            🔍 Resolve HRIDs → UUIDs
                        </button>
                        <button type="button" id="batch-btn-create-lines" class="btn-action" disabled>
                            <span>Create Agreement Lines</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modalBackdrop);

        // Attach Event Listeners
        document.getElementById('batch-modal-close').addEventListener('click', closeBatchModal);
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeBatchModal();
        });

        const dropzone = document.getElementById('batch-dropzone');
        const fileInput = document.getElementById('batch-file-input');
        dropzone.addEventListener('click', () => fileInput.click());
        dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFile(e.target.files[0]);
        });

        document.getElementById('batch-btn-test-conn').addEventListener('click', testConnection);

        document.getElementById('batch-btn-apply-agreement').addEventListener('click', () => {
            const val = document.getElementById('batch-agreement-uuid').value.trim();
            if (!val) return;
            parsedData.forEach(row => { row.agreementUuid = val; });
            renderTable();
        });

        document.getElementById('batch-btn-apply-poline').addEventListener('click', () => {
            const val = document.getElementById('batch-poline-prefix').value.trim();
            if (!val) return;
            parsedData.forEach(row => {
                row.poLine = val;
                row.resolvedPoLineUuid = null;
                row.status = 'Pending';
            });
            renderTable();
        });

        document.getElementById('batch-btn-resolve-polines').addEventListener('click', validatePOLines);
        document.getElementById('batch-btn-create-lines').addEventListener('click', createAgreementLines);
    }

    async function testConnection() {
        const resBox = document.getElementById('batch-conn-result');
        if (!resBox) return;
        resBox.style.display = 'block';
        resBox.className = 'badge-info';
        resBox.innerHTML = '<span class="spinner-sm"></span> Testing connection to Okapi orders endpoint...';

        try {
            const host = getOkapiHost();
            const tenant = getTenant();
            await makeRequest(`${host}/orders/order-lines?limit=1`, tenant);
            resBox.className = 'badge-ok';
            resBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>🟢 <strong>Connection active:</strong> Successfully communicated with FOLIO Okapi (HTTP 200 OK). Session token is valid.</span>
                    <button onclick="document.getElementById('batch-conn-result').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:16px; color:#166534; font-weight:bold; padding:0 4px;" title="Dismiss">&times;</button>
                </div>
            `;
        } catch (err) {
            resBox.className = 'badge-err';
            resBox.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>🔴 <strong>Connection failed:</strong> ${escapeHtml(err.message || 'Network error')} (Please confirm you are logged in to FOLIO)</span>
                    <button onclick="document.getElementById('batch-conn-result').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:16px; color:#991b1b; font-weight:bold; padding:0 4px;" title="Dismiss">&times;</button>
                </div>
            `;
        }
    }

    function handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            parseCsv(text);
        };
        reader.readAsText(file);
    }

    function parseCsv(text) {
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
            alert('CSV does not contain sufficient data rows.');
            return;
        }

        let providerId = '', packageId = '';
        const metaLine = lines.find(l => l.includes('Package Id') || l.includes('Provider Id'));
        if (metaLine) {
            const match = metaLine.match(/(\d+)-(\d+)/);
            if (match) {
                providerId = match[1];
                packageId = match[2];
            }
        }

        let headerIdx = lines.findIndex(l => l.toLowerCase().includes('title name') && l.toLowerCase().includes('title id'));
        if (headerIdx === -1) headerIdx = 0;

        const headers = parseCSVLine(lines[headerIdx]).map(h => h.toLowerCase().trim());
        const titleNameIdx = headers.findIndex(h => h.includes('title name'));
        const titleIdIdx = headers.findIndex(h => h.includes('title id'));

        const dataRows = [];
        const currentAgreementUuid = getUUID();

        for (let i = headerIdx + 1; i < lines.length; i++) {
            const row = parseCSVLine(lines[i]);
            if (!row || row.length === 0) continue;

            const name = titleNameIdx !== -1 ? row[titleNameIdx] : row[0];
            const titleId = titleIdIdx !== -1 ? row[titleIdIdx] : (row[1] || '');

            if (!name) continue;

            let ref = '';
            if (providerId && packageId && titleId) {
                ref = `${providerId}-${packageId}-${titleId}`;
            } else if (titleId) {
                ref = titleId;
            }

            dataRows.push({
                index: dataRows.length + 1,
                name: name,
                titleId: titleId,
                reference: ref,
                poLine: '10045-1',
                resolvedPoLineUuid: null,
                agreementUuid: currentAgreementUuid,
                status: 'Pending'
            });
        }

        parsedData = dataRows;
        renderTable();
        document.getElementById('batch-btn-resolve-polines').disabled = parsedData.length === 0;
        document.getElementById('batch-btn-create-lines').disabled = parsedData.length === 0;
        document.getElementById('batch-footer-status').textContent = `Loaded ${parsedData.length} records from CSV.`;
    }

    function parseCSVLine(line) {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        result.push(cur.trim());
        return result;
    }

    function renderTable() {
        const tbody = document.getElementById('batch-table-body');
        if (!parsedData.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#94a3b8;">No records loaded.</td></tr>';
            return;
        }

        tbody.innerHTML = parsedData.map((item, idx) => `
            <tr>
                <td style="color:#64748b; font-mono;">${idx + 1}</td>
                <td style="font-weight:500;">${escapeHtml(item.name)}</td>
                <td style="font-family:monospace; color:#475569;">${escapeHtml(item.reference || 'N/A')}</td>
                <td>
                    <input type="text" class="row-poline-input" data-index="${idx}" value="${escapeHtml(item.poLine)}" style="width:100%; font-family:monospace; padding:3px 6px; font-size:11px; border:1px solid #cbd5e1; border-radius:4px;" />
                    ${item.resolvedPoLineUuid ? `<div style="font-size:10px; color:#166534; font-family:monospace; margin-top:2px;">✓ ${item.resolvedPoLineUuid.substring(0,8)}...</div>` : ''}
                </td>
                <td>
                    <input type="text" class="row-agreement-input" data-index="${idx}" value="${escapeHtml(item.agreementUuid)}" style="width:100%; font-family:monospace; padding:3px 6px; font-size:11px; border:1px solid #cbd5e1; border-radius:4px;" />
                </td>
                <td>
                    <span class="conn-badge ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.row-poline-input').forEach(inp => {
            inp.onchange = (e) => {
                const idx = parseInt(e.target.dataset.index);
                parsedData[idx].poLine = e.target.value.trim();
                parsedData[idx].resolvedPoLineUuid = null;
                parsedData[idx].status = 'Pending';
            };
        });
        tbody.querySelectorAll('.row-agreement-input').forEach(inp => {
            inp.onchange = (e) => {
                const idx = parseInt(e.target.dataset.index);
                parsedData[idx].agreementUuid = e.target.value.trim();
            };
        });
    }

    function getStatusClass(status) {
        if (status === 'Success' || status === 'Ready') return 'badge-ok';
        if (status === 'Error' || status.includes('Not Found') || status.includes('Missing')) return 'badge-err';
        return 'badge-warn';
    }

    // 7. Validate PO Lines: chunked query resolving HRIDs to UUIDs via /orders/order-lines
    async function validatePOLines() {
        const host = getOkapiHost();
        const tenant = getTenant();
        const footerStatus = document.getElementById('batch-footer-status');
        footerStatus.textContent = 'Resolving Order Line HRIDs against /orders/order-lines...';

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const needsLookup = [];

        parsedData.forEach(item => {
            if (!item.poLine) {
                item.status = 'Missing PO Line';
                return;
            }
            if (uuidRegex.test(item.poLine)) {
                item.resolvedPoLineUuid = item.poLine;
                item.status = 'Ready';
            } else {
                needsLookup.push(item);
            }
        });

        renderTable();

        if (needsLookup.length > 0) {
            const chunkSize = 25; // Batches of 25 to avoid URI length overflow
            for (let i = 0; i < needsLookup.length; i += chunkSize) {
                const chunk = needsLookup.slice(i, i + chunkSize);
                const queryParts = chunk.map(c => `poLineNumber=="${c.poLine.trim()}"`);
                const query = encodeURIComponent(queryParts.join(' or '));

                try {
                    const orderRes = await makeRequest(`${host}/orders/order-lines?limit=1000&query=${query}`, tenant);
                    const poLines = Array.isArray(orderRes) ? orderRes : (orderRes.poLines || []);
                    const polMap = new Map();
                    poLines.forEach(pol => {
                        if (pol.poLineNumber) polMap.set(pol.poLineNumber.toLowerCase(), pol.id);
                    });

                    chunk.forEach(item => {
                        const key = (item.poLine || '').trim().toLowerCase();
                        if (polMap.has(key)) {
                            item.resolvedPoLineUuid = polMap.get(key);
                            item.status = 'Ready';
                        } else {
                            item.status = 'HRID Not Found';
                        }
                    });
                } catch (err) {
                    chunk.forEach(item => {
                        item.status = 'Lookup Error';
                    });
                }
                renderTable();
            }
        }

        footerStatus.textContent = 'PO Line HRID resolution complete.';
    }

    // 8. Execute Creation of Agreement Lines in mod-agreements (/erm/entitlements)
    async function createAgreementLines() {
        const host = getOkapiHost();
        const tenant = getTenant();
        const createBtn = document.getElementById('batch-btn-create-lines');
        const footerStatus = document.getElementById('batch-footer-status');

        createBtn.disabled = true;
        let successCount = 0, failCount = 0;

        for (let i = 0; i < parsedData.length; i++) {
            const item = parsedData[i];
            if (!item.agreementUuid) {
                item.status = 'Missing Agreement';
                renderTable();
                continue;
            }

            const polId = item.resolvedPoLineUuid || item.poLine;
            footerStatus.textContent = `Creating agreement line ${i + 1} of ${parsedData.length}: ${item.name}...`;
            item.status = 'Creating...';
            renderTable();

            const payload = {
                owner: item.agreementUuid,
                type: 'external',
                authority: 'ekb-title',
                reference: item.reference || item.titleId || 'unknown',
                description: item.name,
                poLines: polId ? [{ _delete: false, poLineId: polId }] : []
            };

            try {
                await makeRequest(`${host}/erm/entitlements`, tenant, 'POST', payload);
                item.status = 'Success';
                successCount++;
            } catch (err) {
                item.status = 'Error: ' + (err.message || 'Failed');
                failCount++;
            }
            renderTable();
        }

        createBtn.disabled = false;
        footerStatus.textContent = `Completed batch creation: ${successCount} succeeded, ${failCount} failed. Refresh the FOLIO agreement lines tab to see newly linked lines.`;
    }

    // 9. Generic Okapi Request Helper with token auth
    function makeRequest(url, tenant, method = 'GET', body = null) {
        return new Promise((resolve, reject) => {
            const token = getToken();
            const headers = {
                'X-Okapi-Tenant': tenant,
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain'
            };
            if (token) {
                headers['X-Okapi-Token'] = token;
            }

            GM_xmlhttpRequest({
                method: method,
                url: url,
                headers: headers,
                data: body ? JSON.stringify(body) : null,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            const json = JSON.parse(response.responseText);
                            resolve(json);
                        } catch (e) {
                            resolve(response.responseText);
                        }
                    } else {
                        reject(new Error(`HTTP ${response.status}: ${response.responseText || response.statusText}`));
                    }
                },
                onerror: function(err) {
                    reject(new Error('Network error or CORS blocked by Tampermonkey @connect directive.'));
                }
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
})();
