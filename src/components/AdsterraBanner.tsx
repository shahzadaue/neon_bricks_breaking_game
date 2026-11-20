import React, { useEffect, useMemo, useState } from 'react';

const MOBILE_BANNER = {
  key: '0ada2fef7789d2e4ed7007384cf8b294',
  width: 320,
  height: 50,
  scriptSrc: 'https://bauval.org/22/0ada2fef7789d2e4ed7007384cf8b294',
} as const;

const DESKTOP_BANNER = {
  key: '8134fd4f1c7a40496f6a4ff8df08474e',
  width: 728,
  height: 90,
  scriptSrc: 'https://bauval.org/22/8134fd4f1c7a40496f6a4ff8df08474e',
} as const;

function AdsterraBannerComponent() {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(min-width: 768px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const adConfig = isDesktop ? DESKTOP_BANNER : MOBILE_BANNER;

  const srcDoc = useMemo(() => {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    </style>
  </head>
  <body>
    <script>
      atOptions = {
        'key' : '${adConfig.key}',
        'format' : 'iframe',
        'height' : ${adConfig.height},
        'width' : ${adConfig.width},
        'params' : {}
      };
    </script>
    <script src="${adConfig.scriptSrc}"></script>
  </body>
</html>`;
  }, [adConfig.height, adConfig.key, adConfig.scriptSrc, adConfig.width]);

  return (
    <div
      aria-label="Advertisement"
      className="w-full max-w-5xl mx-auto px-2 py-1.5 flex items-center justify-center bg-[#07090e] border-b border-slate-800/60 min-h-[62px] md:min-h-[102px] overflow-hidden z-10"
    >
      <iframe
        key={adConfig.key}
        title={isDesktop ? 'Desktop Advertisement 728x90' : 'Mobile Advertisement 320x50'}
        srcDoc={srcDoc}
        width={adConfig.width}
        height={adConfig.height}
        scrolling="no"
        frameBorder={0}
        style={{
          border: 'none',
          width: `${adConfig.width}px`,
          height: `${adConfig.height}px`,
          maxWidth: '100%',
          display: 'block',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}

export const AdsterraBanner = React.memo(AdsterraBannerComponent);
