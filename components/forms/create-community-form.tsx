"use client";

import { useState } from "react";

type ActionResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

type CreateCommunityFormProps = {
  action: (formData: FormData) => Promise<ActionResult>;
};

export const CreateCommunityForm = ({ action }: CreateCommunityFormProps) => {
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="border-b border-white/10 px-4 py-6 sm:px-6">
      <p className="text-[15px] text-white">
        Step 2: client component with server action prop (type: {typeof action})
      </p>
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
