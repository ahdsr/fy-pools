"use client";

import { Copy } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

export function ShareLinkButton({ href }: { href: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    if (!href) return;

    const url = new URL(href, window.location.origin).href;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCopy}
      disabled={!href}
    >
      {copied ? "Copied" : "Share link"} <Copy />
    </Button>
  );
}
