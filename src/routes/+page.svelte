<script lang="ts">
  import { browser } from "$app/environment";
  import diagnosticCodes from "$lib/diagnostic-error-codes.json";

  let selectedRange = $state("");
  let selectedCode = $state("");
  let selectedFilePath = $state("");
  let reviewedCodes = $state(new Set<string>());

  const codes = Object.keys(diagnosticCodes);

  // Group codes by 1000s
  const ranges = $derived.by(() => {
    const rangeMap = new Map<string, string[]>();
    codes.forEach((code) => {
      const num = parseInt(code);
      const range = `${Math.floor(num / 1000)}xxx`;
      if (!rangeMap.has(range)) {
        rangeMap.set(range, []);
      }
      rangeMap.get(range)!.push(code);
    });
    return Array.from(rangeMap.entries()).sort((a, b) => {
      const aNum = parseInt(a[0]);
      const bNum = parseInt(b[0]);
      return aNum - bNum;
    });
  });

  // Filter codes by selected range
  const filteredCodes = $derived(() => {
    if (!selectedRange) return [];
    const rangeData = ranges.find(([range]) => range === selectedRange);
    return rangeData ? rangeData[1] : [];
  });

  // Load reviewed codes from localStorage
  $effect(() => {
    if (browser) {
      const saved = localStorage.getItem("reviewed-codes");
      if (saved) {
        reviewedCodes = new Set(JSON.parse(saved));
      }
    }
  });

  // Toggle review status
  function toggleReviewStatus(code: string) {
    if (reviewedCodes.has(code)) {
      reviewedCodes.delete(code);
    } else {
      reviewedCodes.add(code);
    }
    reviewedCodes = new Set(reviewedCodes); // Trigger reactivity
    localStorage.setItem("reviewed-codes", JSON.stringify([...reviewedCodes]));
  }

  // Sort codes: unreviewed first, then reviewed
  const sortedCodes = $derived(
    [...filteredCodes()].sort((a, b) => {
      const aReviewed = reviewedCodes.has(a);
      const bReviewed = reviewedCodes.has(b);

      if (aReviewed && !bReviewed) return 1;
      if (!aReviewed && bReviewed) return -1;
      return parseInt(a) - parseInt(b);
    }),
  );

  const fileContentPromise = $derived(() => {
    if (!browser || !selectedFilePath) return null;

    return fetch(`/api/file?path=${encodeURIComponent(selectedFilePath)}`)
      .then((response) => {
        if (response.ok) {
          return response.text();
        } else {
          throw new Error("Error loading file");
        }
      })
      .catch(() => "Error loading file");
  });

  function handleRangeHover(range: string) {
    selectedRange = range;
    const rangeData = ranges.find(([r]) => r === range);
    if (rangeData && rangeData[1].length > 0) {
      const sortedRangeCodes = [...rangeData[1]].sort((a, b) => {
        const aReviewed = reviewedCodes.has(a);
        const bReviewed = reviewedCodes.has(b);

        if (aReviewed && !bReviewed) return 1;
        if (!aReviewed && bReviewed) return -1;
        return parseInt(a) - parseInt(b);
      });
      selectedCode = sortedRangeCodes[0];
      const files = (diagnosticCodes as Record<string, string[]>)[sortedRangeCodes[0]];
      if (files && files.length > 0) {
        selectedFilePath = files[0];
      } else {
        selectedFilePath = "";
      }
    } else {
      selectedCode = "";
      selectedFilePath = "";
    }
  }

  function handleFileHover(filePath: string) {
    selectedFilePath = filePath;
  }

  function handleCodeHover(code: string) {
    selectedCode = code;
    const files = (diagnosticCodes as Record<string, string[]>)[code];
    if (files && files.length > 0) {
      selectedFilePath = files[0];
    } else {
      selectedFilePath = "";
    }
  }
</script>

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
    <h2>Codes: <span class="dynamic-text">{selectedRange || "Select a range"}</span></h2>
    <div class="list">
      {#each sortedCodes as code (code)}
        <label
          class="item"
          class:selected={selectedCode === code}
          class:reviewed={reviewedCodes.has(code)}
          onmouseenter={() => handleCodeHover(code)}
        >
          <input
            type="checkbox"
            checked={reviewedCodes.has(code)}
            onchange={() => toggleReviewStatus(code)}
          />
          <span class="code-text">{code}</span>
        </label>
      {/each}
    </div>
  </div>

  <div class="column files-column">
    <h2>Files: <span class="dynamic-text">{selectedCode || "Select a code"}</span></h2>
    <div class="list">
      {#if selectedCode}
        {#each (diagnosticCodes as Record<string, string[]>)[selectedCode] as filePath}
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
      {/if}
    </div>
  </div>

  <div class="column content-column">
    <h2>Content: <span class="dynamic-text">{selectedFilePath || "Select a file"}</span></h2>
    <div class="content">
      {#if fileContentPromise()}
        {#await fileContentPromise()}
          <p>Loading...</p>
        {:then content}
          <pre>{content}</pre>
        {:catch error}
          <p>{error}</p>
        {/await}
      {:else}
        <p>Select a file to view its content</p>
      {/if}
    </div>
  </div>
</div>

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

  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-mono);
  }

  .container {
    display: grid;
    grid-template-columns: 120px 160px 1fr 2fr;
    height: 100vh;
    width: 100vw;
    gap: var(--gap);
    padding: var(--spacing-sm);
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

  .codes-column .item input[type="checkbox"] {
    margin: 0;
    flex-shrink: 0;
  }

  .codes-column .item .code-text {
    flex: 1;
    text-align: center;
  }

  .item:hover {
    background-color: var(--hover-bg);
  }

  .item.selected {
    background-color: var(--selected-bg);
    color: white;
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
