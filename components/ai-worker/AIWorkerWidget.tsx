'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAIWorker } from './AIWorkerProvider';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import {
  Sparkles, X, Send, RotateCcw, Mic, MicOff,
  ShoppingCart, Truck, Receipt, BarChart3, Package,
  ChevronDown, ScanLine, Sun, Moon, Zap, Radio,
  ChevronRight, Check, Cpu,
} from 'lucide-react';
import OCRPurchaseModal from '@/components/purchases/OCRPurchaseModal';
import type { AIProvider } from './AIWorkerProvider';

// ─── Model definitions ────────────────────────────────────────────────────────
interface ModelDef {
  key:   string;
  label: string;
  badge: string | null;
  desc:  string;
  pros:  readonly string[];
}

const OPENAI_MODELS: ModelDef[] = [
  {
    key:   'gpt-5-nano',
    label: 'Lite',
    badge: null,
    desc:  'Slowest responses at the lowest cost. Great for simple queries, quick lookups, and routine tasks.',
    pros:  ['Lowest cost', 'Simple tasks', 'Fast for basics'],
  },
  {
    key:   'gpt-5-mini',
    label: 'Standard',
    badge: null,
    desc:  'The best balance of speed and intelligence. Handles most business tasks with accuracy.',
    pros:  ['Balanced speed', 'Strong reasoning', 'Everyday tasks'],
  },
  {
    key:   'gpt-5.2',
    label: 'Pro',
    badge: null,
    desc:  'Advanced reasoning for complex analysis, multi-step workflows, and nuanced decisions.',
    pros:  ['Deep analysis', 'Multi-step logic', 'Complex queries'],
  },
  {
    key:   'gpt-5.4',
    label: 'Supra',
    badge: 'Best',
    desc:  'The most capable OpenAI model. Use for high-stakes decisions and demanding tasks.',
    pros:  ['Maximum capability', 'Best accuracy', 'High-stakes tasks'],
  },
];

const ANTHROPIC_MODELS: ModelDef[] = [
  {
    key:   'claude-haiku-4-5-20251001',
    label: 'Lite',
    badge: null,
    desc:  'Claude Haiku — fastest and most compact. Great for quick queries and routine tasks.',
    pros:  ['Fastest', 'Cost-efficient', 'Simple tasks'],
  },
  {
    key:   'claude-sonnet-4-5',
    label: 'Standard',
    badge: null,
    desc:  'Claude Sonnet — balanced performance and intelligence for everyday business tasks.',
    pros:  ['Balanced speed', 'Strong reasoning', 'Everyday tasks'],
  },
  {
    key:   'claude-sonnet-4-6',
    label: 'Pro',
    badge: null,
    desc:  'Claude Sonnet 4.6 — advanced reasoning for complex analysis and multi-step workflows.',
    pros:  ['Deep analysis', 'Multi-step logic', 'Complex queries'],
  },
  {
    key:   'claude-opus-4-5',
    label: 'Supra',
    badge: 'Best',
    desc:  'Claude Opus — the most capable model for high-stakes decisions and demanding tasks.',
    pros:  ['Maximum capability', 'Best accuracy', 'High-stakes tasks'],
  },
];

function getModels(provider: AIProvider): ModelDef[] {
  return provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_MODELS;
}

function getDefaultModel(provider: AIProvider): string {
  return provider === 'anthropic' ? 'claude-sonnet-4-5' : 'gpt-5-mini';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AIWorkerWidgetProps {
  products?:          any[];
  suppliers?:         any[];
  nextSKU?:           string;
  onSupplierCreated?: (supplier: any) => void;
  onProductCreated?:  (product: any)  => void;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function renderMessage(text: string) {
  return text.split('\n').map((line, li, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={li}>
        {parts.map((p, i) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
            : <span key={i}>{p}</span>
        )}
        {li < arr.length - 1 && <br />}
      </span>
    );
  });
}

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { icon: ShoppingCart, label: 'New Sale',        prompt: 'I need to record a sale',                                   ocr: false },
  { icon: Truck,        label: 'New Purchase',    prompt: 'I need to record a purchase from a supplier',              ocr: false },
  { icon: ScanLine,     label: 'Scan Invoice',    prompt: '',                                                          ocr: true  },
  { icon: Receipt,      label: 'New Expense',     prompt: 'I need to record an expense',                              ocr: false },
  { icon: Package,      label: 'Add Product',     prompt: 'I want to add a new product to inventory',                 ocr: false },
  { icon: BarChart3,    label: "Today's Summary", prompt: "Show me today's summary of sales, purchases and expenses",  ocr: false },
];

