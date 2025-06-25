<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { browser } from "$app/environment";
  import diagnosticCodes from "$lib/diagnostic-error-codes.json";

  let selectedCode = $state("");
  let selectedFilePath = $state("");
  let fileContent = $state("");
  let hoveredFilePath = $state("");

  const codes = Object.keys(diagnosticCodes);

  async function loadFileContent(filePath: string) {
    if (!browser || !filePath) return;

    try {
      const response = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        fileContent = await response.text();
      } else {
        fileContent = "Error loading file";
      }
    } catch (error) {
      fileContent = "Error loading file";
    }
  }

  function handleFileHover(filePath: string) {
    hoveredFilePath = filePath;
    loadFileContent(filePath);
  }

  function handleCodeSelect(code: string) {
    selectedCode = code;
    selectedFilePath = "";
  }

  function handleCodeHover(code: string) {
    selectedCode = code;
    selectedFilePath = "";
    const files = diagnosticCodes[code];
    if (files && files.length > 0) {
      selectedFilePath = files[0];
      loadFileContent(files[0]);
    }
  }

  function handleFileSelect(filePath: string) {
    selectedFilePath = filePath;
  }

  $effect(() => {
    if (browser) {
      const urlCode = $page.url.searchParams.get("code");
      const urlFile = $page.url.searchParams.get("file");

      if (urlCode && codes.includes(urlCode)) {
        selectedCode = urlCode;
      }

      if (urlFile) {
        selectedFilePath = decodeURIComponent(urlFile);
        loadFileContent(selectedFilePath);
      }
    }
  });
</script>

<div class="container">
  <div class="column codes-column">
    <h2>Error Codes</h2>
    <div class="list">
      {#each codes as code}
        <div
          class="item"
          class:selected={selectedCode === code}
          onmouseenter={() => handleCodeHover(code)}
          onclick={() => handleCodeSelect(code)}
        >
          {code}
        </div>
      {/each}
    </div>
  </div>

  <div class="column files-column">
    <h2>Files for {selectedCode || "Select a code"}</h2>
    <div class="list">
      {#if selectedCode}
        {#each diagnosticCodes[selectedCode] as filePath}
          <div
            class="item"
            class:selected={selectedFilePath === filePath}
            class:hovered={hoveredFilePath === filePath}
            onmouseenter={() => {
              handleFileHover(filePath);
              handleFileSelect(filePath);
            }}
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
      {#if fileContent}
        <pre>{fileContent}</pre>
      {:else if selectedFilePath || hoveredFilePath}
        <p>Loading...</p>
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
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-height: 0;
  }

  h2 {
    margin: 0 0 0.5rem 0;
    font-size: 1rem;
    flex-shrink: 0;
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
  }

  .codes-column .item {
    font-family: "Courier New", monospace;
    text-align: center;
    font-weight: bold;
  }

  .item:hover {
    background-color: #f0f0f0;
  }

  .item.hovered {
    background-color: #e6f3ff;
  }

  .item.selected {
    background-color: #007acc;
    color: white;
  }

  .content {
    flex: 1;
    overflow: auto;
    background-color: #f8f8f8;
    padding: 0.5rem;
    border-radius: 2px;
    min-height: 0;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.4;
  }
</style>
