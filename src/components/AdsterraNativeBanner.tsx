import React, { useEffect, useRef } from 'react';

const NATIVE_SCRIPT_SRC = 'https://bauval.org/21/f8c1082a7ea19f56256af1633c7d99c7';
const NATIVE_CONTAINER_ID = 'container-f8c1082a7ea19f56256af1633c7d99c7';

function AdsterraNativeBannerComponent() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scriptHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scriptHost = scriptHostRef.current;
    const container = containerRef.current;
    if (!scriptHost || !container) return;

    scriptHost.innerHTML = '';
    container.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    script.src = NATIVE_SCRIPT_SRC;
    scriptHost.appendChild(script);

    return () => {
      scriptHost.innerHTML = '';
      container.innerHTML = '';
    };
  }, []);

  return (
    <section
      aria-label="Sponsored Recommendations"
      className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-10 border-t border-slate-800/60 bg-[#07090e]"
    >
      <div className="w-full rounded-xl bg-[#090d16]/90 border border-slate-800/80 p-3 min-h-[100px] overflow-hidden">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2 text-center">
          Sponsored
        </div>
        <div ref={containerRef} id={NATIVE_CONTAINER_ID} className="w-full overflow-hidden" />
        <div ref={scriptHostRef} className="hidden" />
      </div>
    </section>
  );
}

export const AdsterraNativeBanner = React.memo(AdsterraNativeBannerComponent);
