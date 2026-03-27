import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

type BackgroundOption = {
  id: string;
  label: string;
  file: string;
};

const BACKGROUNDS: BackgroundOption[] = [
  { id: 'gradient-01', label: 'Gradient 1', file: 'gradient-01.svg' },
  { id: 'gradient-02', label: 'Gradient 2', file: 'gradient-02.svg' },
  { id: 'gradient-03', label: 'Gradient 3', file: 'gradient-03.svg' },
  { id: 'aurora-01', label: 'Aurora', file: 'aurora-01.svg' },
  { id: 'waves-01', label: 'Dalgalar', file: 'waves-01.svg' },
  { id: 'mesh-01', label: 'Mesh 1', file: 'mesh-01.svg' },
  { id: 'mesh-02', label: 'Mesh 2', file: 'mesh-02.svg' },
  { id: 'shapes-01', label: 'Şekiller 1', file: 'shapes-01.svg' },
  { id: 'shapes-02', label: 'Şekiller 2', file: 'shapes-02.svg' },
  { id: 'paper-01', label: 'Kağıt', file: 'paper-01.svg' },
  { id: 'noise-01', label: 'Noise', file: 'noise-01.svg' },
  { id: 'minimal-01', label: 'Minimal', file: 'minimal-01.svg' },
  { id: 'light-01', label: 'Açık 1', file: 'light-01.svg' },
  { id: 'light-02', label: 'Açık 2', file: 'light-02.svg' },
  { id: 'dark-01', label: 'Koyu 1', file: 'dark-01.svg' },
  { id: 'dark-02', label: 'Koyu 2', file: 'dark-02.svg' }
];

export function BackgroundSwitcher({
  value,
  onChange
}: {
  value: string;
  onChange: (nextBackgroundImage: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentUrl = useMemo(() => {
    const m = value.match(/url\\(['"]?(.*?)['"]?\\)/);
    return m?.[1] || '';
  }, [value]);

  const selectUrl = (url: string) => {
    onChange(`url('${url}')`);
    setOpen(false);
  };

  const applyCustom = () => {
    const url = customUrl.trim();
    if (!url) return;
    selectUrl(url);
    setCustomUrl('');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-full border border-white/20 bg-black/20 text-white shadow-sm hover:bg-white/10 transition-all outline-none"
        title="Arka planı değiştir"
      >
        <ImageIcon size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] rounded-2xl bg-slate-900/90 backdrop-blur-3xl border border-white/15 shadow-2xl p-3 z-[200] text-white">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white/80 px-1">Arka planı değiştir</p>
            {currentUrl && (
              <a
                href={currentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-white/60 hover:text-white/90 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                Kaynağı Aç
              </a>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {BACKGROUNDS.map(bg => {
              const url = `/wallpapers/${bg.file}`;
              const thumb = url;
              const active = currentUrl === url;
              return (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => selectUrl(url)}
                  className={`relative h-16 rounded-xl overflow-hidden border transition-all ${
                    active ? 'border-blue-400 ring-2 ring-blue-400/40' : 'border-white/10 hover:border-white/30'
                  }`}
                  title={bg.label}
                >
                  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${thumb}')` }} />
                  <div className="absolute inset-0 bg-black/10" />
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Özel URL yapıştır..."
              className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={applyCustom}
              className="px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-semibold transition-colors"
            >
              Uygula
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
