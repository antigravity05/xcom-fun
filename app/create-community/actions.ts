"use server";

export async function createCommunityAction(formData: FormData) {
  // Step 1: Ultra-minimal action — just echo back the form data
  try {
    const name = String(formData.get("name") ?? "");
    const description = String(formData.get("description") ?? "");

    if (name.length < 3) {
      return { ok: false as const, error: "Name must be at least 3 characters." };
    }

    if (description.length < 10) {
      return { ok: false as const, error: "Description must be at least 10 characters." };
    }

    // For now, just return success with a test slug
    return { ok: true as const, slug: "test-community" };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Unknown error occurred.",
    };
  }
}