const MOBILE_NAV_HEIGHT = 72;

// ─── Model Selector ───────────────────────────────────────────────────────────
function ModelSelector({
  models,
  selectedModel,
  onSelect,
  isDark,
  th,
}: {
  models:        ModelDef[];
  selectedModel: string;
  onSelect:      (key: string) => void;
  isDark:        boolean;
  th:            Record<string, string>;
}) {
  const [expandedKey,   setExpandedKey]   = useState<string | null>(null);
  const [selectorOpen,  setSelectorOpen]  = useState(false);

  const selectedMeta = models.find(m => m.key === selectedModel) ?? models[1];
  const isGold       = (key: string) => key === models[models.length - 1].key;
  const accentColor  = (key: string) => isGold(key) ? '#f59e0b' : 'var(--autocity-accent)';

  return (
    <div className="flex-shrink-0" style={{ borderBottom: `1px solid ${th.headerBorder}` }}>
      {/* Collapsed trigger */}
      <button
        onClick={() => { setSelectorOpen(o => !o); setExpandedKey(null); }}
        className="w-full flex items-center justify-between px-4 py-2.5 transition-all"
        style={{ background: selectorOpen ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') : 'transparent' }}
      >
        <div className="flex items-center gap-2">
          <Cpu size={13} style={{ color: accentColor(selectedModel) }} />
          <span className="text-xs font-medium" style={{ color: th.headerSub }}>Model</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{
              background: isGold(selectedModel)
                ? (isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)')
                : (isDark ? 'var(--autocity-accent-12)'  : 'var(--autocity-accent-08)'),
              border: `1px solid ${isGold(selectedModel) ? 'rgba(245,158,11,0.35)' : 'var(--autocity-accent-35)'}`,
            }}
          >
            <span className="text-[11px] font-bold" style={{ color: accentColor(selectedModel) }}>
              {selectedMeta.label}
            </span>
            {selectedMeta.badge && (
              <span className="text-[9px] font-black px-1 py-0.5 rounded"
                style={{ background: accentColor(selectedModel), color: '#fff', letterSpacing: '0.04em' }}>
                {selectedMeta.badge}
              </span>
            )}
          </div>
          <ChevronDown size={13} style={{
            color: th.headerSub,
            transform: selectorOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
          }} />
        </div>
      </button>

      {/* Expanded panel */}
      {selectorOpen && (
        <div className="px-3 pb-3 space-y-1.5"
          style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)' }}>
          {models.map((model) => {
            const active   = selectedModel === model.key;
            const expanded = expandedKey === model.key;
            const gold     = isGold(model.key);
            const accent   = accentColor(model.key);
            return (
              <div key={model.key} className="rounded-xl overflow-hidden transition-all"
                style={{
                  border: `1px solid ${active
                    ? (gold ? 'rgba(245,158,11,0.40)' : 'var(--autocity-accent-40)')
                    : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')}`,
                  background: active
                    ? (gold
                        ? (isDark ? 'rgba(245,158,11,0.07)' : 'rgba(245,158,11,0.05)')
                        : (isDark ? 'var(--autocity-accent-07)'  : 'var(--autocity-accent-05)'))
                    : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)'),
                }}>
                <div className="flex items-center">
                  <button onClick={() => setExpandedKey(expandedKey === model.key ? null : model.key)}
                    className="flex items-center gap-2.5 flex-1 px-3 py-2.5 text-left">
                    <ChevronRight size={12} style={{
                      color: active ? accent : th.headerSub,
                      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.18s ease', flexShrink: 0,
                    }} />
                    <span className="text-xs font-semibold"
                      style={{ color: active ? accent : (isDark ? '#e5e7eb' : '#111827') }}>
                      {model.label}
                    </span>
                    {model.badge && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md"
                        style={{ background: accent, color: '#fff', letterSpacing: '0.05em' }}>
                        {model.badge}
                      </span>
                    )}
                  </button>
                  <button onClick={() => { onSelect(model.key); setSelectorOpen(false); setExpandedKey(null); }}
                    className="flex items-center justify-center w-8 h-8 mr-2 rounded-lg flex-shrink-0 transition-all active:scale-95"
                    style={{
                      background: active ? accent : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'}`,
                    }}>
                    <Check size={11} style={{ color: active ? '#fff' : (isDark ? '#6b7280' : '#9ca3af') }} />
                  </button>
                </div>
                {expanded && (
                  <div className="px-3 pb-3 pt-0"
                    style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                    <p className="text-[11px] leading-relaxed mt-2.5 mb-2"
                      style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                      {model.desc}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {model.pros.map(pro => (
                        <span key={pro} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                          style={{
                            background: gold
                              ? (isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)')
                              : (isDark ? 'var(--autocity-accent-10)'  : 'var(--autocity-accent-07)'),
                            color: accent,
                            border: `1px solid ${gold ? 'rgba(245,158,11,0.25)' : 'var(--autocity-accent-25)'}`,
                          }}>
                          {pro}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────
export function AIWorkerWidget({
  products          = [],
  suppliers         = [],
  nextSKU           = '10001',
  onSupplierCreated,
  onProductCreated,
}: AIWorkerWidgetProps) {
  const {
    messages, isOpen, isLoading, ocrModalOpen, isDark,
    isWidgetEnabled, activeProvider,
    openOcrModal, closeOcrModal,
    toggleOpen, sendMessage, sendOcrPurchase, clearHistory,
  } = useAIWorker();

  // Guard: don't render anything if widget is disabled
  if (!isWidgetEnabled) return null;

  const models       = getModels(activeProvider);
  const defaultModel = getDefaultModel(activeProvider);

  const [input,         setInput]         = useState('');
  const [showClear,     setShowClear]     = useState(false);
  const [isMobile,      setIsMobile]      = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(defaultModel);

  // Sync default model when provider changes
  useEffect(() => {
    setSelectedModel(getDefaultModel(activeProvider));
  }, [activeProvider]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const voice = useVoiceInput({
    onTranscript: (text) => {
      setInput(text);
      setTimeout(() => { setInput(''); sendMessage(text, selectedModel); }, 800);
    },
    onError: (msg) => console.warn('[Voice]', msg),
  });

  const micActive = voice.isLive || voice.isRecording;
  const micBusy   = voice.status === 'connecting' || voice.status === 'processing';

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const th: Record<string, string> = {
    fabBgActive:         isDark ? '#0A0A0A'                            : '#ffffff',
    fabBorderActive:     isDark ? 'rgba(255,255,255,0.10)'             : 'rgba(0,0,0,0.08)',
    fabBgIdle:           'linear-gradient(135deg, var(--autocity-accent), var(--autocity-accent-strong))',
    fabShadow:           isDark ? 'var(--autocity-accent-25)'               : 'var(--autocity-accent-20)',
    panelBg:             isDark
      ? 'linear-gradient(160deg, #0A0A0A 0%, #050505 60%, #0A0A0A 100%)'
      : 'linear-gradient(160deg, #ffffff 0%, #f9fafb 60%, #ffffff 100%)',
    panelBorder:         isDark ? 'rgba(255,255,255,0.08)'             : 'rgba(0,0,0,0.08)',
    panelShadow:         isDark ? 'rgba(0,0,0,0.80)'                   : 'rgba(0,0,0,0.15)',
    headerBorder:        isDark ? 'rgba(255,255,255,0.06)'             : 'rgba(0,0,0,0.06)',
    headerTitle:         isDark ? '#ffffff'                            : '#111827',
    headerSub:           isDark ? '#6b7280'                            : '#9ca3af',
    headerBtnHover:      isDark ? 'rgba(255,255,255,0.08)'             : 'rgba(0,0,0,0.08)',
    headerBtnText:       isDark ? '#9ca3af'                            : '#6b7280',
    clearBarBg:          isDark ? '#0A0A0A'                            : '#f9fafb',
    clearBarBorder:      isDark ? 'rgba(255,255,255,0.06)'             : 'rgba(0,0,0,0.06)',
    clearBarText:        isDark ? '#9ca3af'                            : '#6b7280',
    userBubbleBg:        'linear-gradient(135deg, var(--autocity-accent), var(--autocity-accent-strong))',
    userBubbleText:      '#ffffff',
    aiBubbleBg:          isDark ? 'rgba(255,255,255,0.05)'             : 'rgba(0,0,0,0.04)',
    aiBubbleBorder:      isDark ? 'rgba(255,255,255,0.08)'             : 'rgba(0,0,0,0.08)',
    aiBubbleText:        isDark ? '#e5e7eb'                            : '#111827',
    errBubbleBg:         isDark ? 'var(--autocity-accent-08)'               : 'var(--autocity-accent-06)',
    errBubbleBorder:     isDark ? 'var(--autocity-accent-20)'               : 'var(--autocity-accent-15)',
    errBubbleText:       isDark ? '#fca5a5'                            : '#b91c1c',
    avatarBg:            isDark ? 'var(--autocity-accent-12)'               : 'var(--autocity-accent-08)',
    avatarBorder:        isDark ? 'var(--autocity-accent-25)'               : 'var(--autocity-accent-20)',
    avatarIcon:          'var(--autocity-accent)',
    dotBg:               isDark ? 'rgba(255,255,255,0.20)'             : 'rgba(0,0,0,0.15)',
    chipBg:              isDark ? 'rgba(255,255,255,0.04)'             : 'rgba(0,0,0,0.03)',
    chipBorder:          isDark ? 'rgba(255,255,255,0.08)'             : 'rgba(0,0,0,0.08)',
    chipText:            isDark ? '#9ca3af'                            : '#6b7280',
    chipHoverBorder:     isDark ? 'var(--autocity-accent-30)'               : 'var(--autocity-accent-25)',
    chipHoverText:       isDark ? '#e5e7eb'                            : '#111827',
    chipHoverBg:         isDark ? 'rgba(255,255,255,0.06)'             : 'rgba(0,0,0,0.05)',
    chipScanBorder:      isDark ? 'var(--autocity-accent-25)'               : 'var(--autocity-accent-20)',
    chipScanText:        'var(--autocity-accent)',
    chipScanBg:          isDark ? 'var(--autocity-accent-08)'               : 'var(--autocity-accent-05)',
    scanBannerBg:        isDark ? 'var(--autocity-accent-06)'               : 'var(--autocity-accent-04)',
    scanBannerBorder:    isDark ? 'var(--autocity-accent-18)'               : 'var(--autocity-accent-15)',
    scanBannerText:      isDark ? '#fca5a5'                            : '#b91c1c',
    voiceBannerBg:       isDark ? 'rgba(239,68,68,0.08)'               : 'rgba(239,68,68,0.06)',
    voiceBannerBorder:   isDark ? 'rgba(239,68,68,0.20)'               : 'rgba(239,68,68,0.15)',
    voiceBannerText:     isDark ? '#fca5a5'                            : '#b91c1c',
    inputBarBorder:      isDark ? 'rgba(255,255,255,0.06)'             : 'rgba(0,0,0,0.06)',
    inputBg:             isDark ? 'rgba(255,255,255,0.05)'             : 'rgba(0,0,0,0.04)',
    inputBorder:         isDark ? 'rgba(255,255,255,0.10)'             : 'rgba(0,0,0,0.10)',
    inputText:           isDark ? '#f9fafb'                            : '#111827',
    inputFocusBorder:    'var(--autocity-accent-50)',
    inputFocusRing:      'var(--autocity-accent-15)',
    voiceBtnBg:          isDark ? 'rgba(255,255,255,0.06)'             : 'rgba(0,0,0,0.05)',
    voiceBtnBorder:      isDark ? 'rgba(255,255,255,0.10)'             : 'rgba(0,0,0,0.10)',
    voiceBtnIcon:        isDark ? '#9ca3af'                            : '#6b7280',
    sendBtnBg:           'linear-gradient(135deg, var(--autocity-accent), var(--autocity-accent-strong))',
    sendBtnDisabled:     isDark ? 'rgba(255,255,255,0.06)'             : 'rgba(0,0,0,0.05)',
    sendBtnDisabledIcon: isDark ? '#4b5563'                            : '#d1d5db',
    scrollTrack:         isDark ? '#050505'                            : '#f1f5f9',
    scrollThumb:         isDark ? 'var(--autocity-accent-40)'               : 'var(--autocity-accent-30)',
    overlayBg:           isDark ? 'rgba(0,0,0,0.60)'                   : 'rgba(0,0,0,0.40)',
    pillBg:              isDark ? 'rgba(255,255,255,0.15)'             : 'rgba(0,0,0,0.12)',
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen || isLoading || ocrModalOpen) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [isOpen, isLoading, ocrModalOpen]);

  useEffect(() => { if (!isOpen && micActive) voice.stop(); }, [isOpen]); // eslint-disable-line

  useEffect(() => {
    if (!isMobile) return;
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, isMobile]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    sendMessage(text, selectedModel);
  };

  const handleOcrConfirm = useCallback((
    items:         Array<{ name: string; sku: string; quantity: number; unitPrice: number; unit: string; taxRate: number }>,
    supplierName?: string,
    invoiceNote?:  string,
  ) => {
    closeOcrModal();
    sendOcrPurchase(items, supplierName, invoiceNote);
  }, [closeOcrModal, sendOcrPurchase]);

  const micTitle      = voice.mode === 'realtime'
    ? (voice.isLive ? 'End live session' : 'Start live voice session')
    : voice.isRecording ? 'Tap to stop & send' : 'Tap to speak';

  const hasConversation = messages.length > 1;
  const sendDisabled    = isLoading || !input.trim();

  // ── Panel content ──────────────────────────────────────────────────────────
  const PanelContent = (
    <div className="flex flex-col h-full">
      {isMobile && (
        <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: th.pillBg }} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: `1px solid ${th.headerBorder}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: th.avatarBg, border: `1px solid ${th.avatarBorder}` }}>
            <Sparkles size={16} style={{ color: th.avatarIcon }} className={isLoading ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold leading-none" style={{ color: th.headerTitle }}>AutoCity AI</p>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
                background: isLoading ? 'var(--autocity-accent)' : voice.isLive ? '#f59e0b' : '#22c55e',
              }} />
              {/* Provider badge */}
              {activeProvider && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                  style={{
                    background: activeProvider === 'anthropic' ? 'rgba(201,123,58,0.15)' : 'rgba(16,163,127,0.12)',
                    color:      activeProvider === 'anthropic' ? '#c97b3a' : '#10a37f',
                    border:     `1px solid ${activeProvider === 'anthropic' ? 'rgba(201,123,58,0.30)' : 'rgba(16,163,127,0.25)'}`,
                  }}>
                  {activeProvider === 'anthropic' ? 'Claude' : 'GPT'}
                </span>
              )}
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: th.headerSub }}>
              {voice.isLive                    ? 'Live voice · Realtime'
               : voice.isRecording             ? 'Recording… tap mic to send'
               : voice.status === 'processing' ? 'Transcribing…'
               : voice.status === 'connecting' ? 'Connecting…'
               : isLoading                     ? 'Working…'
               : isDark                        ? 'Night mode'
               : 'Day mode'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isDark ? <Moon size={13} style={{ color: th.headerSub }} /> : <Sun size={13} style={{ color: th.headerSub }} />}
          {hasConversation && (
            <button onClick={() => setShowClear(c => !c)}
              className="w-7 h-7 ml-1 rounded-lg flex items-center justify-center transition-all"
              style={{ background: showClear ? th.headerBtnHover : 'transparent', color: th.headerBtnText }}>
              <RotateCcw size={13} />
            </button>
          )}
          <button onClick={toggleOpen}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
            style={{ color: th.headerBtnText }}
            onMouseEnter={e => (e.currentTarget.style.background = th.headerBtnHover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Model selector — provider-aware */}
      <ModelSelector
        models={models}
        selectedModel={selectedModel}
        onSelect={setSelectedModel}
        isDark={isDark}
        th={th}
      />

      {/* Clear confirm */}
      {showClear && (
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
          style={{ background: th.clearBarBg, borderBottom: `1px solid ${th.clearBarBorder}` }}>
          <span className="text-xs" style={{ color: th.clearBarText }}>Clear conversation?</span>
          <div className="flex gap-3">
            <button onClick={() => setShowClear(false)} className="text-xs" style={{ color: th.clearBarText }}>Cancel</button>
            <button onClick={() => { clearHistory(); setShowClear(false); }} className="text-xs font-semibold" style={{ color: 'var(--autocity-accent)' }}>Clear</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 ai-widget-scroll">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-lg flex items-center justify-center mr-2 mt-0.5 flex-shrink-0"
                style={{ background: th.avatarBg, border: `1px solid ${th.avatarBorder}` }}>
                <Sparkles size={11} style={{ color: th.avatarIcon }} />
              </div>
            )}
            <div className="max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed"
              style={{
                wordBreak:    'break-word',
                background:   msg.role === 'user' ? th.userBubbleBg : msg.isError ? th.errBubbleBg : th.aiBubbleBg,
                color:        msg.role === 'user' ? th.userBubbleText : msg.isError ? th.errBubbleText : th.aiBubbleText,
                border:       msg.role === 'user' ? 'none' : `1px solid ${msg.isError ? th.errBubbleBorder : th.aiBubbleBorder}`,
                borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              }}>
              {renderMessage(msg.content)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center mr-2 mt-0.5 flex-shrink-0"
              style={{ background: th.avatarBg, border: `1px solid ${th.avatarBorder}` }}>
              <Sparkles size={11} style={{ color: th.avatarIcon }} className="animate-spin" />
            </div>
            <div className="px-4 py-3 flex items-center gap-1.5"
              style={{ background: th.aiBubbleBg, border: `1px solid ${th.aiBubbleBorder}`, borderRadius: '18px 18px 18px 4px' }}>
              {[0, 1, 2].map(n => (
                <span key={n} className="ai-dot w-1.5 h-1.5 rounded-full"
                  style={{ background: th.dotBg, animationDelay: `${n * 160}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && !isLoading && (
        <div className="px-4 pb-3 flex gap-1.5 ai-chip-scroll"
          style={{ overflowX: isMobile ? 'auto' : 'unset', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
          {QUICK_ACTIONS.map(({ icon: Icon, label, prompt, ocr }) => (
            <button key={label}
              onClick={() => ocr ? openOcrModal() : sendMessage(prompt, selectedModel)}
              className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 flex-shrink-0"
              style={{
                background: ocr ? th.chipScanBg   : th.chipBg,
                border:     `1px solid ${ocr ? th.chipScanBorder : th.chipBorder}`,
                color:      ocr ? th.chipScanText  : th.chipText,
              }}
              onMouseEnter={e => { if (!ocr) { (e.currentTarget as HTMLButtonElement).style.background = th.chipHoverBg; (e.currentTarget as HTMLButtonElement).style.borderColor = th.chipHoverBorder; (e.currentTarget as HTMLButtonElement).style.color = th.chipHoverText; } }}
              onMouseLeave={e => { if (!ocr) { (e.currentTarget as HTMLButtonElement).style.background = th.chipBg; (e.currentTarget as HTMLButtonElement).style.borderColor = th.chipBorder; (e.currentTarget as HTMLButtonElement).style.color = th.chipText; } }}>
              <Icon size={11} />{label}
            </button>
          ))}
        </div>
      )}

      {/* Scan invoice banner */}
      {messages.length > 1 && !isLoading && (
        <div className="px-4 pb-2">
          <button onClick={openOcrModal}
            className="w-full flex items-center justify-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl border transition-all active:scale-95"
            style={{ background: th.scanBannerBg, border: `1px solid ${th.scanBannerBorder}`, color: th.scanBannerText }}>
            <ScanLine size={12} />Scan Purchase Invoice with AI<Zap size={11} />
          </button>
        </div>
      )}

      {/* Live voice banner */}
      {voice.isLive && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 flex-shrink-0"
          style={{ background: th.voiceBannerBg, border: `1px solid ${th.voiceBannerBorder}` }}>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {[0,1,2,3,4].map(n => (
              <span key={n} className="w-0.5 rounded-full"
                style={{ background: 'var(--autocity-accent)', height: `${8+(n%3)*5}px`, animation: 'ai-wave 0.8s ease-in-out infinite', animationDelay: `${n*0.12}s` }} />
            ))}
          </div>
          <span className="text-xs flex-1" style={{ color: th.voiceBannerText }}>Live voice · Realtime API</span>
          <button onClick={() => voice.stop()} className="text-xs font-semibold px-2 py-0.5 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, var(--autocity-accent), var(--autocity-accent-strong))' }}>End</button>
        </div>
      )}

      {/* PTT banner */}
      {voice.isRecording && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl flex items-center gap-2 flex-shrink-0"
          style={{ background: th.voiceBannerBg, border: `1px solid ${th.voiceBannerBorder}` }}>
          <span className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: 'var(--autocity-accent)', animation: 'ai-mic-pulse 1s ease-in-out infinite' }} />
          <span className="text-xs flex-1" style={{ color: th.voiceBannerText }}>Recording… tap mic to send</span>
          <button onClick={() => voice.stop()} className="text-xs font-semibold px-2 py-0.5 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, var(--autocity-accent), var(--autocity-accent-strong))' }}>Send</button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-3 flex gap-2 flex-shrink-0"
        style={{ borderTop: `1px solid ${th.inputBarBorder}`, paddingBottom: isMobile ? 'max(12px, env(safe-area-inset-bottom))' : '12px' }}>
        <input
          ref={inputRef} type="text" autoFocus value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={voice.isRecording ? 'Listening…' : voice.status === 'processing' ? 'Transcribing…' : voice.isLive ? 'Speak or type…' : 'e.g. Sold 3 tyres to Ahmed for 200 each…'}
          disabled={isLoading || voice.isLive}
          className="flex-1 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-all disabled:opacity-50"
          style={{ background: th.inputBg, border: `1px solid ${th.inputBorder}`, color: th.inputText, fontSize: isMobile ? '16px' : '14px' }}
          onFocus={e => { e.currentTarget.style.borderColor = th.inputFocusBorder; e.currentTarget.style.boxShadow = `0 0 0 3px ${th.inputFocusRing}`; }}
          onBlur={e => { e.currentTarget.style.borderColor = th.inputBorder; e.currentTarget.style.boxShadow = 'none'; }}
        />
        {voice.mode !== 'unavailable' && (
          <button onClick={() => voice.start()} disabled={isLoading || micBusy}
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 active:scale-95"
            style={micActive
              ? { background: 'linear-gradient(135deg, var(--autocity-accent), var(--autocity-accent-strong))', animation: 'ai-mic-pulse 1.2s ease-in-out infinite' }
              : { background: th.voiceBtnBg, border: `1px solid ${th.voiceBtnBorder}` }}
            title={micTitle}>
            {micBusy ? <Radio size={15} style={{ color: 'var(--autocity-accent)', animation: 'ai-spin-slow 1.5s linear infinite' }} />
              : micActive ? <MicOff size={16} className="text-white" />
              : <Mic size={16} style={{ color: th.voiceBtnIcon }} />}
          </button>
        )}
        <button onClick={handleSend} disabled={sendDisabled}
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={{
            background: sendDisabled ? th.sendBtnDisabled : th.sendBtnBg,
            border:     sendDisabled ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` : 'none',
            boxShadow:  sendDisabled ? 'none' : '0 4px 12px var(--autocity-accent-25)',
          }}>
          <Send size={15} style={{ color: sendDisabled ? th.sendBtnDisabledIcon : '#ffffff' }} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        .ai-widget-scroll::-webkit-scrollbar       { width: 4px; }
        .ai-widget-scroll::-webkit-scrollbar-track { background: ${th.scrollTrack}; border-radius: 2px; }
        .ai-widget-scroll::-webkit-scrollbar-thumb { background: ${th.scrollThumb}; border-radius: 2px; }
        .ai-chip-scroll::-webkit-scrollbar         { display: none; }
        @keyframes ai-fab-ping   { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes ai-dot-bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }
        .ai-dot { animation: ai-dot-bounce 1.4s ease-in-out infinite; }
        @keyframes ai-wave       { 0%, 100% { transform: scaleY(0.4); } 50% { transform: scaleY(1.0); } }
        @keyframes ai-mic-pulse  { 0%, 100% { box-shadow: 0 4px 12px var(--autocity-accent-35); } 50% { box-shadow: 0 4px 24px var(--autocity-accent-70); } }
        @keyframes ai-spin-slow  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ai-sheet-up   { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      {/* Desktop FAB */}
      {!isMobile && (
        <button onClick={toggleOpen}
          className="fixed bottom-6 right-5 z-50 flex items-center justify-center rounded-2xl transition-all duration-300 group"
          style={{
            width: 52, height: 52,
            background: isOpen ? th.fabBgActive : th.fabBgIdle,
            border:     `1px solid ${isOpen ? th.fabBorderActive : 'transparent'}`,
            boxShadow:  isOpen ? 'none' : `0 8px 32px ${th.fabShadow}`,
          }}>
          {isOpen
            ? <X size={20} style={{ color: th.headerBtnText }} />
            : <>
                <Sparkles size={22} className="text-white group-hover:scale-110 transition-transform" />
                <span className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: '2px solid var(--autocity-accent)', opacity: 0.35, animation: 'ai-fab-ping 2s ease-out infinite' }} />
              </>
          }
        </button>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <button onClick={toggleOpen}
          className="flex items-center justify-center rounded-2xl transition-all duration-300 group"
          style={{
            width: 52, height: 52,
            background: isOpen ? th.fabBgActive : th.fabBgIdle,
            border:     `1px solid ${isOpen ? th.fabBorderActive : 'transparent'}`,
            boxShadow:  isOpen ? 'none' : `0 8px 32px ${th.fabShadow}`,
          }}>
          {isOpen
            ? <X size={20} style={{ color: th.headerBtnText }} />
            : <>
                <Sparkles size={22} className="text-white group-hover:scale-110 transition-transform" />
                <span className="absolute inset-0 rounded-2xl pointer-events-none"
                  style={{ border: '2px solid var(--autocity-accent)', opacity: 0.35, animation: 'ai-fab-ping 2s ease-out infinite' }} />
              </>
          }
        </button>
      )}

      {/* Desktop panel */}
      {!isMobile && isOpen && (
        <div className="fixed bottom-[72px] right-5 z-50 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 390, height: 580,
            background: th.panelBg,
            border:     `1px solid ${th.panelBorder}`,
            boxShadow:  `0 24px 64px ${th.panelShadow}`,
          }}>
          {PanelContent}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {isMobile && isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]"
            style={{ background: th.overlayBg, backdropFilter: 'blur(4px)' }}
            onClick={toggleOpen} />
          <div className="fixed left-0 right-0 z-[9999] flex flex-col rounded-t-3xl overflow-hidden"
            style={{
              bottom:    MOBILE_NAV_HEIGHT,
              maxHeight: `calc(100dvh - ${MOBILE_NAV_HEIGHT + 80}px)`,
              height:    `calc(72dvh - ${MOBILE_NAV_HEIGHT}px)`,
              background: th.panelBg,
              border:     `1px solid ${th.panelBorder}`,
              boxShadow:  `0 -16px 48px ${th.panelShadow}`,
              animation:  'ai-sheet-up 0.32s cubic-bezier(0.32,0.72,0,1)',
            }}>
            {PanelContent}
          </div>
        </>
      )}

      <OCRPurchaseModal
        show={ocrModalOpen}
        onClose={closeOcrModal}
        isDark={isDark}
        onConfirm={handleOcrConfirm}
        products={products}
        suppliers={suppliers}
        nextSKU={nextSKU}
        onSupplierCreated={onSupplierCreated}
        onProductCreated={onProductCreated}
      />
    </>
  );
}