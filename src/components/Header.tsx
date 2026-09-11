import React from 'react';
import { Layers, FileCode, Sliders, Database, BookOpen, Download } from 'lucide-react';

interface HeaderProps {
  activeTab: 'userscript' | 'workbench' | 'apitester' | 'docs';
  setActiveTab: (tab: 'userscript' | 'workbench' | 'apitester' | 'docs') => void;
  onDownloadScript: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onDownloadScript }) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">FOLIO ERM</span>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30 font-mono">
                  Userscript Suite
                </span>
              </div>
              <p className="text-xs text-slate-400">Agreement Lines &amp; PO Lines Automation</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-sm">
            <button
              id="nav-tab-userscript"
              onClick={() => setActiveTab('userscript')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'userscript'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>Tampermonkey Script</span>
            </button>

            <button
              id="nav-tab-workbench"
              onClick={() => setActiveTab('workbench')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'workbench'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>eHoldings CSV Staging</span>
            </button>

            <button
              id="nav-tab-apitester"
              onClick={() => setActiveTab('apitester')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'apitester'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>API Sandbox &amp; Runner</span>
            </button>

            <button
              id="nav-tab-docs"
              onClick={() => setActiveTab('docs')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'docs'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>API Reference</span>
            </button>
          </nav>

          {/* Quick Action */}
          <div className="flex items-center space-x-3">
            <button
              id="btn-quick-download-script"
              onClick={onDownloadScript}
              className="hidden sm:inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-md shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .user.js</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
