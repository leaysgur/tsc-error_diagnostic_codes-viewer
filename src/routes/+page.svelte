<script lang="ts">
  import { browser } from "$app/environment";
  import diagnosticCodes from "$lib/diagnostic-error-codes.json";

  let selectedCode = $state("");
  let selectedFilePath = $state("");
  let reviewedCodes = $state(new Set<string>());

  const codes = Object.keys(diagnosticCodes);

  // Load reviewed codes from localStorage
  $effect(() => {
    if (browser) {
      const saved = localStorage.getItem("reviewed-codes");
      if (saved) {
        reviewedCodes = new Set(JSON.parse(saved));
      }
    }
  });

  // Save reviewed codes to localStorage
  function saveReviewedCodes() {
    if (browser) {
      localStorage.setItem("reviewed-codes", JSON.stringify([...reviewedCodes]));
    }
  }

  // Toggle review status
  function toggleReviewStatus(code: string) {
    if (reviewedCodes.has(code)) {
      reviewedCodes.delete(code);
    } else {
      reviewedCodes.add(code);
    }
    reviewedCodes = new Set(reviewedCodes); // Trigger reactivity
    saveReviewedCodes();
  }

  // Sort codes: unreviewed first, then reviewed
  const sortedCodes = $derived(
    [...codes].sort((a, b) => {
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
      .then(response => {
        if (response.ok) {
          return response.text();
        } else {
          throw new Error("Error loading file");
        }
      })
      .catch(() => "Error loading file");
  });

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
  <div class="column codes-column">
    <h2>Error Codes</h2>
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
    <h2>Files for {selectedCode || "Select a code"}</h2>
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
    <h2>Content</h2>
    <div class="content">
      {#if fileContentPromise()}
        {#await fileContentPromise()}
          <p>Loading...</p>
        {:then content}
          <pre>{content}</pre>
        {:catch error}
          <p>Error loading file</p>
        {/await}
      {:else}
        <p>Select a file to view its content</p>
      {/if}
    </div>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
    background-color: #1e1e1e;
    color: #d4d4d4;
  }

  .container {
    display: grid;
    grid-template-columns: 120px 1fr 2fr;
    height: 100vh;
    width: 100vw;
    gap: 0.5rem;
    padding: 0.5rem;
    box-sizing: border-box;
    overflow: hidden;
  }

  .column {
    border: 1px solid #3e3e3e;
    border-radius: 4px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
    background-color: #252526;
  }

  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    flex-shrink: 0;
    color: #cccccc;
  }

  .list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .item {
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    border-radius: 2px;
    margin-bottom: 1px;
    word-break: break-all;
    color: #d4d4d4;
  }

  .codes-column .item {
    font-family: "Courier New", monospace;
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem;
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
    background-color: #2a2d2e;
  }


  .item.selected {
    background-color: #0e639c;
    color: white;
  }

  .content {
    flex: 1;
    overflow: auto;
    background-color: #1e1e1e;
    padding: 0.5rem;
    border-radius: 2px;
    min-height: 0;
    border: 1px solid #3e3e3e;
  }

  .content p {
    color: #969696;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.4;
    color: #d4d4d4;
  }
</style>
