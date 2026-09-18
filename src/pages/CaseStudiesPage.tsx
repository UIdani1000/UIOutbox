import React, { useState } from 'react';
import { 
  Film, 
  Plus, 
  ExternalLink, 
  Play, 
  Edit3, 
  Layers, 
  CheckCircle2, 
  Clock, 
  Archive,
  Image,
  Globe
} from 'lucide-react';
import { useCRM } from '../context/CRMContext';
import { CaseStudy, CaseStudyStatus } from '../types';
import { CaseStudyModal } from '../components/caseStudies/CaseStudyModal';

export const CaseStudiesPage: React.FC = () => {
  const { caseStudies, updateCaseStudy } = useCRM();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCaseStudy, setEditingCaseStudy] = useState<CaseStudy | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const filteredCaseStudies = caseStudies.filter(
    cs => statusFilter === 'all' || cs.status === statusFilter
  );

  const handleOpenAdd = () => {
    setEditingCaseStudy(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cs: CaseStudy) => {
    setEditingCaseStudy(cs);
    setIsModalOpen(true);
  };

  return (
    <div id="case-studies-page" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">Case Study & Creative Asset Library</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Store, associate, and distribute your custom design videos, product teardowns, and portfolio links
          </p>
        </div>

        <button
          id="btn-add-case-study"
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Creative Asset</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-800 pb-3">
        {['all', 'active', 'draft', 'archived'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-md text-xs capitalize transition-colors ${
              statusFilter === st
                ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Case Studies Grid */}
      {filteredCaseStudies.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 mx-auto">
            <Film className="w-5 h-5" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-sm font-semibold text-zinc-200">No case studies in library</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Add your personal video animations, 3D interaction teardowns, and case study links to associate with campaigns.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 font-semibold text-xs transition-colors shadow-sm"
          >
            Add First Case Study
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCaseStudies.map((cs) => (
            <div
              key={cs.id}
              id={`case-study-card-${cs.id}`}
              className="bg-zinc-900/70 border border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:border-zinc-700 transition-all group"
            >
              {/* Thumbnail / Video Preview Area */}
              <div className="relative aspect-video bg-zinc-950 border-b border-zinc-800 overflow-hidden flex items-center justify-center">
                {cs.thumbnail_url ? (
                  <img
                    src={cs.thumbnail_url}
                    alt={cs.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-400 space-y-2">
                    <Film className="w-8 h-8 text-zinc-400" />
                    <span className="text-[11px]">Video Asset</span>
                  </div>
                )}

                {cs.video_url && (
                  <button
                    onClick={() => setSelectedVideo(cs.video_url)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </button>
                )}

                <div className="absolute top-2.5 right-2.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold backdrop-blur-md ${
                    cs.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : cs.status === 'draft'
                      ? 'bg-zinc-800/80 text-zinc-300 border border-zinc-700'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {cs.status}
                  </span>
                </div>
              </div>

              {/* Content Details */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                    {cs.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                    {cs.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-zinc-800/60 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-zinc-400 text-[11px]">Target Niche:</span>
                    <span className="font-medium">{cs.niche || 'General'}</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-zinc-400 text-[11px]">Creative Offer:</span>
                    <span className="font-medium truncate max-w-[160px]">{cs.offer || 'Video Animation'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs">
                  {cs.portfolio_url ? (
                    <a
                      href={cs.portfolio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-400 hover:text-amber-400 flex items-center space-x-1 transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Live Portfolio</span>
                    </a>
                  ) : (
                    <span />
                  )}

                  <button
                    onClick={() => handleOpenEdit(cs)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Modal Player */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-zinc-800 flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-200">Video Asset Preview</span>
              <button 
                onClick={() => setSelectedVideo(null)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-1"
              >
                Close
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {selectedVideo.endsWith('.mp4') ? (
                <video src={selectedVideo} controls autoPlay className="w-full h-full" />
              ) : (
                <iframe 
                  src={selectedVideo} 
                  title="Video Player" 
                  className="w-full h-full border-0" 
                  allowFullScreen
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <CaseStudyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        caseStudyToEdit={editingCaseStudy}
      />
    </div>
  );
};
