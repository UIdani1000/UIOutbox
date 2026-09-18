import React, { useState } from 'react';
import { X, Building2, User, Globe, Mail, Briefcase, MapPin, Sparkles, Check } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCampaignId?: string;
  onSuccess?: () => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  defaultCampaignId,
  onSuccess,
}) => {
  const { campaigns, addManualCompany, activeCampaignId } = useCRM();

  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [domain, setDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('Worldwide');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('Creative Director');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [targetCampaignId, setTargetCampaignId] = useState(defaultCampaignId || activeCampaignId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleWebsiteBlur = () => {
    if (website && !domain) {
      try {
        const clean = website
          .replace(/^https?:\/\//i, '')
          .replace(/^www\./i, '')
          .split('/')[0]
          .toLowerCase()
          .trim();
        setDomain(clean);
      } catch {
        // ignore
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await addManualCompany({
        company_name: companyName.trim(),
        website: website.trim(),
        domain: domain.trim(),
        industry: industry.trim() || 'Design & Creative',
        country: country.trim() || 'Worldwide',
        city: city.trim(),
        description: description.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        job_title: jobTitle.trim(),
        linkedin_url: linkedinUrl.trim(),
        campaign_id: targetCampaignId || undefined,
      });

      if (res.isDuplicate) {
        setResultMessage({
          type: 'info',
          text: `Domain "${res.company.domain}" already existed. Profile updated and linked to campaign without creating duplicate records.`,
        });
      } else {
        setResultMessage({
          type: 'success',
          text: `Company "${res.company.company_name}" added successfully.`,
        });
      }

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Failed to add manual company:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="add-company-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        id="add-company-modal-container"
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Add Company & Prospect</h2>
              <p className="text-xs text-zinc-400">Manual ingestion with automated domain deduplication</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
          {resultMessage && (
            <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
              resultMessage.type === 'success' 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' 
                : 'bg-sky-500/10 border border-sky-500/30 text-sky-300'
            }`}>
              <Check className="w-4 h-4 shrink-0" />
              <span>{resultMessage.text}</span>
            </div>
          )}

          {/* Target Campaign Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Assign to Campaign
            </label>
            <select
              value={targetCampaignId}
              onChange={(e) => setTargetCampaignId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 focus:outline-none focus:border-amber-500/80"
            >
              <option value="">-- Do not link to campaign (Store in CRM only) --</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.niche})
                </option>
              ))}
            </select>
          </div>

          {/* Company Section */}
          <div className="pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              Company Information
            </h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Company Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Glossier, Linear, Aura Skincare"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    onBlur={handleWebsiteBlur}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Clean Domain
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Industry / Niche
                  </label>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="e.g. D2C Cosmetics, B2B SaaS"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Country / Region
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States, France"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Brief Overview / Brand Notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notes about product packaging, brand aesthetic, current site pain points..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Primary Decision Maker */}
          <div className="pt-2 border-t border-zinc-800/80">
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              Decision Maker Contact (Optional)
            </h4>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Emily Weiss"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Founder, Head of Creative"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emily@glossier.com"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    LinkedIn Profile URL
                  </label>
                  <input
                    type="text"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !companyName.trim()}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Add Company & Prospect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
