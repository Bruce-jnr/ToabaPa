import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollOnNavigation() {
  const { pathname, search, hash } = useLocation();

  useLayoutEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, search, hash]);

  return null;
}
