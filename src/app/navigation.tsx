import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { parsePath, toPath, type Route } from './router';

/**
 * History-API navigation without a routing library: one current route, links that are real anchors, and Back/Forward
 * that work. Deep links work because the host rewrites page paths to index.html (vercel.json).
 */

let current: Route = parsePath(window.location.pathname);
const listeners = new Set<() => void>();

function setRoute(next: Route): void {
  current = next;
  for (const listener of listeners) listener();
}

window.addEventListener('popstate', () => {
  setRoute(parsePath(window.location.pathname));
});

// Tidy the address once at start-up: `/grown-ups/` and `//world//x` are the same page as their canonical form.
if (current.name !== 'not-found') {
  const canonical = toPath(current);
  if (canonical !== window.location.pathname) {
    window.history.replaceState(window.history.state, '', canonical + window.location.search);
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getRoute = (): Route => current;

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getRoute);
}

export function navigate(to: Route, options: { replace?: boolean } = {}): void {
  const path = toPath(to);
  if (path !== window.location.pathname) {
    if (options.replace) window.history.replaceState(null, '', path);
    else window.history.pushState(null, '', path);
  }
  setRoute(parsePath(path));
  window.scrollTo(0, 0);
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: Route };

/** An anchor that navigates in place on a plain click and behaves like any other link otherwise. */
export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(to);
  };
  return (
    <a href={toPath(to)} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
