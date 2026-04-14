"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { shortenContractAddress } from "@/lib/xcom-formatters";

export function CopyContractAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="mt-1.5 inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-0.5 text-[12px] font-mono text-copy-soft transition hover:bg-white/[0.08] hover:text-white cursor-pointer"
      title="Click to copy contract address"
    >
      {shortenContractAddress(address)}
      {copied ? (
        <Check className="size-3 text-green-400" />
      ) : (
        <Copy className="size-3" />
      )}
    </button>
  );
}
