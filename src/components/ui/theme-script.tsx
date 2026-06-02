"use client";

import React from "react";

export function ThemeScript({ nonce }: { nonce?: string }) {
  return (
    <script
      suppressHydrationWarning
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var t=localStorage.getItem('hce:theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
      }}
    />
  );
}
