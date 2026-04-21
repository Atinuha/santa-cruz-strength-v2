import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Eye, EyeOff,
  Send, Save, Loader2, Monitor, Smartphone, Bold, Italic,
  AlignLeft, AlignCenter, AlignRight, Search, X, Check, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BLOCK_TYPES, DEFAULT_BLOCK, MERGE_FIELDS, blocksToPreviewHTML, blocksToHTML
} from '../../utils/emailBlocks';
import ImageUploadField from '../../components/ImageUploadField';
import api from '../../lib/api';

const GIPHY_KEY = 'dc6zaTOxFJmzC'; // free public beta key

// ── Colour presets ────────────────────────────────────────────────────────────
const COLOR_PRESETS = ['#0D5D3E','#1B7A4A','#FA5A5C','#F59E0B','#3B82F6','#8B5CF6','#1a1a1a','#444444','#888888','#ffffff'];

function ColorPicker({ value, onChange }) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {COLOR_PRESETS.map(c => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ background: c }} />
        ))}
      </div>
      <input type="color" value={value || '#333333'} onChange={e => onChange(e.target.value)}
        className="w-full h-7 rounded cursor-pointer bg-transparent border border-white/15" />
    </div>
  );
}

// ── GIF Picker ────────────────────────────────────────────────────────────────
function GifPicker({ onSelect, onClose }) {
  const [query, setQuery]   = useState('fitness gym');
  const [gifs, setGifs]     = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=g`;
      const res = await fetch(url);
      const d = await res.json();
      setGifs(d.data || []);
    } catch { toast.error('GIF search unavailable'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { search('gym workout strength'); }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111f16] border border-white/12 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-2 p-4 border-b border-white/8">
          <Search size={14} className="text-white/40" />
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(query)}
            placeholder="Search GIFs (press Enter)…"
            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-white/30" />
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={16} /></button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={22} className="animate-spin text-white/30" /></div>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
              {gifs.map(gif => (
                <button key={gif.id} onClick={() => { onSelect(gif.images.original.url); onClose(); }}
                  className="rounded-lg overflow-hidden hover:scale-105 transition-transform duration-150 active:scale-95">
                  <img src={gif.images.fixed_height_small.url} alt={gif.title}
                    className="w-full h-20 object-cover" loading="lazy" />
                </button>
              ))}
              {gifs.length === 0 && <p className="col-span-3 text-center text-white/30 text-sm py-8">No results</p>}
            </div>
          )}
          <p className="text-white/20 text-[10px] text-center mt-3">Powered by GIPHY · Rated G only</p>
        </div>
      </div>
    </div>
  );
}

// ── Block Editor (right panel) ────────────────────────────────────────────────
function BlockEditor({ block, onChange, onInsertMerge }) {
  if (!block) return (
    <div className="h-full flex items-center justify-center text-center p-6">
      <div>
        <p className="text-white/25 text-sm font-semibold">Select a block</p>
        <p className="text-white/15 text-xs mt-1">to edit its settings</p>
      </div>
    </div>
  );

  const set = (k, v) => onChange({ ...block, [k]: v });
  const inputCls = 'w-full bg-white/5 border border-white/12 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#1B7A4A]/50 placeholder:text-white/25';
  const labelCls = 'block text-[10px] text-white/45 mb-1 font-semibold uppercase tracking-wider';

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Merge field chips */}
      <div>
        <p className={labelCls}>Insert Merge Field</p>
        <div className="flex flex-wrap gap-1">
          {MERGE_FIELDS.map(mf => (
            <button key={mf.tag} type="button" onClick={() => onInsertMerge(mf.tag)}
              className="text-[10px] px-2 py-1 rounded-full bg-[#1B7A4A]/15 border border-[#1B7A4A]/25 text-[#7FCCA6] hover:bg-[#1B7A4A]/30 transition-colors font-mono">
              {mf.tag}
            </button>
          ))}
        </div>
      </div>

      {/* ── HEADER ── */}
      {block.type === 'header' && (<>
        <div><label className={labelCls}>Title</label>
          <input value={block.title || ''} onChange={e => set('title', e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Subtitle</label>
          <input value={block.subtitle || ''} onChange={e => set('subtitle', e.target.value)} className={inputCls} placeholder="Optional tagline" /></div>
        <div><label className={labelCls}>Background</label><ColorPicker value={block.bgColor} onChange={v => set('bgColor', v)} /></div>
      </>)}

      {/* ── TEXT ── */}
      {block.type === 'text' && (<>
        <div>
          <label className={labelCls}>Content</label>
          <textarea id="text-editor" value={block.content || ''} onChange={e => set('content', e.target.value)}
            rows={6} className={inputCls + ' resize-none leading-relaxed'} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[['left','Left',<AlignLeft size={12}/>],['center','Center',<AlignCenter size={12}/>],['right','Right',<AlignRight size={12}/>]].map(([v,l,ic]) => (
            <button key={v} type="button" onClick={() => set('align', v)}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[10px] font-semibold transition-colors ${block.align===v?'bg-[#1B7A4A] border-[#1B7A4A] text-white':'bg-white/4 border-white/12 text-white/40 hover:border-white/25'}`}>
              {ic}{l}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1"><label className={labelCls}>Size (px)</label>
            <select value={block.size || '15'} onChange={e => set('size', e.target.value)}
              className={inputCls + ' appearance-none'} style={{ background: 'rgba(255,255,255,0.05)' }}>
              {['11','12','13','14','15','16','18','20','24','28','32'].map(s => <option key={s} value={s} style={{background:'#111f16'}}>{s}px</option>)}
            </select>
          </div>
          <div className="flex-1"><label className={labelCls}>Bold</label>
            <button type="button" onClick={() => set('bold', !block.bold)}
              className={`w-full py-2 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-bold transition-colors ${block.bold?'bg-[#1B7A4A] border-[#1B7A4A] text-white':'bg-white/4 border-white/12 text-white/40'}`}>
              <Bold size={12}/> Bold
            </button>
          </div>
        </div>
        <div><label className={labelCls}>Text Color</label><ColorPicker value={block.color} onChange={v => set('color', v)} /></div>
        <div><label className={labelCls}>Background</label><ColorPicker value={block.bgColor || '#ffffff'} onChange={v => set('bgColor', v)} /></div>
      </>)}

      {/* ── IMAGE ── */}
      {block.type === 'image' && (<>
        <ImageUploadField label="Image" value={block.url} onChange={url => set('url', url)} darkMode={true} />
        <div><label className={labelCls}>Alt Text</label><input value={block.alt||''} onChange={e=>set('alt',e.target.value)} className={inputCls} placeholder="Describe the image" /></div>
        <div><label className={labelCls}>Caption</label><input value={block.caption||''} onChange={e=>set('caption',e.target.value)} className={inputCls} placeholder="Optional caption" /></div>
        <div><label className={labelCls}>Width %</label><input type="range" min="30" max="100" value={block.width||100} onChange={e=>set('width',parseInt(e.target.value))} className="w-full accent-[#1B7A4A]" />
          <p className="text-white/30 text-[10px] text-right">{block.width||100}%</p></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={()=>set('rounded',!block.rounded)} className={`w-8 h-4 rounded-full relative transition-colors ${block.rounded?'bg-[#1B7A4A]':'bg-white/15'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${block.rounded?'left-4':'left-0.5'}`} />
          </div>
          <span className="text-xs text-white/55">Rounded corners</span>
        </label>
      </>)}

      {/* ── GIF ── */}
      {block.type === 'gif' && (<>
        <div><label className={labelCls}>GIF URL</label>
          <input value={block.url||''} onChange={e=>set('url',e.target.value)} className={inputCls} placeholder="Paste GIF URL or search below" />
        </div>
        <button type="button" onClick={() => set('_gifPicker', true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#1B7A4A]/15 border border-[#1B7A4A]/25 text-[#7FCCA6] text-sm font-semibold hover:bg-[#1B7A4A]/25 transition-colors">
          🔍 Search GIPHY
        </button>
        {block.url && <img src={block.url} alt="preview" className="w-full rounded-lg" />}
      </>)}

      {/* ── BUTTON ── */}
      {block.type === 'button' && (<>
        <div><label className={labelCls}>Button Text</label><input value={block.text||''} onChange={e=>set('text',e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Link URL</label><input value={block.url||''} onChange={e=>set('url',e.target.value)} className={inputCls} placeholder="https://..." /></div>
        <div><label className={labelCls}>Background</label><ColorPicker value={block.bgColor} onChange={v=>set('bgColor',v)} /></div>
        <div><label className={labelCls}>Text Color</label><ColorPicker value={block.textColor} onChange={v=>set('textColor',v)} /></div>
        <div className="grid grid-cols-3 gap-2">
          {[['left','Left'],['center','Center'],['right','Right']].map(([v,l]) => (
            <button key={v} type="button" onClick={()=>set('align',v)}
              className={`py-1.5 rounded-lg border text-[10px] font-semibold transition-colors ${block.align===v?'bg-[#1B7A4A] border-[#1B7A4A] text-white':'bg-white/4 border-white/12 text-white/40'}`}>{l}</button>
          ))}
        </div>
      </>)}

      {/* ── SPACER ── */}
      {block.type === 'spacer' && (
        <div><label className={labelCls}>Height (px)</label>
          <input type="range" min="8" max="80" value={block.height||24} onChange={e=>set('height',parseInt(e.target.value))} className="w-full accent-[#1B7A4A]" />
          <p className="text-white/30 text-[10px] text-right">{block.height||24}px</p>
        </div>
      )}

      {/* ── DIVIDER ── */}
      {block.type === 'divider' && (
        <div><label className={labelCls}>Line Color</label><ColorPicker value={block.color||'#eeeeee'} onChange={v=>set('color',v)} /></div>
      )}

      {/* ── FOOTER ── */}
      {block.type === 'footer' && (<>
        <div><label className={labelCls}>Address</label><input value={block.address||''} onChange={e=>set('address',e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Phone</label><input value={block.phone||''} onChange={e=>set('phone',e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Website</label><input value={block.website||''} onChange={e=>set('website',e.target.value)} className={inputCls} /></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={()=>set('unsubscribe',!block.unsubscribe)} className={`w-8 h-4 rounded-full relative transition-colors ${block.unsubscribe!==false?'bg-[#1B7A4A]':'bg-white/15'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${block.unsubscribe!==false?'left-4':'left-0.5'}`} />
          </div>
          <span className="text-xs text-white/55">Unsubscribe line</span>
        </label>
      </>)}
    </div>
  );
}

// ── Main Email Builder ────────────────────────────────────────────────────────
export default function EmailBuilder() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign]   = useState(null);
  const [blocks, setBlocks]       = useState([]);
  const [subject, setSubject]     = useState("We've been thinking about you.");
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [preview, setPreview]     = useState(false);
  const [mobileView, setMobileView] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [gifPicker, setGifPicker] = useState(false);
  const iframeRef = useRef(null);

  // Load campaign
  useEffect(() => {
    api.get(`/staff/campaigns/${campaignId}`)
      .then(res => {
        const d = res.data;
        setCampaign(d);
        setBlocks(d.blocks?.length ? d.blocks : getDefaultBlocks());
        if (d.subject_options?.[0]) setSubject(d.subject_options[0]);
      }).catch(() => toast.error('Failed to load campaign'));
  }, [campaignId]);

  // Update iframe preview
  useEffect(() => {
    if (!preview || !iframeRef.current) return;
    const html = blocksToPreviewHTML(blocks);
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (doc) { doc.open(); doc.write(html); doc.close(); }
  }, [preview, blocks]);

  function getDefaultBlocks() {
    return [
      { ...DEFAULT_BLOCK.header, id: Date.now() + 1 },
      { ...DEFAULT_BLOCK.text,   id: Date.now() + 2,
        content: "Hey {{first_name}},\n\nWe've been thinking about you.\n\nWe just wrapped our 11th annual Iron Roses, and moments like that remind us what this place really is.\n\nYou were part of that. And it's not the same without you here." },
      { ...DEFAULT_BLOCK.button, id: Date.now() + 3,
        text: '🔥 Come Back Stronger — 2 Months Free', url: '{{join_url}}' },
      { ...DEFAULT_BLOCK.text,   id: Date.now() + 4, size: '13', color: '#888888',
        content: "You don't need to be \"ready.\" You just need to walk back through the door.\n\n— Santa Cruz Strength" },
      { ...DEFAULT_BLOCK.footer, id: Date.now() + 5 },
    ];
  }

  const addBlock = (type) => {
    const newBlock = { ...DEFAULT_BLOCK[type], id: Date.now() };
    const insertAt = selectedIdx !== null ? selectedIdx + 1 : blocks.length;
    const next = [...blocks];
    next.splice(insertAt, 0, newBlock);
    setBlocks(next);
    setSelectedIdx(insertAt);
  };

  const updateBlock = (idx, updated) => {
    if (updated._gifPicker) { setGifPicker(true); return; }
    setBlocks(b => b.map((block, i) => i === idx ? { ...block, ...updated, id: block.id } : block));
  };

  const deleteBlock = (idx) => {
    setBlocks(b => b.filter((_, i) => i !== idx));
    setSelectedIdx(null);
  };

  const moveBlock = (idx, dir) => {
    const next = [...blocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setBlocks(next);
    setSelectedIdx(swap);
  };

  const insertMerge = (tag) => {
    if (selectedIdx === null) return;
    const block = blocks[selectedIdx];
    if (block.type !== 'text') return;
    const ta = document.getElementById('text-editor');
    const pos = ta?.selectionStart ?? (block.content || '').length;
    const before = (block.content || '').slice(0, pos);
    const after  = (block.content || '').slice(pos);
    updateBlock(selectedIdx, { ...block, content: before + tag + after });
    setTimeout(() => { if (ta) { ta.selectionStart = ta.selectionEnd = pos + tag.length; ta.focus(); } }, 0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const html = blocksToHTML(blocks, { first_name: '{{first_name}}', last_name: '{{last_name}}',
        gym_name: 'Santa Cruz Strength', join_url: '{{join_url}}', gym_phone: '(408) 337-6709' });
      await api.put(`/staff/campaigns/${campaignId}`, { blocks, email_html_template: html, subject_options: [subject] });
      toast.success('Email saved');
    } catch (err) { console.error('Failed to save email:', err); toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleTestSend = async () => {
    setTestSending(true);
    try {
      const res = await api.post(`/staff/campaigns/${campaignId}/test-send`);
      toast.success(`Test email sent to ${res.data.sent_to}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to send test'); }
    finally { setTestSending(false); }
  };

  if (!campaign) return <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center"><Loader2 size={24} className="animate-spin text-white/30" /></div>;

  const selectedBlock = selectedIdx !== null ? blocks[selectedIdx] : null;

  return (
    <div className="min-h-screen bg-[var(--ink)] flex flex-col" style={{ height: '100vh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-[#0a0f0d] shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/staff/campaigns" className="text-white/40 hover:text-white transition-colors"><ArrowLeft size={16} /></Link>
          <div>
            <p className="text-white font-semibold text-sm">{campaign.name}</p>
            <p className="text-white/30 text-[10px]">Email Builder</p>
          </div>
        </div>

        {/* Subject line */}
        <input value={subject} onChange={e => setSubject(e.target.value)}
          className="hidden md:block w-72 bg-white/5 border border-white/12 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1B7A4A]/50 placeholder:text-white/25"
          placeholder="Email subject line…" />

        <div className="flex items-center gap-2">
          {/* Preview toggle */}
          <button onClick={() => setPreview(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${preview ? 'bg-[#1B7A4A] border-[#1B7A4A] text-white' : 'bg-white/5 border-white/12 text-white/50 hover:border-white/25'}`}>
            {preview ? <EyeOff size={12}/> : <Eye size={12}/>} Preview
          </button>
          {preview && (
            <button onClick={() => setMobileView(v => !v)}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${mobileView ? 'bg-[#1B7A4A]/20 border-[#1B7A4A]/40 text-[#7FCCA6]' : 'bg-white/5 border-white/12 text-white/40'}`}>
              {mobileView ? <Smartphone size={14}/> : <Monitor size={14}/>}
            </button>
          )}
          <button onClick={handleTestSend} disabled={testSending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/6 border border-white/12 text-white/60 hover:text-white text-xs font-semibold transition-colors disabled:opacity-40">
            {testSending ? <Loader2 size={12} className="animate-spin"/> : <Send size={12}/>} Test
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg btn-scs-primary text-xs font-bold disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>} Save
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Block palette */}
        <div className="w-44 shrink-0 border-r border-white/8 bg-[#0c1510] flex flex-col overflow-y-auto">
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-3 pt-3 pb-2">Add Blocks</p>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-colors text-left group"
              data-testid={`add-block-${bt.type}`}>
              <span className="text-base shrink-0">{bt.emoji}</span>
              <div>
                <p className="text-white/70 text-xs font-semibold group-hover:text-white transition-colors">{bt.label}</p>
                <p className="text-white/25 text-[9px]">{bt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* CENTER: Canvas or Preview */}
        <div className="flex-1 overflow-y-auto bg-[#0f1a14]">
          {preview ? (
            <div className="flex items-start justify-center p-6">
              <iframe ref={iframeRef} title="Email Preview"
                style={{ width: mobileView ? 390 : 620, height: 800, border: 'none', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
            </div>
          ) : (
            <div className="max-w-[620px] mx-auto py-6 px-4 space-y-1">
              {blocks.map((block, idx) => (
                <div key={block.id} onClick={() => setSelectedIdx(idx)}
                  className={`relative group rounded-lg border-2 transition-all duration-150 cursor-pointer ${selectedIdx === idx ? 'border-[#1B7A4A] ring-2 ring-[#1B7A4A]/20' : 'border-transparent hover:border-white/15'}`}>

                  {/* Block actions overlay */}
                  <div className={`absolute -top-3 right-2 flex items-center gap-1 z-10 transition-opacity ${selectedIdx === idx ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button onClick={e => { e.stopPropagation(); moveBlock(idx, -1); }} disabled={idx === 0}
                      className="w-6 h-6 bg-[#111f16] border border-white/15 rounded text-white/50 hover:text-white flex items-center justify-center disabled:opacity-25 transition-colors">
                      <ChevronUp size={11}/>
                    </button>
                    <button onClick={e => { e.stopPropagation(); moveBlock(idx, 1); }} disabled={idx === blocks.length - 1}
                      className="w-6 h-6 bg-[#111f16] border border-white/15 rounded text-white/50 hover:text-white flex items-center justify-center disabled:opacity-25 transition-colors">
                      <ChevronDown size={11}/>
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteBlock(idx); }}
                      className="w-6 h-6 bg-red-500/20 border border-red-500/30 rounded text-red-400 hover:bg-red-500/40 flex items-center justify-center transition-colors">
                      <Trash2 size={10}/>
                    </button>
                  </div>

                  {/* Block preview */}
                  <BlockPreview block={block} />
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl">
                  <p className="text-white/25 text-sm">Click a block on the left to start building</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Block editor */}
        {!preview && (
          <div className="w-64 shrink-0 border-l border-white/8 bg-[#0c1510] overflow-y-auto">
            <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider px-4 pt-3 pb-2 border-b border-white/6">
              {selectedBlock ? `Edit: ${selectedBlock.type}` : 'Block Settings'}
            </p>
            <BlockEditor block={selectedBlock} onChange={b => updateBlock(selectedIdx, b)} onInsertMerge={insertMerge} />
          </div>
        )}
      </div>

      {/* Subject line (mobile) */}
      <div className="md:hidden px-4 py-2 border-t border-white/8 shrink-0">
        <input value={subject} onChange={e => setSubject(e.target.value)}
          className="w-full bg-white/5 border border-white/12 text-white text-xs px-3 py-2 rounded-lg focus:outline-none"
          placeholder="Subject line…" />
      </div>

      {/* GIF Picker modal */}
      {gifPicker && selectedIdx !== null && (
        <GifPicker
          onSelect={url => { updateBlock(selectedIdx, { ...blocks[selectedIdx], url, _gifPicker: false }); }}
          onClose={() => setGifPicker(false)}
        />
      )}
    </div>
  );
}

// ── Simplified canvas preview for each block ──────────────────────────────────
function BlockPreview({ block }) {
  const style = { fontFamily: "'Helvetica Neue', Arial, sans-serif" };

  switch (block.type) {
    case 'header':
      return <div style={{ ...style, background: block.bgColor || '#0D5D3E', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ margin: 0, color: '#CDE4DF', fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>Santa Cruz Strength</p>
        <p style={{ margin: '6px 0 0', color: block.textColor || '#fff', fontSize: 18, fontWeight: 800 }}>{block.title || 'Title'}</p>
        {block.subtitle && <p style={{ margin: '4px 0 0', color: '#CDE4DF', fontSize: 12 }}>{block.subtitle}</p>}
      </div>;

    case 'text':
      return <div style={{ ...style, padding: '14px 24px', background: block.bgColor || '#fff', textAlign: block.align || 'left', fontSize: parseInt(block.size || 15), color: block.color || '#333', fontWeight: block.bold ? 700 : 400, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
        {(block.content || '').slice(0, 200)}{(block.content || '').length > 200 ? '…' : ''}
      </div>;

    case 'image':
      return <div style={{ padding: '12px 24px', background: block.bgColor || '#fff', textAlign: 'center' }}>
        {block.url
          ? <img src={block.url} alt={block.alt} style={{ maxWidth: `${block.width || 100}%`, borderRadius: block.rounded ? 8 : 0 }} />
          : <div style={{ height: 80, background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 13 }}>🖼️ No image yet</div>}
      </div>;

    case 'gif':
      return <div style={{ padding: '12px 24px', background: block.bgColor || '#fff', textAlign: 'center' }}>
        {block.url
          ? <img src={block.url} alt="gif" style={{ maxWidth: `${block.width || 100}%` }} />
          : <div style={{ height: 80, background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 13 }}>🎬 No GIF yet — click to search</div>}
      </div>;

    case 'button':
      return <div style={{ padding: '14px 24px', textAlign: block.align || 'center' }}>
        <span style={{ display: 'inline-block', padding: '11px 24px', background: block.bgColor || '#FA5A5C', color: block.textColor || '#fff', borderRadius: 8, fontWeight: 700, fontSize: 13 }}>{block.text || 'Button'}</span>
      </div>;

    case 'divider':
      return <div style={{ padding: '8px 24px', background: '#fff' }}><hr style={{ border: 'none', borderTop: `1px solid ${block.color || '#eee'}`, margin: 0 }} /></div>;

    case 'spacer':
      return <div style={{ height: block.height || 24, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#ddd', fontSize: 10 }}>↕ {block.height || 24}px</span>
      </div>;

    case 'footer':
      return <div style={{ ...style, padding: '16px 24px', background: block.bgColor || '#f9f9f9', textAlign: 'center', borderTop: '1px solid #eee' }}>
        <p style={{ margin: 0, fontSize: 11, color: block.textColor || '#aaa' }}>{block.address}</p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: block.textColor || '#aaa' }}>{block.phone} · {block.website}</p>
        {block.unsubscribe !== false && <p style={{ margin: '6px 0 0', fontSize: 10, color: '#ccc' }}>To unsubscribe, reply with STOP.</p>}
      </div>;

    default:
      return <div style={{ padding: '8px 24px', color: '#999', fontSize: 12 }}>{block.type} block</div>;
  }
}
