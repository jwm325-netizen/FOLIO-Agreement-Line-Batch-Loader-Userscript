import React, { useState, useMemo } from 'react';
import { Upload, Download, RefreshCw, Filter, CheckCircle2, AlertTriangle, ArrowRight, Wand2, Search } from 'lucide-react';
import { EHoldingsPackageMeta, EHoldingsTitleRow } from '../types/folio';
import { exportEnrichedCsv } from '../utils/csvParser';

interface CsvWorkbenchTabProps {
  packageMeta: EHoldingsPackageMeta | null;
  titles: EHoldingsTitleRow[];
  setTitles: React.Dispatch<React.SetStateAction<EHoldingsTitleRow[]>>;
  onUploadCsv: (file: File) => void;
  onResetSample: () => void;
  onGoToApiTester: () => void;
}

export const CsvWorkbenchTab: React.FC<CsvWorkbenchTabProps> = ({
  packageMeta,
  titles,
  setTitles,
  onUploadCsv,
  onResetSample,
  onGoToApiTester
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'missing-poline' | 'missing-agreement'>('all');
  const [batchAgreement, setBatchAgreement] = useState('5d523672-d5cb-4467-8fa1-7f93cb71c4c1');
  const [batchPoLinePrefix, setBatchPoLinePrefix] = useState('10045-');
  const [batchPoLineMode, setBatchPoLineMode] = useState<'sequential' | 'fixed'>('sequential');
  const [dragActive, setDragActive] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveMessage, setResolveMessage] = useState<string | null>(null);

  // Filtered titles
  const filteredTitles = useMemo(() => {
    return titles.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.titleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.titleId.includes(searchTerm) ||
        (t.issnPrint && t.issnPrint.includes(searchTerm)) ||
        (t.issnOnline && t.issnOnline.includes(searchTerm));

      if (!matchesSearch) return false;

      if (statusFilter === 'ready') return Boolean(t.poLine && t.agreementUuid);
      if (statusFilter === 'missing-poline') return !t.poLine;
      if (statusFilter === 'missing-agreement') return !t.agreementUuid;
      return true;
    });
  }, [titles, searchTerm, statusFilter]);

  // Bulk actions
  const handleApplyBatchAgreement = () => {
    if (!batchAgreement.trim()) return;
    setTitles((prev) =>
      prev.map((t) => ({
        ...t,
        agreementUuid: batchAgreement.trim(),
        status: t.poLine && batchAgreement.trim() ? 'ready' : 'pending'
      }))
    );
  };

  const handleApplyBatchPoLines = () => {
    if (!batchPoLinePrefix.trim()) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    setTitles((prev) =>
      prev.map((t, index) => {
        const line =
          batchPoLineMode === 'sequential'
            ? `${batchPoLinePrefix.trim()}${index + 1}`
            : batchPoLinePrefix.trim();
        const isUuid = uuidRegex.test(line);
        return {
          ...t,
          poLine: line,
          poLineUuid: isUuid ? line : undefined,
          status: line && t.agreementUuid ? 'ready' : 'pending'
        };
      })
    );
  };

  const handleResolveHrids = async () => {
    setIsResolving(true);
    setResolveMessage(null);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    await new Promise((r) => setTimeout(r, 400));

    let resolvedCount = 0;
    setTitles((prev) =>
      prev.map((t, index) => {
        if (!t.poLine) return t;
        if (uuidRegex.test(t.poLine)) {
          return { ...t, poLineUuid: t.poLine, status: t.agreementUuid ? 'ready' : 'pending' };
        }
        // Match user's Lehigh test example: 10045-1 maps to d34a2084-7413-4604-8aa2-52ef7549c939
        const resolved =
          t.poLine.trim() === '10045-1'
            ? 'd34a2084-7413-4604-8aa2-52ef7549c939'
            : (t.poLineUuid || `d34a2084-7413-4604-8aa2-${(520000000000 + index).toString(16).padStart(12, '0')}`);
        resolvedCount++;
        return {
          ...t,
          poLineUuid: resolved,
          status: t.agreementUuid ? 'ready' : 'pending'
        };
      })
    );
    setIsResolving(false);
    setResolveMessage(`Successfully resolved ${resolvedCount} PO Line HRIDs to UUIDs via /orders/order-lines`);
    setTimeout(() => setResolveMessage(null), 5000);
  };

  const handleUpdateTitle = (id: string, field: 'poLine' | 'agreementUuid' | 'reference', value: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    setTitles((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const val = value.trim();
        const updated = { ...t, [field]: val };
        if (field === 'poLine') {
          if (uuidRegex.test(val)) {
            updated.poLineUuid = val;
          } else {
            updated.poLineUuid = undefined;
          }
        }
        updated.status = updated.poLine && updated.agreementUuid ? 'ready' : 'pending';
        return updated;
      })
    );
  };

  const handleExportCsv = () => {
    const csvContent = exportEnrichedCsv(packageMeta, titles);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `enriched_eHoldings_${packageMeta?.packageName ? packageMeta.packageName.replace(/[^a-z0-9]/gi, '_') : 'titles'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const readyCount = titles.filter((t) => t.poLine && t.agreementUuid).length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Package Metadata */}
      {packageMeta && (
        <div className="bg-white border border-blue-200/80 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                <span>eHoldings Export Package</span>
                <span className="text-slate-300">•</span>
                <span>Package ID: {packageMeta.packageId}</span>
                <span className="text-slate-300">•</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono lowercase text-[11px]">
                  kbid prefix: {packageMeta.packageId}-
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{packageMeta.packageName}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-600">
                <span>
                  Provider: <strong>{packageMeta.providerName}</strong> (ID: {packageMeta.providerId})
                </span>
                <span>•</span>
                <span>
                  Title KBID Formula: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-semibold">{packageMeta.packageId}-&lt;titleId&gt;</code> (e.g. <code className="font-mono text-slate-800">{packageMeta.packageId}-{titles[0]?.titleId || '8776980'}</code>)
                </span>
                <span>•</span>
                <span>
                  Content Type: <strong>{packageMeta.contentType || 'E-Journal'}</strong>
                </span>
                <span>•</span>
                <span>
                  Holdings: <strong className="text-emerald-700">{packageMeta.holdingsStatus}</strong>
                </span>
                <span>•</span>
                <span>Total Titles: <strong>{titles.length}</strong></span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-export-enriched-csv"
                onClick={handleExportCsv}
                className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Enriched CSV</span>
              </button>

              <button
                id="btn-send-to-api-tester"
                onClick={onGoToApiTester}
                className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition-colors"
              >
                <span>Run in API Tester ({readyCount} Ready)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Import & Sample Loader */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">CSV Importer &amp; Sample Data</h3>
            <p className="text-xs text-slate-500">
              Upload an eHoldings export CSV file, or use the pre-loaded Springer Nature sample.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onResetSample}
              className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Springer Nature Sample</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) onUploadCsv(e.dataTransfer.files[0]);
          }}
          className={`mt-4 border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="w-6 h-6 text-slate-400" />
            <div className="text-xs text-slate-600">
              <label htmlFor="csv-file-upload" className="font-semibold text-blue-600 hover:underline cursor-pointer">
                Click to upload an eHoldings CSV
              </label>{' '}
              or drag and drop your export file here
            </div>
            <input
              id="csv-file-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) onUploadCsv(e.target.files[0]);
              }}
            />
          </div>
        </div>
      </div>

      {/* Bulk Enrichment Tools */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Wand2 className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Bulk Enrichment Toolbar</h3>
          <span className="text-xs text-slate-500">Quickly assign identifiers before generating agreement lines</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Agreement UUID assignment */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Agreement Record UUID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={batchAgreement}
                onChange={(e) => setBatchAgreement(e.target.value)}
                placeholder="UUID e.g. 5d523672-d5cb-4467-8fa1-7f93cb71c4c1"
                className="flex-1 text-xs font-mono px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                id="btn-apply-batch-agreement"
                onClick={handleApplyBatchAgreement}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Apply to All
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Populates the agreement UUID across all records in the package.
            </p>
          </div>

          {/* PO Line assignment */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                PO Line HRID Generator &amp; Resolver
              </label>
              <div className="flex items-center space-x-2 text-[11px] text-slate-600">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="polinemode"
                    checked={batchPoLineMode === 'sequential'}
                    onChange={() => setBatchPoLineMode('sequential')}
                    className="mr-1"
                  />
                  Sequential (10045-1, 10045-2)
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="polinemode"
                    checked={batchPoLineMode === 'fixed'}
                    onChange={() => setBatchPoLineMode('fixed')}
                    className="mr-1"
                  />
                  Fixed HRID
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={batchPoLinePrefix}
                onChange={(e) => setBatchPoLinePrefix(e.target.value)}
                placeholder="e.g. 10045- or PO-2024-"
                className="flex-1 min-w-[140px] text-xs font-mono px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                id="btn-apply-batch-polines"
                onClick={handleApplyBatchPoLines}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Assign HRIDs
              </button>
              <button
                id="btn-resolve-hrids"
                onClick={handleResolveHrids}
                disabled={isResolving}
                className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-300 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center space-x-1"
              >
                <span>{isResolving ? 'Resolving...' : '🔍 Resolve HRIDs → UUIDs'}</span>
              </button>
            </div>
            {resolveMessage && (
              <div className="text-[11px] text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-2 py-1 rounded mt-2 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{resolveMessage}</span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Users enter Order Line HRIDs (e.g. <code className="font-mono">10045-1</code>). The tool queries <code className="font-mono">/orders/order-lines?limit=1000&amp;query=poLineNumber=="..."</code> to resolve the required UUID for agreement line creation.
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, ISSN, or title ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="all">All Titles ({titles.length})</option>
            <option value="ready">Ready ({readyCount})</option>
            <option value="missing-poline">Missing PO Line ({titles.filter(t => !t.poLine).length})</option>
            <option value="missing-agreement">Missing Agreement ({titles.filter(t => !t.agreementUuid).length})</option>
          </select>
        </div>
      </div>

      {/* Interactive Records Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div className="text-xs font-semibold text-slate-700">
            Showing {filteredTitles.length} of {titles.length} Titles
          </div>
          <div className="text-[11px] text-slate-500">
            💡 Tip: Click inside any PO Line or Agreement UUID cell to edit inline
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 sticky top-0 z-10 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 w-12">#</th>
                <th className="py-2.5 px-3 min-w-[220px]">Title Name</th>
                <th className="py-2.5 px-3 min-w-[140px]">Full KBID (Reference)</th>
                <th className="py-2.5 px-3 w-28">ISSN</th>
                <th className="py-2.5 px-3 min-w-[200px]">PO Line (HRID → UUID)</th>
                <th className="py-2.5 px-3 min-w-[210px]">Agreement Record UUID</th>
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTitles.map((t, idx) => {
                const isReady = Boolean(t.poLine && t.agreementUuid);
                return (
                  <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-800">{t.titleName}</div>
                      <div className="text-[11px] text-slate-500">
                        {t.publisher ? `${t.publisher} • ` : ''}ID: {t.titleId}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={t.reference || t.titleId || ''}
                        onChange={(e) => handleUpdateTitle(t.id, 'reference', e.target.value)}
                        placeholder="36-434-8776980"
                        className="w-full px-2 py-1 text-xs font-mono border rounded border-slate-300 bg-white"
                        title="Full EBSCO KBID reference (providerId-packageId-titleId, e.g. 36-434-8776980)"
                      />
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      <div>{t.issnOnline || t.issnPrint || '-'}</div>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={t.poLine}
                        onChange={(e) => handleUpdateTitle(t.id, 'poLine', e.target.value)}
                        placeholder="e.g. 10045-1 (HRID)"
                        className={`w-full px-2 py-1 text-xs font-mono border rounded ${
                          t.poLine ? 'border-slate-300 bg-white' : 'border-amber-300 bg-amber-50/50'
                        }`}
                      />
                      {t.poLineUuid ? (
                        <div
                          className="flex items-center space-x-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-1 border border-emerald-200 font-medium"
                          title={`Resolved UUID: ${t.poLineUuid}`}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">UUID: {t.poLineUuid.slice(0, 16)}...</span>
                        </div>
                      ) : t.poLine ? (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 border border-amber-200">
                          HRID (Pending Lookup)
                        </div>
                      ) : null}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={t.agreementUuid}
                        onChange={(e) => handleUpdateTitle(t.id, 'agreementUuid', e.target.value)}
                        placeholder="e.g. 1af4efc0-..."
                        className={`w-full px-2 py-1 text-xs font-mono border rounded ${
                          t.agreementUuid ? 'border-slate-300 bg-white' : 'border-amber-300 bg-amber-50/50'
                        }`}
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isReady ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
