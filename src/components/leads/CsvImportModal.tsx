import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Database, 
  Building2, 
  ShieldCheck, 
  Sparkles,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { 
  parseCsvString, 
  detectColumnMapping, 
  convertRowsToPayloads, 
  ColumnMapping 
} from '../../lib/csvParser';
import { LeadSourceManager, SourcingResult } from '../../services/leadSourceManager';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCampaignId?: string;
  onSuccess?: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  defaultCampaignId,
  onSuccess,
}) => {
  const { campaigns, activeCampaignId, companies, refreshData } = useCRM();

  // Wizard Steps: 1: Upload, 2: Preview & Map, 3: Target Campaign, 4: Results
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [fileName, setFileName] = useState<string>('');
  const [csvText, setCsvText] = useState<string>('');
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    company_name: '',
    website: '',
    domain: '',
    industry: '',
    country: '',
    city: '',
    description: '',
    contact_name: '',
    first_name: '',
    last_name: '',
    email: '',
    job_title: '',
    linkedin_url: '',
  });

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(
    defaultCampaignId || activeCampaignId || campaigns[0]?.id || ''
  );
  const [qualificationScore, setQualificationScore] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<SourcingResult | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      processCsvText(text);
    };
    reader.readAsText(file);
  };

  const handlePasteCsv = () => {
    if (csvText.trim()) {
      setFileName('Pasted_CSV_Data.csv');
      processCsvText(csvText);
    }
  };

  const processCsvText = (text: string) => {
    const { headers, rows } = parseCsvString(text);
    if (headers.length === 0 || rows.length === 0) {
      alert('Could not parse any valid rows or headers from the CSV data.');
      return;
    }

    setParsedHeaders(headers);
    setParsedRows(rows);

    const autoMapping = detectColumnMapping(headers);
    setMapping({
      company_name: autoMapping.company_name || headers[0] || '',
      website: autoMapping.website || '',
      domain: autoMapping.domain || '',
      industry: autoMapping.industry || '',
      country: autoMapping.country || '',
      city: autoMapping.city || '',
      description: autoMapping.description || '',
      contact_name: autoMapping.contact_name || '',
      first_name: autoMapping.first_name || '',
      last_name: autoMapping.last_name || '',
      email: autoMapping.email || '',
      job_title: autoMapping.job_title || '',
      linkedin_url: autoMapping.linkedin_url || '',
    });

    setStep(2);
  };

  const handleExecuteImport = async () => {
    if (!selectedCampaignId) {
      alert('Please select a campaign to link these leads to.');
      return;
    }

    setIsProcessing(true);
    try {
      const payloads = convertRowsToPayloads(parsedRows, mapping);
      const result = await LeadSourceManager.ingestSourcedLeads(
        selectedCampaignId,
        payloads,
        qualificationScore,
        'Imported via CSV Sourcing Engine'
      );

      setImportResult(result);
      await refreshData();
      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Import failed:', err);
      alert(`Import error: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setFileName('');
    setCsvText('');
    setParsedHeaders([]);
    setParsedRows([]);
    setImportResult(null);
  };

  return (
    <div 
      id="csv-import-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        id="csv-import-modal-container"
        className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">CSV Lead Sourcing Engine</h2>
              <p className="text-xs text-zinc-400">
                Step {step} of 4: {
                  step === 1 ? 'Upload File or Paste Data' :
                  step === 2 ? 'Column Mapping & Preview' :
                  step === 3 ? 'Campaign & Qualification Settings' :
                  'Import Complete'
                }
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="w-full bg-zinc-950 h-1">
          <div 
            className="bg-amber-400 h-1 transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: UPLOAD OR PASTE */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="p-8 border-2 border-dashed border-zinc-700/80 rounded-xl bg-zinc-950/40 text-center hover:border-amber-500/50 transition-colors flex flex-col items-center justify-center">
                <UploadCloud className="w-10 h-10 text-amber-400 mb-3" />
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                  Drag and drop your prospect CSV file here
                </h3>
                <p className="text-xs text-zinc-400 mb-4 max-w-sm">
                  Accepts files from Apollo, LinkedIn Sales Navigator, Clay, or custom outreach spreadsheets.
                </p>
                <label 
                  id="csv-file-upload-label"
                  className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs cursor-pointer transition-colors shadow-sm"
                >
                  <span>Select CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-zinc-900 px-3 text-zinc-400 uppercase font-mono text-[10px]">
                    Or Paste Raw CSV Data
                  </span>
                </div>
              </div>

              <div>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="company_name,website,contact_name,email,job_title,country&#10;Acme Studios,acmestudios.com,Sarah Connor,sarah@acme.com,Creative Director,USA"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs font-mono text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    disabled={!csvText.trim()}
                    onClick={handlePasteCsv}
                    className="px-4 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition-colors disabled:opacity-50"
                  >
                    Parse Pasted Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING & PREVIEW */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-400">File: </span>
                  <span className="font-semibold text-zinc-200">{fileName}</span>
                  <span className="text-zinc-400 ml-2">({parsedRows.length} total rows detected)</span>
                </div>
                <button
                  onClick={resetAll}
                  className="text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Choose another file</span>
                </button>
              </div>

              {/* Mapping Controls */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-200 mb-3 flex items-center space-x-2">
                  <span>Match CSV Columns to UIOutbox Fields</span>
                  <span className="text-[11px] text-zinc-400 font-normal">(Auto-detected where possible)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Company Name <span className="text-amber-400">*</span>
                    </label>
                    <select
                      value={mapping.company_name}
                      onChange={(e) => setMapping({ ...mapping, company_name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Website URL or Domain
                    </label>
                    <select
                      value={mapping.website}
                      onChange={(e) => setMapping({ ...mapping, website: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Industry / Niche
                    </label>
                    <select
                      value={mapping.industry}
                      onChange={(e) => setMapping({ ...mapping, industry: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- None (Use campaign niche) --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Country / Market
                    </label>
                    <select
                      value={mapping.country}
                      onChange={(e) => setMapping({ ...mapping, country: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- None (Worldwide) --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Decision Maker Name
                    </label>
                    <select
                      value={mapping.contact_name}
                      onChange={(e) => setMapping({ ...mapping, contact_name: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Contact Email
                    </label>
                    <select
                      value={mapping.email}
                      onChange={(e) => setMapping({ ...mapping, email: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Job Title
                    </label>
                    <select
                      value={mapping.job_title}
                      onChange={(e) => setMapping({ ...mapping, job_title: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      LinkedIn URL
                    </label>
                    <select
                      value={mapping.linkedin_url}
                      onChange={(e) => setMapping({ ...mapping, linkedin_url: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
                    >
                      <option value="">-- Select Column --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div>
                <h4 className="text-xs font-semibold text-zinc-200 mb-2">
                  Sample Data Preview (First 5 Rows)
                </h4>
                <div className="overflow-x-auto border border-zinc-800 rounded-lg bg-zinc-950">
                  <table className="w-full text-[11px] text-left text-zinc-300">
                    <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Company Name</th>
                        <th className="p-2">Website / Domain</th>
                        <th className="p-2">Contact Name</th>
                        <th className="p-2">Email</th>
                        <th className="p-2">Title</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/40">
                          <td className="p-2 text-zinc-400 font-mono">{idx + 1}</td>
                          <td className="p-2 font-medium text-zinc-100">{row[mapping.company_name] || '—'}</td>
                          <td className="p-2 font-mono text-zinc-400">{row[mapping.website] || row[mapping.domain] || '—'}</td>
                          <td className="p-2">{row[mapping.contact_name] || row[mapping.first_name] || '—'}</td>
                          <td className="p-2 font-mono text-amber-400/90">{row[mapping.email] || '—'}</td>
                          <td className="p-2">{row[mapping.job_title] || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CAMPAIGN & QUALIFICATION CONFIG */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Deduplication & Pipeline Protection</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  UIOutbox automatically validates domains against existing companies in your database. Any company matching an existing domain will have its contact information merged without creating duplicate company profiles.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Target Campaign <span className="text-amber-400">*</span>
                </label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80"
                >
                  <option value="">-- Select Target Campaign --</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Niche: {c.niche}, Target: {c.daily_target})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Initial Lead Qualification
                </label>
                <select
                  value={qualificationScore}
                  onChange={(e) => setQualificationScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80"
                >
                  <option value={0}>Unreviewed (Score: 0 — Requires manual review)</option>
                  <option value={75}>Pre-Qualified (Score: 75 — Trusted CSV source)</option>
                  <option value={90}>High Confidence (Score: 90 — Curated ICP list)</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Leads with status "Unreviewed" will appear in your Leads queue ready for one-click qualification.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORT RESULTS */}
          {step === 4 && importResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-100">CSV Import Completed</h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Prospects have been ingested and linked to your outreach campaign
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] uppercase block">Processed</span>
                  <span className="text-base font-mono font-bold text-zinc-100">{importResult.totalProcessed}</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] uppercase block">New Companies</span>
                  <span className="text-base font-mono font-bold text-emerald-400">{importResult.companiesCreated}</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] uppercase block">Deduplicated</span>
                  <span className="text-base font-mono font-bold text-amber-400">{importResult.companiesReused}</span>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                  <span className="text-zinc-400 text-[10px] uppercase block">Leads Linked</span>
                  <span className="text-base font-mono font-bold text-sky-400">{importResult.leadsCreated}</span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-left text-xs text-rose-300 space-y-1">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{importResult.errors.length} rows skipped:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] max-h-24 overflow-y-auto">
                    {importResult.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/70 flex items-center justify-between">
          <div>
            {step > 1 && step < 4 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              {step === 4 ? 'Close' : 'Cancel'}
            </button>

            {step === 2 && (
              <button
                type="button"
                disabled={!mapping.company_name}
                onClick={() => setStep(3)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors shadow-sm disabled:opacity-50"
              >
                <span>Continue to Campaign Settings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                disabled={isProcessing || !selectedCampaignId}
                onClick={handleExecuteImport}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors shadow-sm disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing Leads...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5" />
                    <span>Execute Ingestion</span>
                  </>
                )}
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors shadow-sm"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
