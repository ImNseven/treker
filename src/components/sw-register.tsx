"use client";
import { useEffect } from "react";

export function SwRegister() {
  useEffect(() => {
    // Only register service worker in production to avoid dev-mode interference
    if (process.env.NODE_ENV !== "production") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {/* silently fail */});
    }
  }, []);
  return null;
}
