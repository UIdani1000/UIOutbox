import React, { useState } from 'react';
import { X, Film, Link as LinkIcon, Image, Sparkles } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';
import { CaseStudy, CaseStudyStatus } from '../../types';

interface CaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseStudyToEdit?: CaseStudy | null;
}

export const CaseStudyModal: React.FC<CaseStudyModalProps> = ({
  isOpen,
  onClose,
  caseStudyToEdit,
}) => {
  const { createCaseStudy, updateCaseStudy } = useCRM();

  const [name, setName] = useState(caseStudyToEdit?.name || '');
  const [niche, setNiche] = useState(caseStudyToEdit?.niche || 'D2C Skincare & Beauty');
  const [offer, setOffer] = useState(caseStudyToEdit?.offer || '3D Product Ad Animation & Interactive Teardown');
  const [description, setDescription] = useState(
    caseStudyToEdit?.description || 
    'High-retention 3D render and interaction design concept showing packaging physics and sleek mobile UI.'
  );
  const [portfolioUrl, setPortfolioUrl] = useState(
    caseStudyToEdit?.portfolio_url || 'https://bignssien.wixstudio.com/uidani'
  );
  const [videoUrl, setVideoUrl] = useState(
    caseStudyToEdit?.video_url || 'https://assets.mixkit.co/videos/preview/mixkit-liquid-cosmetic-products-41555-large.mp4'
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    caseStudyToEdit?.thumbnail_url || 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&auto=format&fit=crop&q=80'
  );
  const [status, setStatus] = useState<CaseStudyStatus>(caseStudyToEdit?.status || 'active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);

    try {
      if (caseStudyToEdit) {
        await updateCaseStudy(caseStudyToEdit.id, {
          name,
          niche,
          offer,
          description,
          portfolio_url: portfolioUrl,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          status,
        });
      } else {
        await createCaseStudy({
          name,
          niche,
          offer,
          description,
          portfolio_url: portfolioUrl,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          status,
        });
      }
      onClose();
    } catch (err) {
      console.error('Error saving case study:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      id="case-study-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div 
        id="case-study-modal-container"
        className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                {caseStudyToEdit ? 'Edit Case Study Asset' : 'Add Case Study & Creative Asset'}
              </h2>
              <p className="text-xs text-zinc-400">Store and link your custom design videos and portfolio links</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Case Study Title <span className="text-amber-400">*</span>
              </label>
              <input
                id="case-study-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Lumina Cosmetics 3D Teardown"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
              <select
                id="case-study-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as CaseStudyStatus)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 focus:outline-none focus:border-amber-500/80"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {/* Niche & Offer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Target Niche</label>
              <input
                id="case-study-niche-input"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. D2C Skincare, FinTech, Luxury"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Creative Offer</label>
              <input
                id="case-study-offer-input"
                type="text"
                value={offer}
                onChange={(e) => setOffer(e.target.value)}
                placeholder="e.g. 3D Ad Animation, UI Redesign"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Description & Key Talking Points
            </label>
            <textarea
              id="case-study-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the results, metrics, or visual highlight this asset demonstrates..."
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 resize-none"
            />
          </div>

          {/* Video & Portfolio URLs */}
          <div className="space-y-3 pt-2 border-t border-zinc-800/80">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center space-x-1.5">
                <Film className="w-3.5 h-3.5 text-zinc-400" />
                <span>Video Asset URL (Direct MP4 / Loom / YouTube / Storage)</span>
              </label>
              <input
                id="case-study-video-url-input"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center space-x-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                <span>Portfolio / Live Prototype URL</span>
              </label>
              <input
                id="case-study-portfolio-url-input"
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://bignssien.wixstudio.com/uidani"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center space-x-1.5">
                <Image className="w-3.5 h-3.5 text-zinc-400" />
                <span>Cover Thumbnail Image URL</span>
              </label>
              <input
                id="case-study-thumbnail-url-input"
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 font-mono text-xs"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-case-study"
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 rounded-md text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-zinc-950 transition-colors shadow-sm disabled:opacity-50"
            >
              {caseStudyToEdit ? 'Save Changes' : 'Save Asset to Library'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
