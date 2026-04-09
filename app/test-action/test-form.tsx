"use client";

import { createCommunityAction } from "@/app/xcom-actions";

export const TestForm = () => {
  return (
    <div style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #333", borderRadius: "8px" }}>
      <p>If you can see this, the client component with server action import works.</p>
      <p style={{ color: "#888", fontSize: "12px", marginTop: "0.5rem" }}>
        Action type: {typeof createCommunityAction}
      </p>
    </div>
  );
};
