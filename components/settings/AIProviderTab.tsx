'use client';

import { useState, useEffect } from 'react';
import {
  Key, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw,
  Eye, EyeOff, CheckCircle2, AlertCircle, Zap, X, ChevronDown,
  Cpu, Sparkles, Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAIWorker } from '@/components/ai-worker/AIWorkerProvider';

type AIProvider = 'openai' | 'anthropic';

interface AIConfig {
  _id:           string;
  provider:      AIProvider;
  label:         string;
  isActive:      boolean;
  widgetEnabled: boolean;
  maskedKey:     string;
  createdAt:     string;
}

interface Props {
  isDark:   boolean;
  outletId: string;
}

const PROVIDERS: Record<AIProvider, {
  name:          string;
  color:         string;
  bg:            string;
  border:        string;
  keyPlaceholder:string;
  docsUrl:       string;
  keyPrefix:     string;
  icon:          React.ReactNode;
}> = {
  openai: {
    name:          'OpenAI',
    color:         '#10a37f',
    bg:            'rgba(16,163,127,0.12)',
    border:        'rgba(16,163,127,0.30)',
    keyPrefix:     'sk-',
    keyPlaceholder:'sk-proj-••••••••••••••••••••••••••••••••••••••',
    docsUrl:       'https://platform.openai.com/api-keys',
    icon:          <Cpu className="h-5 w-5" />,
  },
  anthropic: {
    name:          'Anthropic',
    color:         '#c97b3a',
    bg:            'rgba(201,123,58,0.12)',
    border:        'rgba(201,123,58,0.30)',
    keyPrefix:     'sk-ant-',
    keyPlaceholder:'sk-ant-api03-••••••••••••••••••••••••••••••••',
    docsUrl:       'https://console.anthropic.com/account/keys',
    icon:          <Sparkles className="h-5 w-5" />,
  },
};

