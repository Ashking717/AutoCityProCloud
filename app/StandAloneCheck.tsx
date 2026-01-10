"use client";

import { useEffect } from "react";

export default function StandaloneCheck() {
  useEffect(() => {
    const isStandalone =
      (window.navigator as any).standalone ||
      window.matchMedia("(display-mode: standalone)").matches;

    alert(`Standalone mode: ${isStandalone}`);
  }, []);

  return null;
}
