<script lang="ts">
  import { browser } from "$app/environment";
  import diagnosticCodes from "$lib/diagnostic-error-codes.json";
  import { highlightErrorCode } from "$lib/highlight.js";

  let selectedRange = $state("");
  let selectedCode = $state("");
  let selectedFilePath = $state("");

  let reviewedCodes = $state(new Map<string, "yes" | "no">());

  // Load reviewed codes from localStorage
  $effect(() => {
    if (!browser) return;
    const saved = localStorage.getItem("reviewed-codes");
    if (!saved) return;
    reviewedCodes = new Map(JSON.parse(saved));
  });

  // Group codes by 1000s
  const ranges = $derived.by(() => {
    const rangeMap = new Map<string, string[]>();
    // Already sorted
    for (const code of Object.keys(diagnosticCodes)) {
      const num = parseInt(code);
      const range = `${Math.floor(num / 1000)}xxx`;

      if (!rangeMap.has(range)) rangeMap.set(range, []);
      rangeMap.get(range)!.push(code);
    }

    return rangeMap;
  });

  // Filter codes by selected range
  const filteredCodes = $derived.by(() => {
    if (!selectedRange) return [];
    return ranges.get(selectedRange) ?? [];
  });

  // Get files for selected code
  const selectedCodeFiles = $derived.by(() => {
    if (!selectedCode) return [];
    return (diagnosticCodes as Record<string, string[]>)[selectedCode] ?? [];
  });

  // Auto-select first file when code changes
  $effect(() => {
    selectedFilePath = selectedCodeFiles[0];
  });

  // Set review status
  function setReviewStatus(code: string, status: "yes" | "no") {
    reviewedCodes.set(code, status);
    reviewedCodes = new Map(reviewedCodes); // Trigger reactivity
    localStorage.setItem("reviewed-codes", JSON.stringify([...reviewedCodes]));
  }

  // Sort codes: unreviewed first, then reviewed
  const sortedCodes = $derived(
    filteredCodes.toSorted((a, b) => {
      const aReviewed = reviewedCodes.has(a);
      const bReviewed = reviewedCodes.has(b);

      if (aReviewed && !bReviewed) return 1;
      if (!aReviewed && bReviewed) return -1;
      return parseInt(a) - parseInt(b);
    }),
  );

  let ac = new AbortController();
  const fileContentPromise = $derived.by(() => {
    if (!browser || !selectedFilePath) return null;

    ac.abort();
    ac = new AbortController();
    return fetch(`/api/file?path=${encodeURIComponent(selectedFilePath)}`, {
      signal: ac.signal,
    }).then((r) => r.text());
  });

  function handleRangeHover(range: string) {
    selectedRange = range;
    const rangeData = ranges.get(range) ?? [];
    selectedCode = rangeData.length > 0 ? rangeData[0] : "";
  }

  function handleCodeHover(code: string) {
    selectedCode = code;
  }

  function handleFileHover(filePath: string) {
    selectedFilePath = filePath;
  }
</script>

<header class="header">
  <h1>TSC Error Diagnostic Codes Viewer</h1>
  <p>Browse error codes extracted from TypeScript `compiler` and `conformance` tests</p>
</header>