export default function AIProviderTab({ isDark, outletId }: Props) {
  const { refreshProvider } = useAIWorker();

  const [configs,      setConfigs]      = useState<AIConfig[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [deleting,     setDeleting]     = useState<string | null>(null);
  const [toggling,     setToggling]     = useState<string | null>(null);
  const [testing,      setTesting]      = useState(false);
  const [testResult,   setTestResult]   = useState<'ok' | 'fail' | null>(null);

  const [form, setForm] = useState<{ provider: AIProvider; apiKey: string; label: string; widgetEnabled: boolean }>({
    provider: 'openai', apiKey: '', label: '', widgetEnabled: true,
  });
  const [showKey,      setShowKey]      = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);

  // ── Theme ────────────────────────────────────────────────────────────────
  const t = {
    cardBg:        isDark ? '#000'                   : '#fff',
    cardBorder:    isDark ? '#1f2937'                : 'rgba(0,0,0,0.08)',
    cardHover:     isDark ? 'var(--autocity-accent)'                : 'var(--autocity-accent-40)',
    title:         isDark ? '#fff'                   : '#111827',
    sub:           isDark ? '#6b7280'                : '#9ca3af',
    divider:       isDark ? '#1f2937'                : 'rgba(0,0,0,0.06)',
    inputBg:       isDark ? '#000'                   : '#f9fafb',
    inputBorder:   isDark ? '#1f2937'                : 'rgba(0,0,0,0.10)',
    inputText:     isDark ? '#fff'                   : '#111827',
    hint:          isDark ? '#64748b'                : '#9ca3af',
    label:         isDark ? '#d1d5db'                : '#374151',
    bannerBg:      isDark ? 'var(--autocity-accent-06)'   : 'var(--autocity-accent-04)',
    bannerBorder:  isDark ? 'var(--autocity-accent-18)'   : 'var(--autocity-accent-15)',
    bannerText:    isDark ? '#fca5a5'                : '#b91c1c',
    modalBg:       isDark ? '#000'                   : '#fff',
    modalBorder:   isDark ? '#1f2937'                : 'rgba(0,0,0,0.10)',
    cancelBorder:  isDark ? '#374151'                : 'rgba(0,0,0,0.12)',
    cancelText:    isDark ? '#d1d5db'                : '#374151',
    iconBg:        isDark ? 'var(--autocity-accent-15)'   : 'var(--autocity-accent-08)',
    iconBorder:    isDark ? 'var(--autocity-accent-30)'   : 'var(--autocity-accent-20)',
    emptyIcon:     isDark ? '#374151'                : '#d1d5db',
    dropdownBg:    isDark ? '#0a0a0a'                : '#fff',
    dropdownBorder:isDark ? '#1f2937'                : 'rgba(0,0,0,0.10)',
    toggleOnBg:    'rgba(34,197,94,0.15)',
    toggleOnBorder:'rgba(34,197,94,0.35)',
    toggleOnText:  '#22c55e',
    toggleOffBg:   isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    toggleOffBorder:isDark? '#1f2937'                : 'rgba(0,0,0,0.08)',
    toggleOffText: isDark ? '#6b7280'                : '#9ca3af',
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai-provider', { credentials: 'include' });
      if (res.ok) setConfigs((await res.json()).configs || []);
    } catch { toast.error('Failed to fetch AI configs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchConfigs(); }, []);

  const handleTest = async () => {
    if (!form.apiKey || !form.provider) return;
    setTesting(true); setTestResult(null);
    try {
      if (form.provider === 'openai') {
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${form.apiKey}` },
        });
        setTestResult(res.ok ? 'ok' : 'fail');
      } else {
        // Anthropic: validate format (CORS blocks direct call from browser)
        setTestResult(form.apiKey.startsWith('sk-ant-') ? 'ok' : 'fail');
      }
    } catch { setTestResult('fail'); }
    finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (!form.apiKey || !form.provider) { toast.error('Provider and API key are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/ai-provider', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('AI provider connected!');
        setShowModal(false);
        setForm({ provider: 'openai', apiKey: '', label: '', widgetEnabled: true });
        setShowKey(false); setTestResult(null);
        await fetchConfigs();
        refreshProvider(); // update widget visibility immediately
      } else { toast.error((await res.json()).error || 'Failed to save'); }
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id: string, field: 'isActive' | 'widgetEnabled', value: boolean) => {
    setToggling(id + field);
    try {
      const res = await fetch('/api/ai-provider', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, [field]: value }),
      });
      if (res.ok) {
        toast.success(
          field === 'widgetEnabled'
            ? (value ? 'AI widget enabled' : 'AI widget hidden')
            : (value ? 'Provider activated' : 'Provider deactivated')
        );
        await fetchConfigs();
        refreshProvider();
      } else toast.error('Failed to update');
    } catch { toast.error('Failed to update'); }
    finally { setToggling(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this AI provider? AI features will stop working until another key is added.')) return;
    setDeleting(id);
    try {
      const res = await fetch('/api/ai-provider', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ id }),
      });
      if (res.ok) { toast.success('Provider removed'); fetchConfigs(); refreshProvider(); }
      else toast.error('Failed to remove');
    } catch { toast.error('Failed to remove'); }
    finally { setDeleting(null); }
  };

  const inputCls   = 'w-full px-4 py-3 rounded-lg focus:border-[color:var(--autocity-accent)] focus:ring-2 focus:ring-red-900/30 transition-all outline-none';
  const inputStyle = { background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText };

  return (
    <div className="space-y-6">

      {/* How-to banner */}
      <div className="rounded-xl p-4 flex items-start gap-3"
        style={{ background: t.bannerBg, border: `1px solid ${t.bannerBorder}` }}>
        <Zap className="h-5 w-5 flex-shrink-0 mt-0.5 text-[color:var(--autocity-accent)]" />
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: t.title }}>AI Provider Key Management</p>
          <ol className="text-xs space-y-1" style={{ color: t.bannerText }}>
            <li>1. Generate a key from <strong>OpenAI Platform</strong> or <strong>Anthropic Console</strong></li>
            <li>2. Click <strong>Add Provider</strong>, choose provider, paste key, test it</li>
            <li>3. Toggle <strong>AI Widget</strong> on each card to show/hide the chat button for all staff</li>
            <li>4. Only one provider is active at a time — toggle Active to switch</li>
          </ol>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end">
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[color:var(--autocity-accent)] text-white rounded-lg hover:bg-[color:var(--autocity-accent-strong)] transition-all font-semibold text-sm group">
          <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />Add Provider
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-[color:var(--autocity-accent)]" />
        </div>
      )}

      {!loading && configs.length === 0 && (
        <div className="rounded-2xl p-12 text-center"
          style={{ background: t.cardBg, border: `1px solid ${t.cardBorder}` }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: t.iconBg, border: `1px solid ${t.iconBorder}` }}>
            <Key className="h-8 w-8 text-[color:var(--autocity-accent)]" />
          </div>
          <p className="text-lg font-semibold mb-2" style={{ color: t.title }}>No AI provider configured</p>
          <p className="text-sm mb-6" style={{ color: t.sub }}>
            Add an OpenAI or Anthropic key to power the AI assistant, OCR, and voice features.
          </p>
          <button onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[color:var(--autocity-accent)] text-white rounded-lg hover:bg-[color:var(--autocity-accent-strong)] transition-all font-semibold">
            <Plus className="h-4 w-4" />Add Provider
          </button>
        </div>
      )}

      {!loading && configs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs.map(cfg => {
            const meta = PROVIDERS[cfg.provider];
            const isTogglingActive  = toggling === cfg._id + 'isActive';
            const isTogglingWidget  = toggling === cfg._id + 'widgetEnabled';
            return (
              <div key={cfg._id} className="rounded-xl p-5 transition-all"
                style={{
                  background: t.cardBg,
                  border: `1px solid ${cfg.isActive ? meta.border : t.cardBorder}`,
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.isActive ? meta.color : t.cardHover)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = cfg.isActive ? meta.border : t.cardBorder)}>

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight" style={{ color: t.title }}>{cfg.label}</p>
                      <p className="text-xs mt-0.5 font-semibold" style={{ color: meta.color }}>{meta.name}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${cfg.isActive ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50' : 'bg-gray-800/50 text-gray-500 border border-gray-700'}`}>
                    {cfg.isActive
                      ? <><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />Active</>
                      : <>Inactive</>}
                  </span>
                </div>

                {/* Masked key */}
                <div className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
                  style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${t.cardBorder}` }}>
                  <Key className="h-3 w-3 flex-shrink-0" style={{ color: t.sub }} />
                  <span className="text-xs font-mono flex-1 truncate" style={{ color: t.sub }}>
                    {meta.keyPrefix}••••••••••••••••••••••••••••••••
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--autocity-accent-12)', color: 'var(--autocity-accent)' }}>secured</span>
                </div>

                {/* ── Widget enable/disable toggle ─────────────────────── */}
                <div className="rounded-lg px-3 py-2.5 mb-4 flex items-center justify-between"
                  style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.divider}` }}>
                  <div className="flex items-center gap-2">
                    <Radio className="h-3.5 w-3.5" style={{ color: cfg.widgetEnabled ? '#22c55e' : t.sub }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: t.title }}>AI Widget</p>
                      <p className="text-[10px]" style={{ color: t.sub }}>
                        {cfg.widgetEnabled ? 'Visible to all staff' : 'Hidden from users'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(cfg._id, 'widgetEnabled', !cfg.widgetEnabled)}
                    disabled={!!isTogglingWidget}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: cfg.widgetEnabled ? t.toggleOnBg   : t.toggleOffBg,
                      border:     `1px solid ${cfg.widgetEnabled ? t.toggleOnBorder : t.toggleOffBorder}`,
                      color:      cfg.widgetEnabled ? t.toggleOnText  : t.toggleOffText,
                    }}>
                    {isTogglingWidget
                      ? <RefreshCw className="h-3 w-3 animate-spin" />
                      : cfg.widgetEnabled
                        ? <ToggleRight className="h-3.5 w-3.5" />
                        : <ToggleLeft  className="h-3.5 w-3.5" />
                    }
                    {cfg.widgetEnabled ? 'On' : 'Off'}
                  </button>
                </div>

                <p className="text-xs mb-4" style={{ color: t.hint }}>
                  Added {new Date(cfg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3" style={{ borderTop: `1px solid ${t.divider}` }}>
                  {/* Activate / deactivate */}
                  <button
                    onClick={() => handleToggle(cfg._id, 'isActive', !cfg.isActive)}
                    disabled={!!isTogglingActive}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-40"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border:     `1px solid ${t.cardBorder}`,
                      color:      cfg.isActive ? '#22c55e' : t.sub,
                    }}>
                    {isTogglingActive ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      : cfg.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                    {cfg.isActive ? 'Active' : 'Activate'}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(cfg._id)}
                    disabled={deleting === cfg._id}
                    className="p-2 rounded-lg transition-all active:scale-95 text-gray-500 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-40"
                    title="Remove provider"
                    style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${t.cardBorder}` }}>
                    {deleting === cfg._id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Provider Modal ──────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            style={{ background: t.modalBg, border: `1px solid ${t.modalBorder}` }}>

            <div className="flex justify-between items-center px-6 py-5 bg-gradient-to-r from-[var(--autocity-header-from-dark)] via-[var(--autocity-header-via-dark)] to-[var(--autocity-header-to-dark)]">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg"><Key className="h-6 w-6 text-white" /></div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add AI Provider</h2>
                  <p className="text-white/75 text-sm">Connect OpenAI or Anthropic</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setForm({ provider: 'openai', apiKey: '', label: '', widgetEnabled: true }); setShowKey(false); setTestResult(null); }}
                className="text-white/80 hover:text-white p-1"><X className="h-6 w-6" /></button>
            </div>

            <div className="p-6 space-y-5">

              {/* Provider selector */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: t.label }}>
                  Provider <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <button type="button" onClick={() => setProviderOpen(v => !v)}
                    className="w-full px-4 py-3 rounded-lg flex items-center justify-between transition-all outline-none"
                    style={{ background: t.inputBg, border: `1px solid ${t.inputBorder}`, color: t.inputText }}>
                    <div className="flex items-center gap-3">
                      <span style={{ color: PROVIDERS[form.provider].color }}>{PROVIDERS[form.provider].icon}</span>
                      <span className="font-medium">{PROVIDERS[form.provider].name}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${providerOpen ? 'rotate-180' : ''}`} style={{ color: t.hint }} />
                  </button>
                  {providerOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 rounded-xl shadow-xl overflow-hidden z-10"
                      style={{ background: t.dropdownBg, border: `1px solid ${t.dropdownBorder}` }}>
                      {(Object.keys(PROVIDERS) as AIProvider[]).map(p => (
                        <button key={p} type="button"
                          onClick={() => { setForm(f => ({ ...f, provider: p, apiKey: '' })); setProviderOpen(false); setTestResult(null); }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left">
                          <span style={{ color: PROVIDERS[p].color }}>{PROVIDERS[p].icon}</span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: t.title }}>{PROVIDERS[p].name}</p>
                            <p className="text-xs" style={{ color: t.hint }}>Key prefix: {PROVIDERS[p].keyPrefix}…</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: t.label }}>Label</label>
                <input type="text" value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder={`e.g. Production ${PROVIDERS[form.provider].name} Key`}
                  className={inputCls} style={inputStyle} />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: t.label }}>
                  API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input type={showKey ? 'text' : 'password'} value={form.apiKey}
                    onChange={e => { setForm(f => ({ ...f, apiKey: e.target.value })); setTestResult(null); }}
                    placeholder={PROVIDERS[form.provider].keyPlaceholder}
                    className={`${inputCls} pr-12 font-mono text-sm`} style={inputStyle} />
                  <button type="button" onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors"
                    style={{ color: t.hint }}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-xs" style={{ color: t.hint }}>
                    Get your key from{' '}
                    <a href={PROVIDERS[form.provider].docsUrl} target="_blank" rel="noreferrer"
                      className="underline hover:text-[color:var(--autocity-accent)] transition-colors">
                      {PROVIDERS[form.provider].name} dashboard
                    </a>.
                  </p>
                  {form.apiKey.length > 20 && (
                    <button type="button" onClick={handleTest} disabled={testing}
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all flex-shrink-0 ml-3"
                      style={{
                        background: testResult === 'ok'   ? 'rgba(34,197,94,0.12)' : testResult === 'fail' ? 'rgba(239,68,68,0.12)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        border:     `1px solid ${testResult === 'ok' ? 'rgba(34,197,94,0.30)' : testResult === 'fail' ? 'rgba(239,68,68,0.30)' : t.inputBorder}`,
                        color:      testResult === 'ok' ? '#22c55e' : testResult === 'fail' ? '#ef4444' : t.sub,
                      }}>
                      {testing ? <RefreshCw className="h-3 w-3 animate-spin" />
                        : testResult === 'ok'   ? <CheckCircle2 className="h-3 w-3" />
                        : testResult === 'fail' ? <AlertCircle  className="h-3 w-3" />
                        : <Zap className="h-3 w-3" />}
                      {testing ? 'Testing…' : testResult === 'ok' ? 'Valid!' : testResult === 'fail' ? 'Invalid' : 'Test'}
                    </button>
                  )}
                </div>
              </div>

              {/* Widget enable toggle */}
              <div className="rounded-xl p-4 flex items-center justify-between"
                style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', border: `1px solid ${t.inputBorder}` }}>
                <div className="flex items-center gap-3">
                  <Radio className="h-4 w-4" style={{ color: form.widgetEnabled ? '#22c55e' : t.sub }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: t.title }}>Enable AI Widget</p>
                    <p className="text-xs" style={{ color: t.hint }}>
                      {form.widgetEnabled ? 'Chat button visible to all staff' : 'Chat button hidden from users'}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setForm(f => ({ ...f, widgetEnabled: !f.widgetEnabled }))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: form.widgetEnabled ? 'rgba(34,197,94,0.15)' : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    border:     `1px solid ${form.widgetEnabled ? 'rgba(34,197,94,0.35)' : t.inputBorder}`,
                    color:      form.widgetEnabled ? '#22c55e' : t.sub,
                  }}>
                  {form.widgetEnabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {form.widgetEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Security note */}
              <div className="rounded-xl p-4 flex items-start gap-3"
                style={{ background: t.bannerBg, border: `1px solid ${t.bannerBorder}` }}>
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <p className="text-xs leading-relaxed" style={{ color: t.bannerText }}>
                  Key stored with <strong>select: false</strong> — never returned by the API.
                  Adding a new key automatically deactivates the previous one.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2"
                style={{ borderTop: `1px solid ${isDark ? '#1f2937' : 'rgba(0,0,0,0.06)'}` }}>
                <button onClick={() => { setShowModal(false); setForm({ provider: 'openai', apiKey: '', label: '', widgetEnabled: true }); setShowKey(false); setTestResult(null); }}
                  className="px-5 py-2.5 rounded-lg font-medium transition-all"
                  style={{ border: `1px solid ${t.cancelBorder}`, color: t.cancelText }}>Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.apiKey || testResult === 'fail'}
                  className="px-5 py-2.5 bg-[color:var(--autocity-accent)] text-white rounded-lg hover:bg-[color:var(--autocity-accent-strong)] transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                  {saving ? 'Saving…' : 'Save Provider'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}