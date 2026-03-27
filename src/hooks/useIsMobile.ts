import { useEffect, useState } from 'react';

export const useIsMobile = (maxWidthPx = 1024) => {
  const get = () => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
  };

  const [isMobile, setIsMobile] = useState(get);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [maxWidthPx]);

  return isMobile;
};
