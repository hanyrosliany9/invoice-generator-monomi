import { useEffect, useState } from 'react';

const KEY = 'monomi.ui';
type Version = 'classic' | 'v2';

const readPref = (): Version => {
  if (typeof localStorage === 'undefined') return 'classic';
  return localStorage.getItem(KEY) === 'v2' ? 'v2' : 'classic';
};

export function useUiVersion() {
  const [version, setVersionState] = useState<Version>(readPref());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setVersionState(readPref());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setVersion = (v: Version) => {
    localStorage.setItem(KEY, v);
    setVersionState(v);
  };

  const toggle = () => setVersion(version === 'v2' ? 'classic' : 'v2');

  return { version, setVersion, toggle, isV2: version === 'v2' };
}
