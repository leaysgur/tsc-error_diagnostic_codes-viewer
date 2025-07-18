import { text } from "@sveltejs/kit";
import { readFile } from "fs/promises";
import { join } from "path";
import stripAnsi from "strip-ansi";
import type { RequestHandler } from "./$types";
import diagnosticCodes from "$lib/diagnostic-error-codes.json";

const TS_REPO_DIR = process.env.TS_REPO_DIR || "../TypeScript";

// Simple string array for error messages

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const reviewedCodes = new Map<string, "yes" | "no">(body.reviewedCodes || []);

  // Filter codes marked as "no"
  const noMarkedCodes = Array.from(reviewedCodes.entries())
    .filter(([_, status]) => status === "no")
    .map(([code, _]) => Number(code))
    .sort((a, b) => a - b);

  if (noMarkedCodes.length === 0) return text("No codes marked as 'no'", { status: 204 });

  const results: { code: number; message: string }[] = [];

  for (const code of noMarkedCodes) {
    const files = (diagnosticCodes as Record<string, string[]>)[code];

    if (!files || files.length === 0) continue;

    // Get the first file for this error code
    const filename = files[0];
    try {
      const fullPath = join(TS_REPO_DIR, "tests/baselines/reference", filename);
      const content = await readFile(fullPath, "utf-8");
      const cleanContent = stripAnsi(content);

      // Extract error message line containing the specific error code
      const lines = cleanContent.split("\n");
      const errorLine = lines.find((line) => line.includes(`error TS${code}:`));

      if (errorLine) {
        const match = errorLine.match(/error TS\d+:\s*(.+)/v);
        if (match) {
          results.push({
            code,
            message: match[1].trim(),
          });
        }
      } else {
        console.warn(`No error message found for code TS${code} in file ${filename}`);
        results.push({
          code,
          message: "NO MESSAGE FOUND",
        });
      }
    } catch (fileError) {
      console.error(`Error reading file ${filename}:`, fileError);
      // Continue with other files even if one fails
    }
  }

  // Return just the messages
  const resultsText = results.map((result) => `"${result.code}", // ${result.message}`).join("\n");
  return text(resultsText, { status: 200 });
};

