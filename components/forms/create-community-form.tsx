"use client";

import { useState } from "react";

export const CreateCommunityForm = () => {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="border-b border-white/10 px-4 py-6 sm:px-6">
      <p className="text-[15px] text-white">Minimal form test (client component)</p>
      <button
        onClick={() => setMsg("clicked!")}
        className="mt-3 rounded-full bg-accent-secondary px-6 py-2.5 text-[15px] font-bold text-white"
      >
        Test click
      </button>
      {msg ? <p className="mt-2 text-green-400 text-sm">{msg}</p> : null}
    </div>
  );
};
