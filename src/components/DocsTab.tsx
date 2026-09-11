import React from 'react';
import { BookOpen, Layers, ArrowRight, CheckCircle2, ShieldCheck, FileText, Code2, Link2 } from 'lucide-react';

export const DocsTab: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4" />
          <span>FOLIO ERM Architecture &amp; API Guide</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Automating Agreement Lines &amp; PO Line Associations
        </h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          In FOLIO, Electronic Resource Management (ERM) is powered by <code className="font-mono bg-slate-100 text-blue-700 px-1 py-0.5 rounded">mod-agreements</code>. An <em>Agreement Line</em> (also known in API schema as an <code className="font-mono bg-slate-100 text-blue-700 px-1 py-0.5 rounded">entitlement</code>) represents a licensed e-resource or custom package title, linked to an agreement record and optionally linked to Purchase Order lines in <code className="font-mono bg-slate-100 text-blue-700 px-1 py-0.5 rounded">mod-orders</code>.
        </p>
      </div>

      {/* Visual Workflow Diagram */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>End-to-End Workflow</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-blue-700 mb-1">Step 1: eHoldings Export</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                User finds package in FOLIO eHoldings (e.g. Springer Nature) and exports selected journals to CSV.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-slate-500 bg-white p-1.5 rounded border border-slate-200">
              eHoldings CSV Export
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-blue-700 mb-1">Step 2: CSV Enrichment</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Add columns for <code className="font-semibold text-slate-800">PO Line</code> (number or UUID) and <code className="font-semibold text-slate-800">Agreement UUID</code>.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-slate-500 bg-white p-1.5 rounded border border-slate-200">
              PO Line + Agreement ID
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-blue-700 mb-1">Step 3: Agreement Lines Actions Menu</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                In FOLIO, open your agreement, expand the <strong>Agreement lines</strong> accordion, and select <strong>Actions → batch load agreement lines</strong>.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-slate-500 bg-white p-1.5 rounded border border-slate-200">
              Actions → batch load agreement lines
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-blue-700 mb-1">Step 4: FOLIO API Creation</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Userscript resolves PO line numbers to UUIDs and creates entitlements via <code className="font-mono text-xs">POST /erm/entitlements</code>.
              </p>
            </div>
            <div className="mt-3 text-[11px] font-mono text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-200 font-semibold">
              Agreement Lines Linked
            </div>
          </div>
        </div>
      </div>

      {/* API Reference & Schemas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders Endpoint */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <span className="bg-blue-100 text-blue-800 font-mono text-xs font-bold px-2 py-0.5 rounded">GET</span>
            <code className="text-xs font-mono font-bold text-slate-800">/orders/order-lines</code>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Retrieves order line records from <code className="font-mono text-slate-700">mod-orders</code>. Agreement lines require the PO line internal UUID (<code className="font-mono text-slate-700">id</code>), while users commonly work with the PO Line HRID (<code className="font-mono text-slate-700">poLineNumber</code>).
          </p>

          <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto space-y-2">
            <div>
              <div className="text-emerald-400 font-semibold mb-0.5">1. Forward Lookup (Userscript: HRID → UUID):</div>
              <span className="text-blue-400">GET</span> /orders/order-lines?limit=1000&amp;query=poLineNumber%3D%3D%2210045-1%22
            </div>
            <div className="pt-1 border-t border-slate-800">
              <div className="text-amber-400 font-semibold mb-0.5">2. Reverse Lookup (Inspect Details by UUID):</div>
              <span className="text-blue-400">GET</span> /orders/order-lines?limit=1000&amp;query=id%3D%3D(d34a2084-7413-4604-8aa2-52ef7549c939)
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Batch Optimization:</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              The userscript groups HRIDs into batches of 25 using CQL <code className="font-mono text-slate-700">or</code> statements (e.g. <code className="font-mono text-slate-700">poLineNumber=="10045-1" or poLineNumber=="10045-2"</code>) with <code className="font-mono text-slate-700">limit=1000</code> to stay well within URL length limits while avoiding individual per-record round-trips.
            </p>
          </div>
        </div>

        {/* Entitlements Endpoint */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-100 text-emerald-800 font-mono text-xs font-bold px-2 py-0.5 rounded">POST</span>
            <code className="text-xs font-mono font-bold text-slate-800">/erm/entitlements</code>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Creates a new Agreement Line record in <code className="font-mono text-slate-700">mod-agreements</code>. Associates the agreement owner with the title description and PO line link.
          </p>
          <div className="bg-slate-900 text-slate-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
            <div className="text-slate-500 mb-1">// Verified FOLIO mod-agreements Request Body:</div>
            <pre>{`{
  "type": "external",
  "authority": "ekb-title",
  "reference": "36-434-8776980",
  "poLines": [
    {
      "_delete": false,
      "poLineId": "90c1af7d-3eee-4ce2-a5c2-ba0154baa04a"
    }
  ],
  "owner": "1af4efc0-c4d4-4134-b47a-765759bbec88"
}`}</pre>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Parameters:</div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
              <li><code className="font-mono">type</code>: <code className="font-mono">"external"</code> for EBSCO/EKB title links</li>
              <li><code className="font-mono">authority</code>: <code className="font-mono">"ekb-title"</code> identifies EBSCO knowledgebase titles</li>
              <li><code className="font-mono">reference</code>: Full EBSCO KBID triplet (<code className="font-mono">providerId-packageId-titleId</code>, e.g. <code className="font-mono">"36-434-8776980"</code>). In eHoldings exports, the package section provides the Package ID (<code className="font-mono">36-434</code>) which is appended before each title's Title ID (<code className="font-mono">8776980</code>).</li>
              <li><code className="font-mono">poLines</code>: Array of PO Line objects with <code className="font-mono">_delete: false</code> and <code className="font-mono">poLineId</code></li>
              <li><code className="font-mono">owner</code>: UUID of the target Agreement record</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Security and Session Headers */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>FOLIO Authentication &amp; Headers</span>
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          When the userscript executes within FOLIO in the browser, requests automatically carry the required headers:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-mono font-bold text-slate-800">x-okapi-tenant</div>
            <div className="text-slate-600 text-[11px] mt-1">Identifies the institutional tenant. Detected from <code className="font-mono">currentTenant</code>.</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-mono font-bold text-slate-800">x-okapi-token</div>
            <div className="text-slate-600 text-[11px] mt-1">Active JWT token. Extracted automatically from <code className="font-mono">okapiToken</code> session storage.</div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="font-mono font-bold text-slate-800">Content-Type</div>
            <div className="text-slate-600 text-[11px] mt-1"><code className="font-mono">application/json</code> for all API mutations.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
