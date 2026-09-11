import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { UserscriptTab } from './components/UserscriptTab';
import { CsvWorkbenchTab } from './components/CsvWorkbenchTab';
import { ApiTesterTab } from './components/ApiTesterTab';
import { DocsTab } from './components/DocsTab';
import { parseEHoldingsCsv } from './utils/csvParser';
import { SAMPLE_EHOLDINGS_CSV } from './data/sampleEHoldingsCsv';
import { generateTampermonkeyUserscript } from './utils/userscriptGenerator';
import { EHoldingsPackageMeta, EHoldingsTitleRow, FolioConfig } from './types/folio';

export default function App() {
  const [activeTab, setActiveTab] = useState<'userscript' | 'workbench' | 'apitester' | 'docs'>('workbench');
  const [packageMeta, setPackageMeta] = useState<EHoldingsPackageMeta | null>(null);
  const [titles, setTitles] = useState<EHoldingsTitleRow[]>([]);

  const [config, setConfig] = useState<FolioConfig>({
    okapiBaseUrl: 'https://folio-test-okapi.institution.edu',
    tenant: 'institution_test',
    authToken: '',
    tokenParamName: 'folioAccessToken',
    matchDomainPattern: '*://folio-test.institution.edu/*',
    defaultAgreementUuid: '1af4efc0-c4d4-4134-b47a-765759bbec88',
    defaultPoLinePrefix: '10045-',
    linkToResource: true,
    dryRun: false
  });

  // Load sample on mount
  useEffect(() => {
    loadSampleData();
  }, []);

  const loadSampleData = () => {
    const res = parseEHoldingsCsv(SAMPLE_EHOLDINGS_CSV);
    setPackageMeta(res.packageMeta);
    // Pre-seed first 5 with sample PO Line HRIDs and their resolved UUIDs
    const verifiedAgreement = '1af4efc0-c4d4-4134-b47a-765759bbec88';
    const seeded = res.titles.map((t, idx) => {
      // Row 0 is "Abdominal Radiology" (Title ID 8776980 -> 36-434-8776980)
      // Row 2 is "Accreditation and Quality Assurance" (Title ID 797 -> 36-434-797)
      if (idx < 5) {
        const hrid = `10045-${idx + 1}`;
        // Using Lehigh test server order line UUID from user query example for row 0
        const resolvedUuid = idx === 0 ? 'd34a2084-7413-4604-8aa2-52ef7549c939' : `90c1af7d-3eee-4ce2-a5c2-ba0154baa04${idx}`;
        return {
          ...t,
          poLine: hrid,
          poLineUuid: resolvedUuid,
          agreementUuid: verifiedAgreement,
          reference: t.reference,
          authority: 'ekb-title',
          type: 'external',
          status: 'ready' as const
        };
      }
      return t;
    });
    setTitles(seeded);
  };

  const handleUploadCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const res = parseEHoldingsCsv(text);
        setPackageMeta(res.packageMeta);
        setTitles(res.titles);
      }
    };
    reader.readAsText(file);
  };

  const userscriptCode = generateTampermonkeyUserscript(config);

  const handleDownloadScript = () => {
    const blob = new Blob([userscriptCode], { type: 'application/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'folio-agreement-linker.user.js';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadScript={handleDownloadScript}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'userscript' && (
          <UserscriptTab
            config={config}
            setConfig={setConfig}
            userscriptCode={userscriptCode}
            onDownloadScript={handleDownloadScript}
          />
        )}

        {activeTab === 'workbench' && (
          <CsvWorkbenchTab
            packageMeta={packageMeta}
            titles={titles}
            setTitles={setTitles}
            onUploadCsv={handleUploadCsv}
            onResetSample={loadSampleData}
            onGoToApiTester={() => setActiveTab('apitester')}
          />
        )}

        {activeTab === 'apitester' && (
          <ApiTesterTab
            titles={titles}
            setTitles={setTitles}
            config={config}
            setConfig={setConfig}
          />
        )}

        {activeTab === 'docs' && <DocsTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>FOLIO ERM Automation Suite • Agreement Lines &amp; PO Line Linker</div>
          <div className="flex items-center space-x-4">
            <a
              href="https://dev.folio.org/reference/api/"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              dev.folio.org API Reference
            </a>
            <span>•</span>
            <button
              onClick={() => setActiveTab('docs')}
              className="text-slate-600 hover:text-slate-900 underline"
            >
              Schema Docs
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
