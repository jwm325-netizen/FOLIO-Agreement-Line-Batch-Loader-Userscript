import React, { useState } from 'react';
import { Play, RotateCcw, CheckCircle, CheckCircle2, XCircle, Code, Copy, Check, Server, Terminal, ShieldAlert, Search, RefreshCw } from 'lucide-react';
import { EHoldingsTitleRow, FolioConfig } from '../types/folio';

interface ApiTesterTabProps {
  titles: EHoldingsTitleRow[];
  setTitles: React.Dispatch<React.SetStateAction<EHoldingsTitleRow[]>>;
  config: FolioConfig;
  setConfig: React.Dispatch<React.SetStateAction<FolioConfig>>;
}

export const ApiTesterTab: React.FC<ApiTesterTabProps> = ({
  titles,
  setTitles,
  config,
  setConfig
}) => {
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<Array<{ time: string; type: 'info' | 'success' | 'error' | 'request'; text: string; details?: any }>>([]);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Single test inputs - pre-populated with verified sample values
  const [testPoLineNum, setTestPoLineNum] = useState('10045-1');
  const [testAgreementUuid, setTestAgreementUuid] = useState('1af4efc0-c4d4-4134-b47a-765759bbec88');
  const [testReference, setTestReference] = useState('36-434-8776980');
  const [testAuthority, setTestAuthority] = useState('ekb-title');
  const [testType, setTestType] = useState('external');
  const [testTitleName, setTestTitleName] = useState('Abdominal Radiology');
  const [singleResult, setSingleResult] = useState<any>(null);

  // Dedicated Orders API Lookup Explorer State
  const [lookupInput, setLookupInput] = useState('10045-1');
  const [lookupMode, setLookupMode] = useState<'hridToUuid' | 'uuidToDetails'>('hridToUuid');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any>(null);

  const loadAbdominalRadiologyPayload = () => {
    setTestPoLineNum('10045-1');
    setTestAgreementUuid('1af4efc0-c4d4-4134-b47a-765759bbec88');
    setTestReference('36-434-8776980');
    setTestAuthority('ekb-title');
    setTestType('external');
    setTestTitleName('Abdominal Radiology');
    setConfig((prev) => ({
      ...prev,
      okapiBaseUrl: prev.okapiBaseUrl || 'https://folio-test-okapi.institution.edu',
      tenant: prev.tenant || 'institution_test'
    }));
    addLog('info', 'Loaded full KBID reference 36-434-8776980 (Abdominal Radiology) with HRID 10045-1.');
  };

  const loadVerifiedPayload2 = () => {
    setTestPoLineNum('10045-1');
    setTestAgreementUuid('1af4efc0-c4d4-4134-b47a-765759bbec88');
    setTestReference('36-434-797');
    setTestAuthority('ekb-title');
    setTestType('external');
    setTestTitleName('Accreditation and Quality Assurance');
    setConfig((prev) => ({
      ...prev,
      okapiBaseUrl: prev.okapiBaseUrl || 'https://folio-test-okapi.institution.edu',
      tenant: prev.tenant || 'institution_test'
    }));
    addLog('info', 'Loaded verified test request parameters (36-434-797) with HRID 10045-1.');
  };

  const addLog = (type: 'info' | 'success' | 'error' | 'request', text: string, details?: any) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ time, type, text, details }, ...prev.slice(0, 49)]);
  };

  // Dedicated Orders API Lookup Handler
  const handleRunOrderLineLookup = async () => {
    setLookupLoading(true);
    setLookupResult(null);

    const inputVal = lookupInput.trim();
    const query =
      lookupMode === 'hridToUuid'
        ? `poLineNumber=="${inputVal}"`
        : `id==(${inputVal})`;
    const fullUrl = `${config.okapiBaseUrl}/orders/order-lines?limit=1000&query=${encodeURIComponent(query)}`;

    addLog('request', `GET /orders/order-lines?limit=1000&query=${encodeURIComponent(query)}`);

    if (mode === 'sandbox') {
      await new Promise((r) => setTimeout(r, 300));
      const mockRecord = {
        id: lookupMode === 'uuidToDetails' ? inputVal : (inputVal === '10045-1' ? 'd34a2084-7413-4604-8aa2-52ef7549c939' : 'd34a2084-7413-4604-8aa2-52ef7549c939'),
        poLineNumber: lookupMode === 'hridToUuid' ? inputVal : '10045-1',
        titleOrPackage: 'Accreditation and Quality Assurance',
        acquisitionMethod: 'Purchase',
        orderFormat: 'Electronic Resource',
        purchaseOrderId: 'e43b1290-781a-45c1-90ef-872341902841',
        receiptStatus: 'Ongoing',
        rush: false,
        source: 'User'
      };

      const mockResponse = {
        poLines: [mockRecord],
        totalRecords: 1
      };

      setLookupResult(mockResponse);
      setLookupLoading(false);
      if (lookupMode === 'hridToUuid') {
        addLog('success', `[Orders API] Resolved HRID "${inputVal}" → UUID: ${mockRecord.id}`);
      } else {
        addLog('success', `[Orders API] Inspected UUID "${inputVal}" → HRID: ${mockRecord.poLineNumber}`);
      }
    } else {
      try {
        const res = await fetch(fullUrl, {
          headers: {
            'x-okapi-tenant': config.tenant,
            'x-okapi-token': config.authToken,
            'Accept': 'application/json'
          }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setLookupResult(data);
        setLookupLoading(false);
        addLog('success', `Retrieved ${data.poLines?.length || 0} order lines from FOLIO`);
      } catch (err: any) {
        setLookupLoading(false);
        addLog('error', `Order line lookup failed: ${err.message}`);
      }
    }
  };

  // Test Single PO Line & Entitlement Creation
  const handleRunSingleTest = async () => {
    addLog('info', `Testing single workflow for: "${testTitleName}" (Ref: ${testReference})`);
    setSingleResult(null);

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testPoLineNum);

    if (mode === 'sandbox') {
      const mockPoLineUuid = isUuid
        ? testPoLineNum
        : (testPoLineNum.trim() === '10045-1' ? 'd34a2084-7413-4604-8aa2-52ef7549c939' : 'd34a2084-7413-4604-8aa2-52ef7549c939');
      if (!isUuid) {
        addLog('request', `GET /orders/order-lines?limit=1000&query=poLineNumber=="${testPoLineNum}"`);
        addLog('success', `Resolved Order Line HRID "${testPoLineNum}" → UUID: ${mockPoLineUuid}`);
      }

      // Entitlement creation payload with verified external authority & resolved UUID
      const payload = {
        type: 'external',
        authority: testAuthority || 'ekb-title',
        reference: testReference || '36-434-797',
        poLines: [
          {
            _delete: false,
            poLineId: mockPoLineUuid
          }
        ],
        owner: testAgreementUuid
      };

      addLog('request', 'POST /erm/entitlements', payload);

      setTimeout(() => {
        const mockResponse = {
          id: `ent-${Math.random().toString(36).substring(2, 10)}`,
          type: 'external',
          authority: testAuthority || 'ekb-title',
          reference: testReference || '36-434-797',
          owner: {
            id: testAgreementUuid,
            name: 'Springer Nature License Agreement 2024'
          },
          description: testTitleName,
          poLines: [
            {
              id: `poline-link-${Date.now().toString().slice(-4)}`,
              _delete: false,
              poLineId: mockPoLineUuid
            }
          ],
          dateCreated: new Date().toISOString()
        };

        setSingleResult(mockResponse);
        addLog('success', `Created Agreement Line entitlement: ${mockResponse.id} (Linked to UUID: ${mockPoLineUuid})`, mockResponse);
      }, 400);
    } else {
      // Live mode
      try {
        let poLineId = testPoLineNum;
        if (!isUuid) {
          addLog('request', `[Live] Resolving Order Line HRID: ${testPoLineNum}`);
          const query = encodeURIComponent(`poLineNumber=="${testPoLineNum}"`);
          const poRes = await fetch(`${config.okapiBaseUrl}/orders/order-lines?limit=1000&query=${query}`, {
            headers: {
              'x-okapi-tenant': config.tenant,
              'x-okapi-token': config.authToken,
              'Accept': 'application/json'
            }
          });

          if (!poRes.ok) throw new Error(`PO Line lookup failed: HTTP ${poRes.status}`);
          const poData = await poRes.json();
          poLineId = poData.poLines?.[0]?.id;
          if (!poLineId) throw new Error(`No PO Line found for HRID "${testPoLineNum}"`);
          addLog('success', `[Live] Resolved HRID "${testPoLineNum}" → UUID: ${poLineId}`);
        }

        // Post entitlement with verified external eHoldings format
        const payload = {
          type: 'external',
          authority: testAuthority || 'ekb-title',
          reference: testReference || '36-434-797',
          poLines: [
            {
              _delete: false,
              poLineId: poLineId
            }
          ],
          owner: testAgreementUuid
        };

        addLog('request', '[Live] POST /erm/entitlements', payload);
        const entRes = await fetch(`${config.okapiBaseUrl}/erm/entitlements`, {
          method: 'POST',
          headers: {
            'x-okapi-tenant': config.tenant,
            'x-okapi-token': config.authToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!entRes.ok) throw new Error(`Agreement Line creation failed: HTTP ${entRes.status}`);
        const entData = await entRes.json();
        setSingleResult(entData);
        addLog('success', `[Live] Successfully created agreement line ${entData.id}`);
      } catch (err: any) {
        addLog('error', `[Live Error] ${err.message}`);
      }
    }
  };

  // Run Batch across all ready titles
  const handleRunBatch = async () => {
    const readyItems = titles.filter((t) => t.poLine && t.agreementUuid);
    if (readyItems.length === 0) {
      addLog('error', 'No ready titles with both PO Line and Agreement UUID to process.');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    addLog('info', `Starting batch creation for ${readyItems.length} records in ${mode.toUpperCase()} mode...`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      const percent = Math.round(((i + 1) / readyItems.length) * 100);
      setProgress(percent);

      if (mode === 'sandbox') {
        // Mock delay
        await new Promise((r) => setTimeout(r, 80));
        const mockLineId = `ent-${Math.random().toString(36).substring(2, 10)}`;

        setTitles((prev) =>
          prev.map((t) =>
            t.id === item.id
              ? {
                  ...t,
                  status: 'success',
                  agreementLineId: mockLineId,
                  statusMessage: `Linked to PO Line ${item.poLine} (Ref: ${item.reference || item.titleId})`
                }
              : t
          )
        );

        successCount++;
        addLog('success', `[${i + 1}/${readyItems.length}] Linked: ${item.titleName} → Agreement Line: ${mockLineId}`);
      } else {
        // Live execution
        try {
          // Resolve PO Line if needed
          let targetUuid = item.poLine;
          if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUuid)) {
            const query = encodeURIComponent(`poLineNumber=="${item.poLine}"`);
            const pRes = await fetch(`${config.okapiBaseUrl}/orders/order-lines?query=${query}`, {
              headers: {
                'x-okapi-tenant': config.tenant,
                'x-okapi-token': config.authToken
              }
            });
            const pJson = await pRes.json();
            targetUuid = pJson.poLines?.[0]?.id;
            if (!targetUuid) throw new Error(`PO Line not found: ${item.poLine}`);
          }

          const ref = item.reference || (item.titleId.includes('-') ? item.titleId : `36-434-${item.titleId}`);
          const payload = {
            type: item.type || 'external',
            authority: item.authority || 'ekb-title',
            reference: ref,
            poLines: [
              {
                _delete: false,
                poLineId: targetUuid
              }
            ],
            owner: item.agreementUuid
          };

          const createRes = await fetch(`${config.okapiBaseUrl}/erm/entitlements`, {
            method: 'POST',
            headers: {
              'x-okapi-tenant': config.tenant,
              'x-okapi-token': config.authToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          if (!createRes.ok) throw new Error(`HTTP ${createRes.status}`);
          const createJson = await createRes.json();

          setTitles((prev) =>
            prev.map((t) =>
              t.id === item.id
                ? { ...t, status: 'success', agreementLineId: createJson.id }
                : t
            )
          );
          successCount++;
          addLog('success', `[${i + 1}/${readyItems.length}] ${item.titleName} created (${createJson.id})`);
        } catch (err: any) {
          failCount++;
          setTitles((prev) =>
            prev.map((t) =>
              t.id === item.id
                ? { ...t, status: 'error', statusMessage: err.message }
                : t
            )
          );
          addLog('error', `[${i + 1}/${readyItems.length}] ${item.titleName} failed: ${err.message}`);
        }
      }
    }

    setIsRunning(false);
    addLog('info', `Batch execution complete! Success: ${successCount}, Errors: ${failCount}`);
  };

  const sampleCurl = `curl -X POST "${config.okapiBaseUrl || 'https://folio-test-okapi.institution.edu'}/erm/entitlements" \\
  -H "x-okapi-tenant: ${config.tenant || 'institution_test'}" \\
  -H "x-okapi-token: \${FOLIO_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "${testType || 'external'}",
    "authority": "${testAuthority || 'ekb-title'}",
    "reference": "${testReference || '36-434-797'}",
    "poLines": [
      {
        "_delete": false,
        "poLineId": "${testPoLineNum || '90c1af7d-3eee-4ce2-a5c2-ba0154baa04a'}"
      }
    ],
    "owner": "${testAgreementUuid}"
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const readyCount = titles.filter((t) => t.poLine && t.agreementUuid).length;

  return (
    <div className="space-y-6">
      {/* Mode Selector & Endpoint Settings */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Server className="w-4 h-4 text-blue-600" />
              <span>FOLIO API Execution Environment</span>
            </h2>
            <p className="text-xs text-slate-500">
              Test and verify FOLIO API endpoints and entitlement generation logic.
            </p>
          </div>

          {/* Mode Pill Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => setMode('sandbox')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                mode === 'sandbox'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Simulation Sandbox
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                mode === 'live'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live FOLIO Endpoint
            </button>
          </div>
        </div>

        {/* Live settings if selected */}
        {mode === 'live' ? (
          <div className="mt-4 p-4 bg-amber-50/60 border border-amber-200/80 rounded-lg space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Direct FOLIO Okapi / Gateway Parameters</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Okapi URL</label>
                <input
                  type="text"
                  value={config.okapiBaseUrl}
                  onChange={(e) => setConfig({ ...config, okapiBaseUrl: e.target.value })}
                  placeholder="https://folio-okapi.library.edu"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tenant ID</label>
                <input
                  type="text"
                  value={config.tenant}
                  onChange={(e) => setConfig({ ...config, tenant: e.target.value })}
                  placeholder="e.g. diku or mylibrary"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Okapi Token</label>
                <input
                  type="password"
                  value={config.authToken}
                  onChange={(e) => setConfig({ ...config, authToken: e.target.value })}
                  placeholder="Bearer or JWT token"
                  className="w-full text-xs font-mono px-2.5 py-1.5 bg-white border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <strong>Sandbox Mode Active:</strong> Simulates responses for PO Line search (<code className="font-mono text-slate-700">/orders/order-lines</code>) and Agreement Line creation (<code className="font-mono text-slate-700">/erm/entitlements</code>) with realistic UUIDs and metadata.
            </div>
            <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded">Safe Sandbox</span>
          </div>
        )}
      </div>

      {/* Interactive Orders API HRID ↔ UUID Endpoint Explorer */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Search className="w-4 h-4 text-indigo-600" />
              <span>FOLIO Orders API: Order Line HRID ↔ UUID Endpoint</span>
            </h3>
            <p className="text-xs text-slate-500">
              Test and verify query logic on <code className="font-mono text-slate-700">/orders/order-lines</code>. The userscript accepts human-friendly PO Line numbers (HRIDs) and looks up their UUIDs for agreement lines.
            </p>
          </div>
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs self-start sm:self-auto">
            <button
              onClick={() => {
                setLookupMode('hridToUuid');
                setLookupInput('10045-1');
                setLookupResult(null);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                lookupMode === 'hridToUuid'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HRID → UUID (Userscript Flow)
            </button>
            <button
              onClick={() => {
                setLookupMode('uuidToDetails');
                setLookupInput('d34a2084-7413-4604-8aa2-52ef7549c939');
                setLookupResult(null);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                lookupMode === 'uuidToDetails'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              UUID → Record (Reverse Lookup)
            </button>
          </div>
        </div>

        {/* Informational Context Banner */}
        <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
          lookupMode === 'hridToUuid'
            ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
            : 'bg-amber-50/70 border-amber-200 text-amber-900'
        }`}>
          {lookupMode === 'hridToUuid' ? (
            <div>
              <strong>Userscript Workflow (HRID → UUID):</strong> Users enter PO Line HRIDs (e.g. <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">10045-1</code>). The app queries <code className="font-mono">poLineNumber=="10045-1"</code> to retrieve the order line's <code className="font-mono">id</code> (UUID), which is required by FOLIO's <code className="font-mono">/erm/entitlements</code>.
            </div>
          ) : (
            <div>
              <strong>Reverse Inspection (UUID → Record):</strong> Queries order lines using the UUID <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200">id==(d34a2084-...)</code>. This is the reverse of what the userscript performs, but useful for inspecting an existing agreement line's linked PO Line details.
            </div>
          )}
        </div>

        {/* Query Input Form */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                {lookupMode === 'hridToUuid' ? 'Order Line HRID (poLineNumber)' : 'Order Line UUID (id)'}
              </label>
              <input
                type="text"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value)}
                placeholder={lookupMode === 'hridToUuid' ? 'e.g. 10045-1' : 'e.g. d34a2084-7413-4604-8aa2-52ef7549c939'}
                className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRunOrderLineLookup}
                disabled={lookupLoading || !lookupInput.trim()}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5 shadow-xs"
              >
                {lookupLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{lookupLoading ? 'Querying...' : 'Query Orders API'}</span>
              </button>
            </div>
          </div>

          {/* Quick preset buttons */}
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 pt-1">
            <span>Quick Presets:</span>
            {lookupMode === 'hridToUuid' ? (
              <>
                <button
                  type="button"
                  onClick={() => setLookupInput('10045-1')}
                  className="font-mono text-indigo-700 hover:underline bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                >
                  10045-1 (Sample HRID)
                </button>
                <button
                  type="button"
                  onClick={() => setLookupInput('10045-2')}
                  className="font-mono text-indigo-700 hover:underline bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                >
                  10045-2
                </button>
                <button
                  type="button"
                  onClick={() => setLookupInput('PO-2024-88')}
                  className="font-mono text-indigo-700 hover:underline bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                >
                  PO-2024-88
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setLookupInput('d34a2084-7413-4604-8aa2-52ef7549c939')}
                className="font-mono text-indigo-700 hover:underline bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
              >
                d34a2084-7413-4604-8aa2-52ef7549c939
              </button>
            )}
          </div>
        </div>

        {/* Live URL Display */}
        <div className="p-2.5 bg-slate-900 text-slate-300 rounded-lg text-xs font-mono overflow-x-auto flex items-center justify-between">
          <div className="truncate mr-2">
            <span className="text-blue-400 font-bold">GET</span>{' '}
            <span>{config.okapiBaseUrl}/orders/order-lines?limit=1000&amp;query=</span>
            <span className="text-emerald-400 font-semibold">
              {encodeURIComponent(
                lookupMode === 'hridToUuid'
                  ? `poLineNumber=="${lookupInput.trim()}"`
                  : `id==(${lookupInput.trim()})`
              )}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 shrink-0">limit=1000</span>
        </div>

        {/* Query Result Card */}
        {lookupResult && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Orders API Response ({lookupResult.poLines?.length || 0} matching record found)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                totalRecords: {lookupResult.totalRecords}
              </span>
            </div>

            {lookupResult.poLines?.[0] && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-white border border-slate-200 rounded-md text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Resolved PO Line UUID (id):</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                    {lookupResult.poLines[0].id}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    👉 Stored in <code className="font-mono">poLines[0].poLineId</code> for agreement line creation.
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">Order Line HRID (poLineNumber):</span>
                  <span className="font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mt-0.5">
                    {lookupResult.poLines[0].poLineNumber}
                  </span>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Title/Package: <span className="font-medium text-slate-700">{lookupResult.poLines[0].titleOrPackage || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            <pre className="bg-slate-900 text-slate-200 p-3 rounded text-[11px] font-mono overflow-x-auto max-h-48">
              {JSON.stringify(lookupResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 2-Column Split: Single Request Inspector & Batch Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Interactive Single Endpoint Request Inspector */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Code className="w-4 h-4 text-blue-600" />
              <span>Single Endpoint Inspector</span>
            </h3>
            <button
              onClick={handleCopyCurl}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1 border border-slate-300 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
            >
              {copiedCurl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCurl ? 'cURL Copied' : 'Copy cURL'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/80 border border-blue-200 p-2.5 rounded-lg text-blue-900">
              <span className="text-[11px] font-medium">Verified eHoldings Schema (<code className="font-mono text-blue-800">ekb-title</code>)</span>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={loadAbdominalRadiologyPayload}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-300 px-2 py-0.5 rounded shadow-2xs hover:bg-blue-50 transition-colors"
                  title="Full KBID triplet: 36 (provider) - 434 (package) - 8776980 (title)"
                >
                  36-434-8776980
                </button>
                <button
                  type="button"
                  onClick={loadVerifiedPayload2}
                  className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 px-2 py-0.5 rounded shadow-2xs hover:bg-slate-50 transition-colors"
                  title="Full KBID triplet: 36 (provider) - 434 (package) - 797 (title)"
                >
                  36-434-797 (Sample 2)
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Title Name</label>
              <input
                type="text"
                value={testTitleName}
                onChange={(e) => setTestTitleName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full KBID (Reference)</label>
                <input
                  type="text"
                  value={testReference}
                  onChange={(e) => setTestReference(e.target.value)}
                  placeholder="36-434-8776980"
                  className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                  title="Format: providerId-packageId-titleId (e.g. 36-434-8776980)"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Authority</label>
                <input
                  type="text"
                  value={testAuthority}
                  onChange={(e) => setTestAuthority(e.target.value)}
                  placeholder="ekb-title"
                  className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Line Type</label>
                <input
                  type="text"
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                  placeholder="external"
                  className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PO Line (HRID or UUID)</label>
                <input
                  type="text"
                  value={testPoLineNum}
                  onChange={(e) => setTestPoLineNum(e.target.value)}
                  placeholder="e.g. 10045-1"
                  className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  HRIDs (e.g. 10045-1) are resolved to UUIDs via /orders/order-lines
                </span>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Agreement UUID</label>
                <input
                  type="text"
                  value={testAgreementUuid}
                  onChange={(e) => setTestAgreementUuid(e.target.value)}
                  className="w-full font-mono px-2.5 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Live Payload Preview */}
            <div className="bg-slate-900 text-slate-300 p-2.5 rounded-md font-mono text-[11px] overflow-x-auto">
              <div className="text-slate-400 text-[10px] mb-1 font-sans font-semibold">POST /erm/entitlements JSON Payload:</div>
              <pre>{JSON.stringify({
                type: testType,
                authority: testAuthority,
                reference: testReference,
                poLines: [{ _delete: false, poLineId: testPoLineNum }],
                owner: testAgreementUuid
              }, null, 2)}</pre>
            </div>

            <button
              id="btn-run-single-test"
              onClick={handleRunSingleTest}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate Single Entitlement Creation</span>
            </button>

            {singleResult && (
              <div className="mt-3 bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                <div className="text-slate-500 mb-1">// FOLIO mod-agreements Response (HTTP 201 Created):</div>
                <pre>{JSON.stringify(singleResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Full Batch Execution Engine */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>Batch Linking Runner</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
              {readyCount} Titles Ready
            </span>
          </div>

          <p className="text-xs text-slate-600">
            Executes the full automated workflow across all {readyCount} staged titles from the CSV workbench.
          </p>

          {/* Progress Bar */}
          {isRunning && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-slate-700">
                <span>Processing Batch...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-150"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              id="btn-run-full-batch"
              onClick={handleRunBatch}
              disabled={isRunning || readyCount === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-semibold py-2 rounded-lg text-xs flex items-center justify-center space-x-2 transition-colors shadow-xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isRunning ? 'Processing...' : `Run Batch (${readyCount} Records)`}</span>
            </button>

            <button
              onClick={() => setLogs([])}
              className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
              title="Clear logs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real-time Activity Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 max-h-56 overflow-y-auto space-y-1.5">
            {logs.length === 0 ? (
              <div className="text-slate-500 text-center py-6">Execution logs will appear here</div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2 leading-tight">
                  <span className="text-slate-500 text-[10px]">{log.time}</span>
                  {log.type === 'success' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                  {log.type === 'error' && <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                  {log.type === 'request' && <span className="text-blue-400 font-bold shrink-0">→</span>}
                  {log.type === 'info' && <span className="text-slate-400 shrink-0">•</span>}
                  <span
                    className={
                      log.type === 'success'
                        ? 'text-emerald-300'
                        : log.type === 'error'
                        ? 'text-rose-300'
                        : log.type === 'request'
                        ? 'text-sky-300'
                        : 'text-slate-300'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
