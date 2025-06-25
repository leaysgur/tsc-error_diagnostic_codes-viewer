import { json } from "@sveltejs/kit";
import { readFile } from "fs/promises";
import { join } from "path";
import stripAnsi from "strip-ansi";
import type { RequestHandler } from "./$types";

const TS_REPO_DIR = process.env.TS_REPO_DIR || "../TypeScript";

export const GET: RequestHandler = async ({ url }) => {
  const filePath = url.searchParams.get("path");

  if (!filePath) {
    return json({ error: "No file path provided" }, { status: 400 });
  }

  try {
    const fullPath = join(TS_REPO_DIR, "tests/baselines/reference", filePath);
    const content = await readFile(fullPath, "utf-8");
    const cleanContent = stripAnsi(content);

    return new Response(cleanContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error reading file:", error);
    return json({ error: "Failed to read file" }, { status: 500 });
  }
};
