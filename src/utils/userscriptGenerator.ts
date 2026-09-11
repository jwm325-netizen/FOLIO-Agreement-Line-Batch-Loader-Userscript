import { FolioConfig } from '../types/folio';

export function generateTampermonkeyUserscript(config: Partial<FolioConfig> = {}): string {
  const tenant = config.tenant || 'institution_test';
  const defaultAgreementUuid = config.defaultAgreementUuid || '';
  const matchDomain = config.matchDomainPattern || '*://folio-test.institution.edu/*';
  const okapiHostConfig = config.okapiBaseUrl || 'https://folio-test-okapi.institution.edu';

  let okapiHostname = '';
  try {
    okapiHostname = new URL(okapiHostConfig).hostname;
  } catch (e) {
    okapiHostname = okapiHostConfig.replace(/^https?:\/\//, '').split('/')[0] || '*';
  }

  return `// ==UserScript==
// @name         FOLIO Agreement Line Batch Loader
// @namespace    https://github.com/folio-org/folio-batch-agreement-lines
// @version      1.3.0
// @description  Batch create Agreement Lines and link PO Lines from eHoldings CSV exports in FOLIO ERM
// @match        ${matchDomain}
// @match        *://*-test.folio.indexdata.com/*
// @match        *://*.folio.indexdata.com/*
// @match        *://folio-test.*.edu/*
// @match        *://folio.*.edu/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      ${okapiHostname}
// @connect      *-okapi.folio.indexdata.com
// @connect      *
// @run-at       document-idle
// ==/UserScript==

GM_addStyle(\`
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
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(2px);
        z-index: 1000000;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #1e293b;
    }
    #batch-modal {
        background: white;
        width: 980px;
        max-width: 95vw;
        max-height: 90vh;
        border-radius: 8px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-size: 13px;
        border: 1px solid #cbd5e1;
    }
    .batch-modal-header {
        padding: 14px 20px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ffffff;
    }
    .batch-modal-body {
        padding: 18px 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        flex: 1;
        background: #fafafa;
    }
    .batch-modal-footer {
        padding: 12px 20px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #ffffff;
    }
    .env-banner-test {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 6px;
        font-size: 12px;
        color: #1e40af;
    }
    .env-banner-prod {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 6px;
        font-size: 12px;
        color: #991b1b;
    }
    .conn-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .conn-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
    }
    .conn-badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-warn { background: #fef9c3; color: #854d0e; }
    .badge-err { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #e0f2fe; color: #0369a1; }

    .dropzone-box {
        border: 2px dashed #cbd5e1;
        border-radius: 6px;
        background: #ffffff;
        padding: 16px;
        text-align: center;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    .dropzone-box:hover, .dropzone-box.dragover {
        border-color: #3b82f6;
        background: #eff6ff;
    }

    .batch-table-wrap {
        max-height: 280px;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        background: #ffffff;
    }
    .batch-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        text-align: left;
    }
    .batch-table th {
        background: #f8fafc;
        position: sticky;
        top: 0;
        padding: 8px 10px;
        font-weight: 600;
        color: #475569;
        border-bottom: 1px solid #e2e8f0;
        z-index: 2;
    }
    .batch-table td {
        padding: 6px 10px;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
    }
    .btn-action-primary {
        background: #2563eb;
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background-color 0.15s;
    }
    .btn-action-primary:hover { background: #1d4ed8; }
    .btn-action-primary:disabled { background: #94a3b8; cursor: not-allowed; }

    .btn-action-success {
        background: #10b981;
        color: #ffffff;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background-color 0.15s;
    }
    .btn-action-success:hover { background: #059669; }
    .btn-action-success:disabled { background: #94a3b8; cursor: not-allowed; }

    .btn-action-secondary {
        background: #ffffff;
        color: #334155;
        border: 1px solid #cbd5e1;
        padding: 7px 14px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background-color 0.15s;
    }
    .btn-action-secondary:hover { background: #f1f5f9; }

    .spinner-sm {
        border: 2px solid #f3f3f3;
        border-top: 2px solid #2563eb;
        border-radius: 50%;
        width: 13px;
        height: 13px;
        animation: spin 1s linear infinite;
        display: inline-block;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
\`);

(function () {
    'use strict';

    // 1. UUID extraction matching user's working production script
    const getUUID = () => {
        return window.location.pathname.match(/\\/erm\\/agreements\\/([0-9a-fA-F-]{36})/)?.[1]
            || window.location.pathname.match(/\\/agreements(?:\\/view)?\\/([0-9a-fA-F-]{36})/)?.[1]
            || window.location.href.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/)?.[0]
            || '${defaultAgreementUuid}';
    };

    // 2. Tenant detection matching user's working script
    const getTenant = () => (localStorage.getItem('okapiTenant') || sessionStorage.getItem('okapiTenant') || '${tenant}').replace(/"/g, '').trim();

    // 3. Okapi Host resolution: uses configured Okapi endpoint or automatically derives from host
    const getOkapiHost = () => {
        const configured = '${okapiHostConfig}';
        if (configured) return configured.replace(/\/$/, '');
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
            (hashParams ? hashParams.get('token') : '') ||
            localStorage.getItem('okapiToken') ||
            sessionStorage.getItem('okapiToken') ||
            localStorage.getItem('folioAccessToken') ||
            sessionStorage.getItem('folioAccessToken') ||
            getCookie('folioAccessToken') ||
            getCookie('okapi-token') ||
            '';
    };

    function getCookie(name) {
        const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
        return v ? v[2] : '';
    }

    // 5. Native menu observer matching the user's reference script
    // Watches for the Actions menu in the Agreement Lines section
    const observer = new MutationObserver(() => {
        const uuid = getUUID();
        if (!uuid) return;
        document.querySelectorAll('div[class*="DropdownMenu"], [role="menu"]').forEach(menu => {
            if (menu.innerText.includes('New agreement line') && !menu.querySelector('#custom-batch-loader-option')) {
                injectMenuItem(menu, uuid);
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    function injectMenuItem(menu, uuid) {
        const container = document.createElement('li');
        container.style.listStyle = 'none';
        const menuItem = document.createElement('button');
        menuItem.id = 'custom-batch-loader-option';
        menuItem.className = 'batch-load-menu-item';
        menuItem.innerText = 'Batch load agreement lines';
        menuItem.onclick = (e) => {
            e.preventDefault();
            // Close FOLIO menu
            try { document.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (err) {}
            showBatchLoaderModal(uuid);
        };
        container.appendChild(menuItem);
        (menu.querySelector('ul') || menu).appendChild(container);
    }

    // 6. Network request wrapper using GM_xmlhttpRequest
    function makeRequest(url, tenant, method = 'GET', body = null) {
        return new Promise((resolve, reject) => {
            const token = getToken();
            const headers = {
                'X-Okapi-Tenant': tenant,
                'Accept': 'application/json'
            };
            if (body) {
                headers['Content-Type'] = 'application/json';
            }
            if (token) {
                headers['X-Okapi-Token'] = token;
                headers['Authorization'] = token.startsWith('Bearer ') ? token : ('Bearer ' + token);
            }

            GM_xmlhttpRequest({
                method: method,
                url: url,
                withCredentials: true,
                headers: headers,
                data: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
                onload: (res) => {
                    if (res.status >= 200 && res.status < 300) {
                        try {
                            resolve(JSON.parse(res.responseText));
                        } catch (e) {
                            resolve({ raw: res.responseText });
                        }
                    } else {
                        reject(new Error(\`API Error \${res.status}: \${res.responseText || res.statusText}\`));
                    }
                },
                onerror: (err) => reject(err)
            });
        });
    }

    // Modal state
    let modalBackdrop = null;
    let parsedData = [];
    let packageInfo = null;

    function showBatchLoaderModal(uuid) {
        if (!modalBackdrop) {
            createModalDOM();
        }
        modalBackdrop.style.display = 'flex';

        // Pre-populate agreement input
        const agInput = document.getElementById('batch-input-agreement');
        if (agInput) {
            agInput.value = uuid || getUUID();
        }
        const activeAgLabel = document.getElementById('batch-active-uuid-display');
        if (activeAgLabel) {
            activeAgLabel.textContent = uuid || getUUID();
        }
    }

    function createModalDOM() {
        const tenant = getTenant();
        const okapiHost = getOkapiHost();
        const token = getToken();
        const isTestServer = window.location.hostname.includes('test') || window.location.hostname.includes('stage') || okapiHost.includes('test');

        modalBackdrop = document.createElement('div');
        modalBackdrop.id = 'batch-modal-backdrop';
        modalBackdrop.innerHTML = \`
            <div id="batch-modal">
                <div class="batch-modal-header">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:16px; font-weight:bold; color:#0f172a;">Batch Load Agreement Lines</span>
                        <span class="\${isTestServer ? 'badge-ok' : 'badge-warn'} conn-badge">
                            \${isTestServer ? '🧪 Test / Staging Server' : '⚠️ Production Server'}
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
                        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
                            <span style="font-size:24px;">📄</span>
                            <div style="font-weight:600; font-size:13px; color:#334155;">
                                Drag &amp; Drop your eHoldings Export CSV here
                            </div>
                            <div style="font-size:11px; color:#64748b;">
                                or <label for="batch-file-input" style="color:#2563eb; cursor:pointer; text-decoration:underline;">browse files</label> on your computer
                            </div>
                            <input type="file" id="batch-file-input" accept=".csv" style="display:none;" />
                        </div>
                    </div>

                    <!-- Package Info Banner (when CSV loaded) -->
                    <div id="batch-pkg-banner" style="display:none; padding:10px 14px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; font-size:12px;"></div>

                    <!-- Bulk Assignment Controls -->
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; background:#ffffff; padding:12px 14px; border:1px solid #e2e8f0; border-radius:6px;">
                        <div>
                            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:4px;">
                                Target Agreement UUID
                            </label>
                            <div style="display:flex; gap:6px;">
                                <input type="text" id="batch-input-agreement" style="flex:1; padding:6px 8px; font-size:12px; font-family:monospace; border:1px solid #cbd5e1; border-radius:4px;" />
                                <button id="batch-btn-apply-agreement" class="btn-action-secondary" style="padding:6px 10px; font-size:11px; white-space:nowrap;">
                                    Apply to All
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style="display:block; font-size:11px; font-weight:600; color:#475569; margin-bottom:4px;">
                                Quick PO Line HRID Assigner (e.g. 10045-1 or 10045-)
                            </label>
                            <div style="display:flex; gap:6px;">
                                <input type="text" id="batch-input-poline" placeholder="e.g. 10045-1 or 10045- (HRID)" style="flex:1; padding:6px 8px; font-size:12px; font-family:monospace; border:1px solid #cbd5e1; border-radius:4px;" />
                                <button id="batch-btn-apply-poline" class="btn-action-secondary" style="padding:6px 10px; font-size:11px; white-space:nowrap;">
                                    Assign All
                                </button>
                            </div>
                            <div style="font-size:10px; color:#64748b; margin-top:3px;">
                                Enter Order Line HRID. The script resolves HRIDs to UUIDs via <code style="font-size:10px;">/orders/order-lines?limit=1000&amp;query=poLineNumber=="..."</code>
                            </div>
                        </div>
                    </div>

                    <!-- Records Table -->
                    <div>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-weight:600; font-size:13px; color:#334155;">
                                Agreement Lines Preview (<span id="batch-count-display">0</span> records)
                            </span>
                            <span style="font-size:11px; color:#64748b;">
                                Input Order Line HRID (e.g. 10045-1). Agreement lines require UUIDs, which are looked up automatically.
                            </span>
                        </div>
                        <div class="batch-table-wrap">
                            <table class="batch-table">
                                <thead>
                                    <tr>
                                        <th style="width:36px;">#</th>
                                        <th>Title Name</th>
                                        <th style="width:160px;">KBID Reference</th>
                                        <th style="width:200px;">PO Line HRID → UUID</th>
                                        <th style="width:190px;">Agreement UUID</th>
                                        <th style="width:100px; text-align:center;">Status</th>
                                    </tr>
                                </thead>
                                <tbody id="batch-table-body">
                                    <tr>
                                        <td colspan="6" style="text-align:center; padding:28px; color:#94a3b8;">
                                            No eHoldings CSV loaded. Drop your export CSV above.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- Live Progress & Log -->
                    <div id="batch-progress-box" style="display:none; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; font-size:12px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-weight:600;">
                            <span id="batch-progress-text">Processing...</span>
                            <span id="batch-progress-pct">0%</span>
                        </div>
                        <div style="width:100%; height:6px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
                            <div id="batch-progress-bar" style="width:0%; height:100%; background:#2563eb; transition:width 0.15s ease;"></div>
                        </div>
                    </div>
                </div>

                <div class="batch-modal-footer">
                    <div id="batch-footer-status" style="font-size:12px; color:#64748b;">
                        Ready to import
                    </div>
                    <div style="display:flex; gap:10px;">
                        <button id="batch-btn-validate" class="btn-action-secondary" disabled>
                            🔍 Resolve HRIDs → UUIDs
                        </button>
                        <button id="batch-btn-create" class="btn-action-success" disabled>
                            Create Agreement Lines
                        </button>
                    </div>
                </div>
            </div>
        \`;

        document.body.appendChild(modalBackdrop);

        // Event bindings
        document.getElementById('batch-modal-close').onclick = () => {
            modalBackdrop.style.display = 'none';
        };
        modalBackdrop.onclick = (e) => {
            if (e.target === modalBackdrop) modalBackdrop.style.display = 'none';
        };

        // File input & drag drop
        const fileInput = document.getElementById('batch-file-input');
        const dropzone = document.getElementById('batch-dropzone');
        dropzone.onclick = () => fileInput.click();
        dropzone.ondragover = (e) => { e.preventDefault(); dropzone.classList.add('dragover'); };
        dropzone.ondragleave = () => dropzone.classList.remove('dragover');
        dropzone.ondrop = (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
        };
        fileInput.onchange = (e) => {
            if (e.target.files?.[0]) processFile(e.target.files[0]);
        };

        // Batch buttons
        document.getElementById('batch-btn-apply-agreement').onclick = () => {
            const val = (document.getElementById('batch-input-agreement').value || '').trim();
            if (!val) return;
            parsedData.forEach(item => { item.agreementUuid = val; });
            renderTable();
        };

        document.getElementById('batch-btn-apply-poline').onclick = () => {
            const prefix = (document.getElementById('batch-input-poline').value || '').trim();
            if (!prefix) return;
            parsedData.forEach((item, idx) => {
                // If ends with dash and looks like sequential prefix
                if (prefix.endsWith('-') && !prefix.includes('0000')) {
                    item.poLine = prefix + (idx + 1);
                } else {
                    item.poLine = prefix;
                }
            });
            renderTable();
        };

        // Live connection test button
        document.getElementById('batch-btn-test-conn').onclick = testConnection;

        // Action buttons
        document.getElementById('batch-btn-validate').onclick = validatePOLines;
        document.getElementById('batch-btn-create').onclick = createAgreementLines;
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
            await makeRequest(\`\${host}/orders/order-lines?limit=1\`, tenant);
            resBox.className = 'badge-ok';
            resBox.innerHTML = \`
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>🟢 <strong>Connection active:</strong> Successfully communicated with FOLIO Okapi (HTTP 200 OK). Session token is valid.</span>
                    <button onclick="document.getElementById('batch-conn-result').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:16px; color:#166534; font-weight:bold; padding:0 4px;" title="Dismiss">&times;</button>
                </div>
            \`;
        } catch (err) {
            resBox.className = 'badge-err';
            resBox.innerHTML = \`
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>🔴 <strong>Connection failed:</strong> \${escapeHtml(err.message || 'Network error')} (Please confirm you are logged in to FOLIO)</span>
                    <button onclick="document.getElementById('batch-conn-result').style.display='none'" style="background:none; border:none; cursor:pointer; font-size:16px; color:#991b1b; font-weight:bold; padding:0 4px;" title="Dismiss">&times;</button>
                </div>
            \`;
        }
    }

    function processFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const parsed = parseCSVContent(text);
            packageInfo = parsed.packageInfo;
            parsedData = parsed.titles;

            // Update UI
            const banner = document.getElementById('batch-pkg-banner');
            if (packageInfo) {
                banner.style.display = 'block';
                banner.innerHTML = \`
                    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                        <span><strong>Package:</strong> \${escapeHtml(packageInfo.packageName)} (<code>\${escapeHtml(packageInfo.packageId)}</code>)</span>
                        <span><strong>Provider:</strong> \${escapeHtml(packageInfo.providerName)}</span>
                        <span><strong>Titles Found:</strong> \${parsedData.length}</span>
                        <span><strong>KBID Formula:</strong> <code>\${escapeHtml(packageInfo.packageId)}-&lt;TitleID&gt;</code></span>
                    </div>
                \`;
            } else {
                banner.style.display = 'none';
            }

            renderTable();

            document.getElementById('batch-btn-validate').disabled = parsedData.length === 0;
            document.getElementById('batch-btn-create').disabled = parsedData.length === 0;
            document.getElementById('batch-footer-status').textContent = \`Loaded \${parsedData.length} titles from CSV\`;
        };
        reader.readAsText(file);
    }

    function parseCSVContent(text) {
        const rows = [];
        let currentRow = [];
        let cur = '';
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            const next = text[i + 1];
            if (c === '"') {
                if (inQuotes && next === '"') { cur += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (c === ',' && !inQuotes) {
                currentRow.push(cur.trim());
                cur = '';
            } else if ((c === '\\r' || c === '\\n') && !inQuotes) {
                if (c === '\\r' && next === '\\n') i++;
                currentRow.push(cur.trim());
                if (currentRow.some(col => col.length > 0)) rows.push(currentRow);
                currentRow = [];
                cur = '';
            } else {
                cur += c;
            }
        }
        if (cur || currentRow.length > 0) {
            currentRow.push(cur.trim());
            if (currentRow.some(col => col.length > 0)) rows.push(currentRow);
        }

        if (!rows.length) return { packageInfo: null, titles: [] };

        let packageInfo = null;
        let titleHeaderIdx = 0;

        // Check for package header row
        if (rows[0].some(col => col.toLowerCase().includes('package'))) {
            const pHeaders = rows[0];
            const pData = rows[1] || [];
            const getVal = (keyword) => {
                const idx = pHeaders.findIndex(h => h.toLowerCase().includes(keyword));
                return idx >= 0 && pData[idx] ? pData[idx] : '';
            };
            packageInfo = {
                packageName: getVal('package name'),
                packageId: getVal('package id'),
                providerName: getVal('provider name'),
                providerId: getVal('provider id')
            };

            for (let r = 2; r < Math.min(rows.length, 6); r++) {
                if (rows[r].some(col => col.toLowerCase().includes('title name') || col.toLowerCase() === 'title')) {
                    titleHeaderIdx = r;
                    break;
                }
            }
        }

        const tHeaders = rows[titleHeaderIdx];
        const findCol = (terms) => tHeaders.findIndex(h => terms.some(t => h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(t)));

        const titleIdx = findCol(['titlename', 'title']);
        const idIdx = findCol(['titleid', 'id']);
        const poLineIdx = findCol(['poline', 'polinenumber', 'purchaseorderline', 'orderline']);
        const agreementIdx = findCol(['agreementuuid', 'agreementid', 'agreement']);
        const refIdx = findCol(['ekbreference', 'reference', 'ekbtitleid', 'packagetitleid']);

        const activeAgreement = getUUID();

        const titles = [];
        for (let r = titleHeaderIdx + 1; r < rows.length; r++) {
            const row = rows[r];
            if (!row || !row[titleIdx]) continue;
            const titleId = idIdx >= 0 ? row[idIdx] : '';

            // Compute full EBSCO KBID reference triplet (e.g. 36-434-8776980)
            let reference = refIdx >= 0 ? (row[refIdx] || '').trim() : '';
            if (!reference && titleId) {
                if (titleId.split('-').length === 3) {
                    reference = titleId;
                } else if (packageInfo && packageInfo.packageId) {
                    const pkgId = packageInfo.packageId.trim();
                    if (pkgId.indexOf('-') !== -1) {
                        reference = pkgId + '-' + titleId;
                    } else if (packageInfo.providerId && packageInfo.providerId.trim()) {
                        reference = packageInfo.providerId.trim() + '-' + pkgId + '-' + titleId;
                    } else {
                        reference = pkgId + '-' + titleId;
                    }
                } else {
                    reference = titleId;
                }
            }

            const rowAgreement = agreementIdx >= 0 ? (row[agreementIdx] || '').trim() : '';

            titles.push({
                rowIdx: r,
                titleName: row[titleIdx],
                titleId: titleId,
                reference: reference,
                poLine: poLineIdx >= 0 ? (row[poLineIdx] || '').trim() : '',
                agreementUuid: (rowAgreement && rowAgreement !== '-' && rowAgreement !== 'none') ? rowAgreement : activeAgreement,
                status: 'Pending',
                resolvedPoLineUuid: null,
                resultId: null
            });
        }

        return { packageInfo, titles };
    }

    function renderTable() {
        const tbody = document.getElementById('batch-table-body');
        document.getElementById('batch-count-display').textContent = parsedData.length;

        if (!parsedData.length) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:28px; color:#94a3b8;">No records loaded</td></tr>';
            return;
        }

        tbody.innerHTML = parsedData.slice(0, 150).map((t, idx) => \`
            <tr>
                <td style="color:#94a3b8; font-family:monospace; font-size:11px;">\${idx + 1}</td>
                <td style="max-width:240px; font-weight:500;">
                    <div>\${escapeHtml(t.titleName)}</div>
                    <div style="font-size:10px; color:#64748b;">ID: \${escapeHtml(t.titleId || '')}</div>
                </td>
                <td>
                    <input type="text" value="\${escapeHtml(t.reference || t.titleId || '')}" data-idx="\${idx}" class="batch-ref-input" style="width:140px; font-family:monospace; font-size:11px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:3px;" />
                </td>
                <td>
                    <input type="text" value="\${escapeHtml(t.poLine)}" data-idx="\${idx}" class="batch-pol-input" placeholder="HRID e.g. 10045-1" style="width:160px; font-family:monospace; font-size:11px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:3px;" />
                    \${t.resolvedPoLineUuid ? \`
                        <div style="font-size:10px; font-family:monospace; color:#15803d; margin-top:2px;" title="Resolved UUID: \${escapeHtml(t.resolvedPoLineUuid)}">
                            ✓ UUID: \${escapeHtml(t.resolvedPoLineUuid.slice(0, 16))}...
                        </div>\` : (t.poLine && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t.poLine) ? \`
                        <div style="font-size:10px; color:#d97706; margin-top:2px;">
                            HRID pending lookup
                        </div>\` : '')}
                </td>
                <td>
                    <input type="text" value="\${escapeHtml(t.agreementUuid)}" data-idx="\${idx}" class="batch-ag-input" style="width:170px; font-family:monospace; font-size:11px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:3px;" />
                </td>
                <td style="text-align:center;">
                    <span class="conn-badge \${getStatusClass(t.status)}">\${t.status}</span>
                </td>
            </tr>
        \`).join('') + (parsedData.length > 150 ? \`<tr><td colspan="6" style="text-align:center; padding:8px; color:#64748b;">+ \${parsedData.length - 150} more titles</td></tr>\` : '');

        // Change listeners
        tbody.querySelectorAll('.batch-ref-input').forEach(input => {
            input.onchange = (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                parsedData[i].reference = e.target.value.trim();
            };
        });
        tbody.querySelectorAll('.batch-pol-input').forEach(input => {
            input.onchange = (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                const val = e.target.value.trim();
                parsedData[i].poLine = val;
                parsedData[i].resolvedPoLineUuid = null;
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(val)) {
                    parsedData[i].resolvedPoLineUuid = val;
                    parsedData[i].status = parsedData[i].agreementUuid ? 'Ready' : 'Pending';
                } else {
                    parsedData[i].status = val ? 'HRID Needs Lookup' : 'Pending';
                }
                renderTable();
            };
        });
        tbody.querySelectorAll('.batch-ag-input').forEach(input => {
            input.onchange = (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                parsedData[i].agreementUuid = e.target.value.trim();
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

        // Separate items that need lookup vs already UUIDs
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
            const chunkSize = 25; // Chunked queries to avoid URI length issues
            for (let i = 0; i < needsLookup.length; i += chunkSize) {
                const chunk = needsLookup.slice(i, i + chunkSize);
                const queryParts = chunk.map(c => \`poLineNumber=="\${c.poLine.trim()}"\`);
                const query = encodeURIComponent(queryParts.join(' or '));

                try {
                    const orderRes = await makeRequest(\`\${host}/orders/order-lines?limit=1000&query=\${query}\`, tenant);
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
        const footerStatus = document.getElementById('batch-footer-status');
        const progressBox = document.getElementById('batch-progress-box');
        const progressBar = document.getElementById('batch-progress-bar');
        const progressPct = document.getElementById('batch-progress-pct');
        const progressText = document.getElementById('batch-progress-text');
        const createBtn = document.getElementById('batch-btn-create');

        createBtn.disabled = true;
        progressBox.style.display = 'block';

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        // Auto-resolve any pending HRIDs if user didn't click validate first
        const hasPendingHrids = parsedData.some(item => item.poLine && !item.resolvedPoLineUuid && !uuidRegex.test(item.poLine));
        if (hasPendingHrids) {
            footerStatus.textContent = 'Auto-resolving Order Line HRIDs to UUIDs before creating agreement lines...';
            await validatePOLines();
        }

        let success = 0;
        let errors = 0;

        for (let i = 0; i < parsedData.length; i++) {
            const item = parsedData[i];
            const targetPoLine = item.resolvedPoLineUuid || (uuidRegex.test(item.poLine) ? item.poLine : null);

            const pct = Math.round(((i + 1) / parsedData.length) * 100);
            progressBar.style.width = pct + '%';
            progressPct.textContent = pct + '%';
            progressText.textContent = \`Processing [\${i + 1}/\${parsedData.length}]: \${item.titleName}...\`;

            if (!targetPoLine) {
                item.status = 'Missing UUID (Resolve HRID)';
                errors++;
                renderTable();
                continue;
            }

            if (!item.agreementUuid) {
                item.status = 'Skipped (No Agreement)';
                errors++;
                renderTable();
                continue;
            }

            try {
                // Verified mod-agreements external entitlement payload storing PO Line UUID
                const payload = {
                    type: 'external',
                    authority: 'ekb-title',
                    reference: item.reference || item.titleId,
                    poLines: [
                        {
                            _delete: false,
                            poLineId: targetPoLine
                        }
                    ],
                    owner: item.agreementUuid
                };

                const res = await makeRequest(\`\${host}/erm/entitlements\`, tenant, 'POST', payload);
                item.status = 'Success';
                item.resultId = res.id || 'created';
                success++;
            } catch (err) {
                item.status = 'Error';
                errors++;
            }

            renderTable();
        }

        createBtn.disabled = false;
        footerStatus.textContent = \`Finished! \${success} created successfully, \${errors} errors.\`;
        progressText.textContent = \`Completed: \${success} created, \${errors} errors.\`;
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
    }
})();
`;
}
