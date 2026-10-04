import { useEffect, useState } from 'react';
import {
  SlidersHorizontal, Loader2, Save, Check, Brain, BarChart3,
  LineChart, Plug, AlertCircle, CheckCircle2, XCircle,
  Cpu, Zap, ExternalLink,
} from 'lucide-react';
import { supabase, type ApiSettings } from '@/lib/supabase';

interface ExchangeState {
  apiKey: string;
  apiSecret: string;
  status: 'connected' | 'disconnected' | 'error';
}

type ExchangeName = 'Binance' | 'CoinDCX' | 'Delta Exchange' | 'WazirX' | 'Pi42';

const exchangeKeyMap: Record<ExchangeName, { key: keyof ApiSettings; secret: keyof ApiSettings }> = {
  'Binance': { key: 'binance_api_key', secret: 'binance_api_secret' },
  'CoinDCX': { key: 'coindcx_api_key', secret: 'coindcx_api_secret' },
  'Delta Exchange': { key: 'delta_api_key', secret: 'delta_api_secret' },
  'WazirX': { key: 'wazirx_api_key', secret: 'wazirx_api_secret' },
  'Pi42': { key: 'pi42_api_key', secret: 'pi42_api_secret' },
};

const exchangeBadges: Record<ExchangeName, string> = {
  'Binance': 'BNB',
  'CoinDCX': 'CDCX',
  'Delta Exchange': 'DLT',
  'WazirX': 'WRX',
  'Pi42': 'P42',
};

