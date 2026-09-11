import React, { useState } from 'react';
import { Download, Copy, Check, ExternalLink, Settings2, ShieldCheck, Terminal, AlertCircle, Server, CheckCircle2, Eye, RefreshCw, Github, BookOpen, FileCode } from 'lucide-react';
import { FolioConfig } from '../types/folio';

interface UserscriptTabProps {
  config: FolioConfig;
  setConfig: React.Dispatch<React.SetStateAction<FolioConfig>>;
  userscriptCode: string;
  onDownloadScript: () => void;
}

export const UserscriptTab: React.FC<UserscriptTabProps> = ({
  config,
  setConfig,
  userscriptCode,
  onDownloadScript
}) => {
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [previewConnState, setPreviewConnState] = useState<'idle' | 'testing' | 'success'>('idle');
  const [customInstDomain, setCustomInstDomain] = useState('');
  const [customTenant, setCustomTenant] = useState('');

  const handleSimulateTestConnection = () => {
    setPreviewConnState('testing');
    setTimeout(() => {
      setPreviewConnState('success');
    }, 650);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(userscriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTestServer = config.okapiBaseUrl.includes('test') || config.matchDomainPattern.includes('test');

  const switchToTestServer = () => {
    setConfig({
      ...config,
      okapiBaseUrl: 'https://folio-test-okapi.institution.edu',
      matchDomainPattern: '*://folio-test.institution.edu/*',
      tenant: 'institution_test'
    });
  };

  const switchToProductionServer = () => {
    setConfig({
      ...config,
      okapiBaseUrl: 'https://folio-okapi.institution.edu',
      matchDomainPattern: '*://folio.institution.edu/*',
      tenant: 'institution_prod'
    });
  };

  const switchToLehighTestServer = () => {
    setConfig({
      ...config,
      okapiBaseUrl: 'https://lehigh-test-okapi.folio.indexdata.com',
      matchDomainPattern: '*://lehigh-test.folio.indexdata.com/*',
      tenant: 'lu'
    });
  };

  const applyCustomInstitution = () => {
    if (!customInstDomain) return;
    const cleanDomain = customInstDomain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const cleanTenant = customTenant.trim() || 'institution';
    
    // Index Data style vs standard subdomains
    if (cleanDomain.includes('.folio.indexdata.com')) {
      const tenantPrefix = cleanDomain.split('.')[0].replace(/-okapi$/, '');
      setConfig({
        ...config,
        matchDomainPattern: `*://${tenantPrefix}.folio.indexdata.com/*`,
        okapiBaseUrl: `https://${tenantPrefix}-okapi.folio.indexdata.com`,
        tenant: cleanTenant
      });
    } else {
      setConfig({
        ...config,
        matchDomainPattern: `*://${cleanDomain}/*`,
        okapiBaseUrl: `https://okapi.${cleanDomain}`,
        tenant: cleanTenant
      });
    }
  };

  const handleDownloadStandalone = () => {
    fetch('/folio-agreement-line-batch-loader.user.js')
      .then((res) => res.text())
      .then((text) => {
        const blob = new Blob([text], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'folio-agreement-line-batch-loader.user.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        // Fallback to downloading current generated code
        onDownloadScript();
      });
  };

  const handleDownloadReadme = () => {
    fetch('/README.md')
      .then((res) => res.text())
      .then((text) => {
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'README.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch((err) => console.error('Error downloading README', err));
  };

  return (
    <div className="space-y-6">
      {/* Hero / Overview Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-lg">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center space-x-1.5 bg-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-500/30 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Client-Side FOLIO Userscript</span>
            </span>
            <span className={`inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
              isTestServer
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}>
              <Server className="w-3 h-3" />
              <span>{isTestServer ? 'Target: Test / Staging Environment (Safe for POST)' : 'Target: Production Environment'}</span>
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight mb-2">
            FOLIO Agreement Line Batch Loader
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            Built to work seamlessly alongside your existing <strong className="text-white">FOLIO Agreement Line CSV Exporter</strong> userscript. Injects a native <em>"Batch load agreement lines"</em> action into the Agreement Lines section menu and safely automates creating external entitlements in <code className="text-blue-300 bg-blue-950/80 px-1 py-0.5 rounded">mod-agreements</code> (<code className="text-blue-300 bg-blue-950/80 px-1 py-0.5 rounded">POST /erm/entitlements</code>) linked to PO lines.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              id="btn-copy-userscript"
              onClick={handleCopy}
              className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Userscript Code'}</span>
            </button>

            <button
              id="btn-download-userscript-main"
              onClick={onDownloadScript}
              className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg border border-slate-700 shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download Configured Script</span>
            </button>

            <button
              id="btn-toggle-config"
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-sm font-medium px-3.5 py-2 rounded-lg border border-slate-700/60 transition-colors"
            >
              <Settings2 className="w-4 h-4" />
              <span>{showConfig ? 'Hide Settings' : 'Script Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Target Server Switcher Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${isTestServer ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-800">Current Target Server:</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                isTestServer ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isTestServer ? '🧪 Test / Staging Environment' : '⚠️ Production Environment'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Okapi URL: <code className="font-mono font-semibold text-slate-700">{config.okapiBaseUrl}</code> • Tenant: <code className="font-mono font-semibold text-blue-600">{config.tenant}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={switchToTestServer}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
              isTestServer && !config.okapiBaseUrl.includes('lehigh')
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Switch to generic test / staging environment"
          >
            🧪 Test / Sandbox
          </button>
          <button
            onClick={switchToProductionServer}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
              !isTestServer
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Switch to generic production environment"
          >
            ⚠️ Production
          </button>
          <button
            onClick={switchToLehighTestServer}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-all ${
              config.okapiBaseUrl.includes('lehigh-test')
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
            title="Preset for Lehigh Test server"
          >
            🏛️ Lehigh Preset
          </button>
        </div>
      </div>

      {/* Script Configuration Drawer */}
      {showConfig && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <Settings2 className="w-4 h-4 text-slate-600" />
              <h3 className="font-semibold text-slate-800 text-sm">Userscript Customization</h3>
            </div>
            <span className="text-xs text-slate-500">Updates the generated script code dynamically</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target FOLIO Match Pattern (<code className="font-mono text-slate-600">@match</code>)
              </label>
              <input
                type="text"
                value={config.matchDomainPattern}
                onChange={(e) => setConfig({ ...config, matchDomainPattern: e.target.value })}
                placeholder="*://folio-test.institution.edu/*"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Domain pattern where Tampermonkey should inject the batch loader button.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Agreement UUID (Optional fallback)
              </label>
              <input
                type="text"
                value={config.defaultAgreementUuid}
                onChange={(e) => setConfig({ ...config, defaultAgreementUuid: e.target.value })}
                placeholder="e.g. 1af4efc0-c4d4-4134-b47a-765759bbec88"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Pre-populates the batch agreement field when opened outside an agreement URL.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                FOLIO Tenant ID (<code className="font-mono text-slate-600">x-okapi-tenant</code>)
              </label>
              <input
                type="text"
                value={config.tenant || 'institution_test'}
                onChange={(e) => setConfig({ ...config, tenant: e.target.value })}
                placeholder="institution_test"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Your institution's FOLIO tenant code (e.g. <code className="font-mono font-bold text-blue-700">diku</code>, <code className="font-mono font-bold text-blue-700">main</code>, <code className="font-mono font-bold text-blue-700">lu</code>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Okapi Base Endpoint (<code className="font-mono text-slate-600">@connect</code>)
              </label>
              <input
                type="text"
                value={config.okapiBaseUrl}
                onChange={(e) => setConfig({ ...config, okapiBaseUrl: e.target.value })}
                placeholder="https://folio-test-okapi.institution.edu"
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Target Okapi server for PO lines query and agreement entitlements creation.
              </p>
            </div>
          </div>

          {/* Quick Institution Adapter */}
          <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-xl">
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <span>🏛️ Adapt for Your Institution in One Click</span>
            </h4>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={customInstDomain}
                onChange={(e) => setCustomInstDomain(e.target.value)}
                placeholder="e.g. folio.university.edu or mytenant.folio.indexdata.com"
                className="w-full sm:flex-1 text-xs font-mono px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={customTenant}
                onChange={(e) => setCustomTenant(e.target.value)}
                placeholder="Tenant ID (e.g. diku)"
                className="w-full sm:w-36 text-xs font-mono px-3 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={applyCustomInstitution}
                disabled={!customInstDomain}
                className="w-full sm:w-auto px-3.5 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 transition-colors shrink-0"
              >
                Apply to Script
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dual Script Actions Menu Integration Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Shared FOLIO Actions Menu Integration
            </h2>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded font-mono">
            Harmonious Multi-Script Injection
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Both your production <strong>FOLIO Agreement Line CSV Exporter</strong> script and this <strong>Batch Loader</strong> script observe the same Actions dropdown in the Agreement Lines section. They render as clean, distinct menu items without collision:
        </p>

        <div className="p-4 bg-slate-900 text-slate-200 rounded-xl border border-slate-800 text-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="bg-slate-800/90 border border-slate-700 px-3 py-2 rounded-lg text-slate-300 font-medium">
              <span>Agreement lines accordion</span>
              <span className="ml-2 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">Actions ▾</span>
            </div>

            <span className="text-slate-500 font-bold hidden md:inline">→</span>

            <div className="bg-white text-slate-900 border border-slate-300 rounded-lg shadow-lg py-1.5 px-1 min-w-[280px] text-xs font-medium space-y-1">
              <div className="px-3 py-1.5 text-slate-700 hover:bg-slate-100 rounded flex items-center gap-2">
                <span className="text-slate-400 font-bold">+</span>
                <span>New agreement line</span>
                <span className="text-[10px] text-slate-400 ml-auto">(Native FOLIO)</span>
              </div>

              {/* User's Reference Script Option */}
              <div className="px-3 py-1.5 text-slate-800 bg-slate-50 border border-slate-200/80 rounded flex items-center gap-2">
                <span>📊</span>
                <span>Export Agreement Lines to CSV</span>
                <span className="text-[9px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono ml-auto">Your Script (v1.24)</span>
              </div>

              {/* Our Batch Loader Script Option */}
              <div className="px-3 py-1.5 text-blue-900 bg-blue-50 border border-blue-200 rounded flex items-center gap-2 font-semibold">
                <span>📥</span>
                <span>Batch load agreement lines</span>
                <span className="text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-mono ml-auto">This Script (v1.30)</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 leading-relaxed max-w-sm space-y-1">
              <div>
                <strong className="text-slate-200">Independent selectors:</strong>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Exporter: <code className="font-mono text-slate-300">#custom-csv-export-option</code></li>
                <li>Batch Loader: <code className="font-mono text-blue-300">#custom-batch-loader-option</code></li>
                <li>Modal Backdrop: <code className="font-mono text-blue-300">#batch-modal-backdrop</code></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Refined Modal Dialog Interface Preview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Refined Modal Dialog Interface Preview
              </h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                Clean Layout
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              The detailed API credentials box was removed from the top of the modal. The <strong className="text-slate-700">Test Connection</strong> button is now placed directly in the header for quick validation without visual clutter.
            </p>
          </div>
        </div>

        {/* Modal Simulator Frame */}
        <div className="bg-slate-900/10 p-3 sm:p-5 rounded-xl border border-slate-200 flex justify-center">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Batch Load Agreement Lines</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  isTestServer ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isTestServer ? '🧪 Lehigh Test Server' : '⚠️ Lehigh Production Server'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSimulateTestConnection}
                  disabled={previewConnState === 'testing'}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Click to simulate test connection"
                >
                  {previewConnState === 'testing' ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                  ) : (
                    <span className="text-amber-500">⚡</span>
                  )}
                  <span>{previewConnState === 'testing' ? 'Testing...' : 'Test Connection'}</span>
                </button>
                <span className="text-slate-400 font-bold text-lg leading-none cursor-default ml-1">&times;</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 bg-slate-50/60 space-y-3">
              {/* Dynamic Connection Result Banner */}
              {previewConnState === 'success' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-md text-[11px] flex items-center justify-between">
                  <span>🟢 <strong>Connection active:</strong> Successfully communicated with FOLIO Okapi (HTTP 200 OK). Session token is valid.</span>
                  <button
                    type="button"
                    onClick={() => setPreviewConnState('idle')}
                    className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs"
                    title="Dismiss"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* CSV Dropzone */}
              <div className="p-5 border-2 border-dashed border-slate-300 rounded-lg bg-white text-center">
                <div className="text-xl mb-1">📄</div>
                <div className="font-semibold text-slate-800 text-xs">Drag &amp; Drop your eHoldings Export CSV here</div>
                <div className="text-[11px] text-slate-500 mt-0.5">or <span className="text-blue-600 underline">browse files</span> on your computer</div>
              </div>

              {/* Bulk Assignment Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-lg">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Target Agreement UUID</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={config.defaultAgreementUuid}
                      className="flex-1 font-mono text-[11px] px-2 py-1 bg-slate-50 border border-slate-300 rounded"
                    />
                    <button type="button" className="px-2 py-1 text-[10px] font-semibold bg-slate-100 border border-slate-300 rounded text-slate-700">Apply All</button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quick PO Line HRID Assigner</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value="10045-1"
                      className="flex-1 font-mono text-[11px] px-2 py-1 bg-slate-50 border border-slate-300 rounded"
                    />
                    <button type="button" className="px-2 py-1 text-[10px] font-semibold bg-slate-100 border border-slate-300 rounded text-slate-700">Assign All</button>
                  </div>
                </div>
              </div>

              {/* Table Preview Snippet */}
              <div className="border border-slate-200 rounded-md bg-white overflow-hidden text-[11px]">
                <div className="px-3 py-2 bg-slate-100/80 border-b border-slate-200 flex justify-between font-semibold text-slate-700">
                  <span>Agreement Lines Preview (0 records)</span>
                  <span className="text-slate-500 font-normal">HRID → UUID Auto-Lookup</span>
                </div>
                <div className="p-4 text-slate-400 text-center">
                  Drop your eHoldings CSV above to populate records and link order lines.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Ready to import</span>
              <div className="flex gap-2">
                <button disabled className="px-3 py-1 text-[11px] font-semibold bg-slate-100 text-slate-400 rounded border border-slate-200 cursor-not-allowed">🔍 Resolve HRIDs → UUIDs</button>
                <button disabled className="px-3 py-1 text-[11px] font-semibold bg-emerald-600/50 text-white rounded cursor-not-allowed">Create Agreement Lines</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Quick Start Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-blue-600" />
          <span>How to Install &amp; Run in Tampermonkey</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
                1
              </span>
              <h3 className="font-semibold text-xs text-slate-800 mb-1">Open Tampermonkey</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Open <a href="https://www.tampermonkey.net/" target="_blank" rel="noreferrer" className="text-blue-600 underline inline-flex items-center">Tampermonkey <ExternalLink className="w-2.5 h-2.5 ml-0.5" /></a> dashboard in your browser.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
                2
              </span>
              <h3 className="font-semibold text-xs text-slate-800 mb-1">Create New Script</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click <strong>+ (Add a new script)</strong>, paste the script code below, and press <kbd className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">Ctrl+S</kbd> / <kbd className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">Cmd+S</kbd>.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
                3
              </span>
              <h3 className="font-semibold text-xs text-slate-800 mb-1">Open FOLIO Agreement</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Log into your institution's FOLIO instance and navigate to any agreement in the Agreements app.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-2">
                4
              </span>
              <h3 className="font-semibold text-xs text-slate-800 mb-1">Batch Load &amp; Link</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Under <strong>Agreement lines</strong>, open <strong>Actions → batch load agreement lines</strong>. Drop your CSV and create the lines!
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start space-x-2 bg-blue-50 border border-blue-200/80 text-blue-900 rounded-lg p-3 text-xs">
          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong>Safety &amp; Isolation Guarantee:</strong> The script directs PO line queries and agreement line creation requests exclusively to the configured Okapi endpoint (<code className="font-mono bg-blue-100 px-1 py-0.5 rounded font-semibold text-blue-800">{config.okapiBaseUrl}</code>). All network calls happen strictly client-side within the browser using active session tokens. The in-FOLIO modal also includes a live "⚡ Test Connection" button to verify communication with Okapi before dispatching any creations.
          </div>
        </div>
      </div>

      {/* GitHub Repository Packaging & Institutional Distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-900 text-white">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                GitHub Repository &amp; Distribution Package
              </h2>
              <p className="text-xs text-slate-500">
                Redacted, institution-agnostic files ready to commit or share with other FOLIO libraries
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadStandalone}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-2xs"
              title="Download standalone redacted userscript file"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>folio-agreement-line-batch-loader.user.js</span>
            </button>
            <button
              onClick={handleDownloadReadme}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 transition-colors shadow-2xs"
              title="Download comprehensive README.md file"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>README.md</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>1. Redacted &amp; Generic Defaults</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              All institution-specific hostnames, tenant codes (<code className="font-mono text-slate-800">lu</code>), and test UUIDs are removed from the root userscript and replaced with clean placeholders and dynamic detection.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>2. Multi-Tenant Auto-Discovery</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              The userscript automatically scrapes the active agreement UUID from the URL and resolves Okapi tokens from session storage, localStorage, or cookies across any institution.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              <span>3. Self-Documenting README</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Includes comprehensive instructions for any librarian or systems admin to adapt the <code className="font-mono text-slate-800">@match</code>, <code className="font-mono text-slate-800">@connect</code>, and fallback <code className="font-mono text-slate-800">INSTITUTION_CONFIG</code> parameters.
            </p>
          </div>
        </div>
      </div>

      {/* Userscript Code Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
            </div>
            <span className="text-xs text-slate-400 font-mono pl-2">folio-agreement-batch-loader.user.js</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono">v1.30</span>
          </div>

          <button
            onClick={handleCopy}
            className="text-xs text-slate-300 hover:text-white flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="max-h-[500px] overflow-y-auto p-4 font-mono text-xs text-slate-300 leading-relaxed select-all">
          <pre>{userscriptCode}</pre>
        </div>
      </div>
    </div>
  );
};