<div class="container">
  <div class="column ranges-column">
    <h2>Ranges</h2>
    <div class="list">
      {#each ranges as [range, codes] (range)}
        <div
          class="item"
          class:selected={selectedRange === range}
          onmouseenter={() => handleRangeHover(range)}
          role="button"
          tabindex="0"
        >
          {range}({codes.length})
        </div>
      {/each}
    </div>
  </div>

  <div class="column codes-column">
    <h2>Codes: <span class="dynamic-text">{selectedRange || "-"}</span></h2>
    <div class="list">
      {#each sortedCodes as code (code)}
        <div
          class="item"
          class:selected={selectedCode === code}
          class:reviewed={reviewedCodes.has(code)}
          onmouseenter={() => handleCodeHover(code)}
          role="button"
          tabindex="0"
        >
          <div class="radio-group" title="Can support?">
            <label class="radio-label">
              <input
                type="radio"
                name="review-{code}"
                value="yes"
                checked={reviewedCodes.get(code) === "yes"}
                onchange={() => setReviewStatus(code, "yes")}
              />
              Y
            </label>
            <label class="radio-label">
              <input
                type="radio"
                name="review-{code}"
                value="no"
                checked={reviewedCodes.get(code) === "no"}
                onchange={() => setReviewStatus(code, "no")}
              />
              N
            </label>
          </div>
          <span class="code-text">{code}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="column files-column">
    <h2>Files: <span class="dynamic-text">{selectedCode || "-"}</span></h2>
    <div class="list">
      {#each selectedCodeFiles as filePath}
        <div
          class="item"
          class:selected={selectedFilePath === filePath}
          onmouseenter={() => handleFileHover(filePath)}
          role="button"
          tabindex="0"
        >
          {filePath}
        </div>
      {/each}
    </div>
  </div>

  <div class="column content-column">
    <h2>Content: <span class="dynamic-text">{selectedFilePath || "-"}</span></h2>
    <div class="content">
      {#if fileContentPromise}
        {#await fileContentPromise}
          <p>Loading...</p>
        {:then content}
          <pre {@attach highlightErrorCode(selectedCode)}>{content}</pre>
        {:catch error}
          <p>{error}</p>
        {/await}
      {:else}
        <p>Select a file to view its content</p>
      {/if}
    </div>
  </div>
</div>

<svelte:head>
  <title>TSC Error Diagnostic Codes Viewer</title>
</svelte:head>

<style>
  :root {
    /* Colors */
    --bg-primary: #181818;
    --bg-secondary: #222222;
    --border-color: #444444;
    --text-primary: #e0e0e0;
    --text-secondary: #cccccc;
    --text-muted: #999999;
    --accent-blue: #9a8a7a;
    --hover-bg: #2a2d2e;
    --hover-blue: #094771;
    --selected-bg: #7a8a9a;
    --selected-text: #ffffff;
    --highlight-bg: #ffd70080;
    --highlight-text: #1a1a1a;
    --highlight-border: #ffd700;

    /* Fonts */
    --font-mono: "Courier New", monospace;
    --font-size-sm: 0.9rem;
    --font-size-base: 1rem;
    --font-weight-normal: normal;
    --font-weight-bold: bold;
    --line-height-base: 1.4;

    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;

    /* Layout */
    --border-radius: 4px;
    --border-radius-sm: 2px;
    --gap: 0.5rem;
  }

  ::highlight(error-code) {
    background-color: var(--highlight-bg);
  }

  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-mono);
    height: 100vh;
    display: grid;
    grid-template-rows: auto 1fr;
  }

  .header {
    background-color: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
    padding: var(--spacing-xs) var(--spacing-md);
    text-align: left;
  }

  .header h1 {
    margin: 0;
    font-size: 1rem;
    color: var(--text-primary);
    display: inline;
  }

  .header p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.8rem;
    display: inline;
    margin-left: var(--spacing-sm);
  }

  .container {
    display: grid;
    grid-template-columns: 120px 160px 1fr 2fr;
    gap: var(--gap);
    padding: var(--spacing-md) var(--spacing-sm);
    box-sizing: border-box;
    overflow: hidden;
  }

  .column {
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    background-color: var(--bg-secondary);
  }

  h2 {
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-base);
    flex-shrink: 0;
    color: var(--text-secondary);
  }

  .dynamic-text {
    color: var(--accent-blue);
    font-weight: var(--font-weight-bold);
  }

  .list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .item {
    padding: var(--spacing-xs) var(--spacing-sm);
    cursor: pointer;
    border-radius: var(--border-radius-sm);
    margin-bottom: 1px;
    word-break: break-all;
    color: var(--text-primary);
  }

  .ranges-column .item {
    font-weight: var(--font-weight-bold);
    text-align: center;
    font-size: var(--font-size-sm);
  }

  .codes-column .item {
    font-weight: var(--font-weight-bold);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs);
  }

  .codes-column .item.reviewed {
    opacity: 0.6;
  }

  .radio-group {
    display: flex;
    gap: var(--spacing-sm);
    align-items: center;
    font-size: 0.75rem;
    font-weight: normal;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 2px;
    cursor: pointer;
  }

  .radio-label input[type="radio"] {
    margin: 0;
  }

  .codes-column .item .code-text {
    flex: 1;
    text-align: center;
    font-size: var(--font-size-sm);
  }

  .item:hover {
    background-color: var(--hover-bg);
  }

  .item.selected {
    background-color: var(--selected-bg);
    color: var(--selected-text);
  }

  .content {
    flex: 1;
    overflow: auto;
    background-color: var(--bg-primary);
    padding: var(--spacing-sm);
    border-radius: var(--border-radius-sm);
    min-height: 0;
    border: 1px solid var(--border-color);
  }

  .content p {
    color: var(--text-muted);
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
    color: var(--text-primary);
  }
</style>