const statusConfig = {
  connected: { icon: CheckCircle2, color: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/30', glow: 'shadow-[0_0_10px_rgba(0,255,157,0.3)]', label: 'Connected' },
  disconnected: { icon: XCircle, color: 'text-slate-500', bg: 'bg-white/[0.04]', border: 'border-white/[0.08]', glow: '', label: 'Disconnected' },
  error: { icon: AlertCircle, color: 'text-neon-red', bg: 'bg-neon-red/10', border: 'border-neon-red/30', glow: 'shadow-[0_0_10px_rgba(255,59,92,0.3)]', label: 'Error' },
};

interface ApiField {
  key: keyof ApiSettings;
  label: string;
  placeholder: string;
  icon: typeof Brain;
}

interface ApiSection {
  title: string;
  icon: typeof Brain;
  accent: string;
  fields: ApiField[];
}

const aiEngineSection: ApiSection = {
  title: 'AI Engines',
  icon: Brain,
  accent: 'cyan',
  fields: [
    { key: 'openai_api_key', label: 'OpenAI API Key', placeholder: 'sk-proj-...', icon: Brain },
    { key: 'anthropic_api_key', label: 'Anthropic API Key', placeholder: 'sk-ant-...', icon: Cpu },
    { key: 'deepseek_api_key', label: 'DeepSeek API Key', placeholder: 'ds-...', icon: Cpu },
  ],
};

const marketDataSection: ApiSection = {
  title: 'Market Data & Charting',
  icon: BarChart3,
  accent: 'green',
  fields: [
    { key: 'coingecko_api_key', label: 'CoinGecko API Key', placeholder: 'CG-...', icon: LineChart },
    { key: 'coinmarketcap_api_key', label: 'CoinMarketCap API Key', placeholder: 'CMC-...', icon: BarChart3 },
    { key: 'tradingview_license_key', label: 'TradingView License Key', placeholder: 'tv_lic_...', icon: LineChart },
  ],
};

const accentMap: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  cyan: { text: 'text-neon-cyan', bg: 'bg-neon-cyan/10', border: 'border-neon-cyan/30', glow: 'shadow-[0_0_12px_rgba(0,229,255,0.2)]' },
  green: { text: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/30', glow: 'shadow-[0_0_12px_rgba(0,255,157,0.2)]' },
  amber: { text: 'text-neon-amber', bg: 'bg-neon-amber/10', border: 'border-neon-amber/30', glow: 'shadow-[0_0_12px_rgba(255,176,32,0.2)]' },
};

export default function AdminApiControl() {
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exchanges, setExchanges] = useState<Record<ExchangeName, ExchangeState>>({
    'Binance': { apiKey: '', apiSecret: '', status: 'disconnected' },
    'CoinDCX': { apiKey: '', apiSecret: '', status: 'disconnected' },
    'Delta Exchange': { apiKey: '', apiSecret: '', status: 'disconnected' },
    'WazirX': { apiKey: '', apiSecret: '', status: 'disconnected' },
    'Pi42': { apiKey: '', apiSecret: '', status: 'disconnected' },
  });

  useEffect(() => {
    let mounted = true;
    supabase.from('api_settings').select('*').limit(1).maybeSingle().then(({ data }) => {
      if (!mounted) return;
      const s = data as ApiSettings | null;
      setSettings(s);
      if (s) {
        const newExchanges = { ...exchanges };
        (Object.keys(exchangeKeyMap) as ExchangeName[]).forEach(name => {
          const k = s[exchangeKeyMap[name].key];
          const sec = s[exchangeKeyMap[name].secret];
          newExchanges[name] = {
            apiKey: k ?? '',
            apiSecret: sec ?? '',
            status: k && sec ? 'connected' : 'disconnected',
          };
        });
        setExchanges(newExchanges);
      }
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const updateField = (key: keyof ApiSettings, value: string) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  };

  const updateExchange = (name: ExchangeName, field: 'apiKey' | 'apiSecret', value: string) => {
    setExchanges(prev => ({
      ...prev,
      [name]: { ...prev[name], [field]: value },
    }));
  };

  const handleSaveExchange = async (name: ExchangeName) => {
    if (!settings) return;
    const ex = exchanges[name];
    const status = ex.apiKey && ex.apiSecret ? 'connected' : 'disconnected';
    setExchanges(prev => ({ ...prev, [name]: { ...prev[name], status } }));
    setSaving(true);
    await supabase.from('api_settings').update({
      [exchangeKeyMap[name].key]: ex.apiKey,
      [exchangeKeyMap[name].secret]: ex.apiSecret,
      updated_at: new Date().toISOString(),
    }).eq('id', settings.id);
    setSaving(false);
  };

  const handleSaveAll = async () => {
    if (!settings) return;
    setSaving(true);
    const updatePayload: Record<string, string | null> = {};
    [...aiEngineSection.fields, ...marketDataSection.fields].forEach(f => {
      updatePayload[f.key] = settings[f.key] ?? null;
    });
    (Object.keys(exchangeKeyMap) as ExchangeName[]).forEach(name => {
      updatePayload[exchangeKeyMap[name].key] = exchanges[name].apiKey || null;
      updatePayload[exchangeKeyMap[name].secret] = exchanges[name].apiSecret || null;
    });
    updatePayload.updated_at = new Date().toISOString();
    await supabase.from('api_settings').update(updatePayload).eq('id', settings.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-neon-cyan animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-neon-cyan" /> Master Settings & API Control
          </h2>
          <p className="text-sm text-slate-400">Manage global API keys for AI engines, market data, and Indian exchange connectors</p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex-shrink-0 ${
            saving
              ? 'bg-white/[0.05] text-slate-400 cursor-wait'
              : saved
              ? 'bg-neon-green/15 text-neon-green border border-neon-green/40 neon-glow-green'
              : 'bg-gradient-to-r from-neon-cyan/20 to-neon-green/20 text-white border border-neon-cyan/40 hover:from-neon-cyan/30 hover:to-neon-green/30 neon-glow-cyan hover:scale-[1.02]'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'All Saved!' : 'Save All Changes'}
        </button>
      </div>

      {/* AI Engines Section */}
      <ApiSectionCard section={aiEngineSection} settings={settings} onUpdate={updateField} />

      {/* Market Data & Charting Section */}
      <ApiSectionCard section={marketDataSection} settings={settings} onUpdate={updateField} />

      {/* Indian Market Exchange Connectors */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-neon-amber/10 border border-neon-amber/30 flex items-center justify-center">
            <Plug className="w-5 h-5 text-neon-amber" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Indian Market Exchange Connectors</h3>
            <p className="text-[11px] text-slate-500">Manage API connections to India-focused crypto exchanges</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(exchanges) as ExchangeName[]).map(name => {
            const ex = exchanges[name];
            const sc = statusConfig[ex.status];
            const SIcon = sc.icon;
            return (
              <div key={name} className={`relative rounded-2xl border p-5 transition-all ${sc.bg} ${sc.border} ${ex.status === 'connected' ? sc.glow : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[10px] font-bold text-slate-300">
                      {exchangeBadges[name]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{name}</h4>
                      <p className="text-[10px] text-slate-500">India-focused exchange</p>
                    </div>
                  </div>
                  {/* Status Badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${sc.bg} ${sc.border} ${sc.color} text-[10px] font-bold`}>
                    <SIcon className="w-3.5 h-3.5" />
                    {sc.label}
                    {ex.status === 'connected' && (
                      <span className="relative flex h-1.5 w-1.5 ml-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neon-green" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block font-semibold uppercase tracking-wide">API Key</label>
                    <input
                      type="password"
                      value={ex.apiKey}
                      onChange={e => updateExchange(name, 'apiKey', e.target.value)}
                      placeholder="Enter API key..."
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white font-mono focus:outline-none focus:border-neon-amber/40 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block font-semibold uppercase tracking-wide">API Secret</label>
                    <input
                      type="password"
                      value={ex.apiSecret}
                      onChange={e => updateExchange(name, 'apiSecret', e.target.value)}
                      placeholder="Enter API secret..."
                      className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white font-mono focus:outline-none focus:border-neon-amber/40 transition-colors"
                    />
                  </div>
                </div>

                {/* Update button */}
                <button
                  onClick={() => handleSaveExchange(name)}
                  disabled={saving}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-neon-amber/15 text-neon-amber border border-neon-amber/30 hover:bg-neon-amber/25 transition-all active:scale-95"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Update Keys
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info banner */}
      <div className="glass-card p-4 border-neon-amber/20 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-neon-amber flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-white">Security Notice</p>
          <p className="text-xs text-slate-400 mt-1">
            All API keys are encrypted at rest and stored securely in the database. Never share API keys with untrusted sub-admins. Only grant read and trade permissions — never withdrawal permissions.
          </p>
        </div>
      </div>
    </div>
  );
}

function ApiSectionCard({ section, settings, onUpdate }: {
  section: ApiSection;
  settings: ApiSettings | null;
  onUpdate: (key: keyof ApiSettings, value: string) => void;
}) {
  const a = accentMap[section.accent];
  const SIcon = section.icon;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl ${a.bg} ${a.border} border flex items-center justify-center`}>
          <SIcon className={`w-5 h-5 ${a.text}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{section.title}</h3>
          <p className="text-[11px] text-slate-500">Configure external API integrations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {section.fields.map((field) => {
          const FIcon = field.icon;
          const value = settings ? (settings[field.key] ?? '') : '';
          const hasKey = Boolean(value);
          return (
            <div key={field.key} className="relative">
              <label className="text-[10px] text-slate-500 mb-1.5 block font-semibold uppercase tracking-wide flex items-center gap-1.5">
                <FIcon className={`w-3 h-3 ${hasKey ? a.text : 'text-slate-600'}`} />
                {field.label}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={value}
                  onChange={e => onUpdate(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border text-sm text-white font-mono focus:outline-none transition-colors ${
                    hasKey ? 'border-neon-green/30 focus:border-neon-green/50' : 'border-white/[0.08] focus:border-white/[0.16]'
                  }`}
                />
                {hasKey && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
                    <span className="text-[9px] text-neon-green font-bold">SET</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
