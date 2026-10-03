import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "velocity-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function safeRead(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value: "light" | "dark") {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode); the theme still works for this visit.
  }
}

function prefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches;
}

function initialDark(): boolean {
  const stored = safeRead();
  return stored ? stored === "dark" : prefersDark();
}

/**
 * Theme state with a single source of truth: the `dark` class on <html>
 * (the pre-paint script in index.html sets it before React mounts).
 * The OS preference is followed until the user toggles explicitly.
 */
export function useTheme() {
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (!safeRead()) setDark(event.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggle = useCallback(() => {
    setDark((prev) => {
      const next = !prev;
      safeWrite(next ? "dark" : "light");
      return next;
    });
  }, []);

  return { dark, toggle };
}
