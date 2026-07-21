"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a progressive enhancement — a failed registration
      // (unsupported browser, blocked by extension, etc.) shouldn't be fatal.
    });
  }, []);

  return null;
}
