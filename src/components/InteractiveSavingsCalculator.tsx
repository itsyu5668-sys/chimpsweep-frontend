import React, { useState, useMemo } from 'react';
import { CreditCard, TrendingDown, RefreshCw, Zap, Sparkles } from 'lucide-react';

export const InteractiveSavingsCalculator: React.FC = () => {
  const [contacts, setContacts] = useState<number>(5000);
  const [wastePercent, setWastePercent] = useState<number>(35);

  // Quick-select contact preset buttons
  const PRESETS = [1500, 2500, 5000, 10000, 25000, 50000];

  // Approximated Mailchimp standard plan pricing tiers
  const getMailchimpPrice = (count: number): number => {
    if (count <= 500) return 13;
    if (count <= 1500) return 26;
    if (count <= 2500) return 45;
    if (count <= 5000) return 75;
    if (count <= 10000) return 135;
    if (count <= 15000) return 190;
    if (count <= 20000) return 245;
    if (count <= 30000) return 310;
    if (count <= 50000) return 415;
    if (count <= 75000) return 550;
    return 700;
  };

  const originalCost = useMemo(() => getMailchimpPrice(contacts), [contacts]);
  const wasteCount = useMemo(() => Math.round(contacts * (wastePercent / 100)), [contacts, wastePercent]);
  const optimizedContacts = useMemo(() => contacts - wasteCount, [contacts, wasteCount]);
  const optimizedCost = useMemo(() => getMailchimpPrice(optimizedContacts), [optimizedContacts]);
  const savings = useMemo(() => Math.max(0, originalCost - optimizedCost), [originalCost, optimizedCost]);
  const yearlySavings = useMemo(() => savings * 12, [savings]);

  // Breakdown of waste types for the live visualization
  const unsubscribedCount = useMemo(() => Math.round(wasteCount * 0.65), [wasteCount]);
  const bouncedCount = useMemo(() => Math.round(wasteCount * 0.22), [wasteCount]);
  const duplicateCount = useMemo(() => Math.max(0, wasteCount - unsubscribedCount - bouncedCount), [wasteCount, unsubscribedCount, bouncedCount]);

  return (
    <div className="bg-white p-8 rounded-2xl border border-[#11111108] shadow-subtle relative overflow-hidden flex flex-col justify-between h-auto">
      {/* Background radial accent */}
      <div className="absolute top-0 right-0 w-48 h-48 blur-[60px] bg-[#FFE01B]/10 opacity-60 rounded-full -mr-16 -mt-16 pointer-events-none"></div>

      <div>
        <div className="flex justify-between items-center mb-6">
          <span className="text-[9px] font-mono uppercase bg-midnight-ink text-white px-2.5 py-1 rounded-full font-bold tracking-wider">
            Live ROI Estimator
          </span>
          <span className="text-[10px] font-mono text-[#6d6c6b] flex items-center gap-1">
            <RefreshCw className="w-3 h-3 animate-spin text-[#d8be14]" /> Auto-recomputing
          </span>
        </div>

        {/* Total Contacts Slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-midnight-ink uppercase tracking-wider font-sans">
              Total Audience Select
            </label>
            <span className="text-lg font-sans text-midnight-ink font-black">
              {contacts.toLocaleString()} Contacts
            </span>
          </div>
          
          <input
            type="range"
            min="500"
            max="100000"
            step="500"
            value={contacts}
            onChange={(e) => setContacts(Number(e.target.value))}
            className="w-full h-2 bg-[#1111110a] rounded-lg appearance-none cursor-pointer accent-[#ffe01b]"
          />

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setContacts(preset)}
                className={`px-3 py-1 text-[10px] font-bold rounded-full font-mono transition-all border ${
                  contacts === preset
                    ? 'bg-[#FFE01B] border-[#ffe01b] text-midnight-ink shadow-sm'
                    : 'bg-[#11111105] border-transparent text-[#6d6c6b] hover:bg-[#1111110c] hover:text-midnight-ink'
                }`}
              >
                {preset >= 1000 ? `${preset / 1000}k` : preset}
              </button>
            ))}
          </div>
        </div>

        {/* Waste Percentage Slider */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-midnight-ink uppercase tracking-wider font-sans">
              Estimated Waste Drag ratio
            </label>
            <span className="text-lg font-sans text-rose-500 font-extrabold">
              {wastePercent}% Dead Weight
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="80"
            step="1"
            value={wastePercent}
            onChange={(e) => setWastePercent(Number(e.target.value))}
            className="w-full h-2 bg-[#1111110a] rounded-lg appearance-none cursor-pointer accent-rose-400"
          />
          <p className="text-[10px] text-muted-ash mt-1.5 leading-normal font-sans">
            (Includes unnotified unsubscribes, dead-bounces, and redundant billing duplicate rows)
          </p>
        </div>

        {/* Segmented Visual Stacked Bar */}
        <div className="mb-8 font-sans">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-midnight-ink font-medium">Audience Composition</span>
            <span className="text-muted-ash text-[10px] font-bold">100% Total Base</span>
          </div>
          
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-[#11111108]">
            <div
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${100 - wastePercent}%` }}
              title={`Active Subscribers: ${optimizedContacts.toLocaleString()}`}
            ></div>
            <div
              className="bg-red-400 h-full transition-all duration-300"
              style={{ width: `${wastePercent * 0.65}%` }}
              title={`Unsubscribed: ${unsubscribedCount.toLocaleString()}`}
            ></div>
            <div
              className="bg-amber-400 h-full transition-all duration-300"
              style={{ width: `${wastePercent * 0.22}%` }}
              title={`Bounced: ${bouncedCount.toLocaleString()}`}
            ></div>
            <div
              className="bg-indigo-400 h-full transition-all duration-300"
              style={{ width: `${wastePercent * 0.13}%` }}
              title={`Duplicates: ${duplicateCount.toLocaleString()}`}
            ></div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 mt-3 text-[10px]">
            <div className="flex items-center gap-1 bg-emerald-50/60 px-2 py-1.5 rounded border border-emerald-100/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="text-[#3c6b44] truncate" title={`Active (${(100 - wastePercent).toFixed(0)}%)`}>
                Active ({optimizedContacts.toLocaleString()})
              </span>
            </div>
            <div className="flex items-center gap-1 bg-rose-50/60 px-2 py-1.5 rounded border border-rose-100/40">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"></span>
              <span className="text-rose-700 truncate" title={`Unsubs (${unsubscribedCount.toLocaleString()})`}>
                Unsubs ({unsubscribedCount.toLocaleString()})
              </span>
            </div>
            <div className="flex items-center gap-1 bg-amber-50/60 px-2 py-1.5 rounded border border-amber-100/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
              <span className="text-amber-700 truncate" title={`Bounces (${bouncedCount.toLocaleString()})`}>
                Bounces ({bouncedCount.toLocaleString()})
              </span>
            </div>
            <div className="flex items-center gap-1 bg-indigo-50/60 px-2 py-1.5 rounded border border-indigo-100/40">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
              <span className="text-indigo-700 truncate" title={`Dupes (${duplicateCount.toLocaleString()})`}>
                Dupes ({duplicateCount.toLocaleString()})
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Comparison */}
        <div className="space-y-3 font-sans pt-4 border-t border-[#11111108]">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-ash font-medium">Standard Monthly Mailchimp Cost:</span>
            <span className="font-extrabold text-rose-500 line-through">${originalCost.toFixed(2)}/mo</span>
          </div>

          <div className="flex justify-between items-center p-3.5 bg-zinc-900 text-white rounded-xl shadow-inner relative overflow-hidden">
            <div className="flex items-center gap-2 z-10">
              <div className="w-7 h-7 rounded-lg bg-[#FFE01B] flex items-center justify-center border border-white/10">
                <TrendingDown className="w-4 h-4 text-midnight-ink" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">With ChimpSweep</span>
                <span className="text-xs text-white font-semibold">Clean Optimized Tier:</span>
              </div>
            </div>
            <span className="text-lg font-black text-white px-2 py-0.5 rounded bg-white/10 border border-white/5 z-10 font-mono">
              ${optimizedCost.toFixed(2)}<span className="text-xs text-zinc-400 font-normal">/mo</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[#11111108] flex flex-col gap-4 text-center">
        {savings > 0 ? (
          <div className="bg-[#FFE01B] border border-[#241c15]/10 text-midnight-ink p-3 rounded-xl shadow-sm font-sans flex items-center justify-center gap-2 select-none">
            <Zap className="w-4 h-4 text-midnight-ink fill-midnight-ink animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider">
              SAVE LOCAL ESTIMATE OF ${savings.toLocaleString()} / MONTH
            </span>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl font-sans text-xs font-semibold flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Audiences already perfectly optimized!</span>
          </div>
        )}

        <div className="flex justify-between items-center text-[11px] text-muted-ash font-sans px-1">
          <span>Yearly reduction of: <strong className="text-midnight-ink">${yearlySavings.toLocaleString()}/yr</strong></span>
          <span>Sweep on next billing.</span>
        </div>
      </div>
    </div>
  );
};
