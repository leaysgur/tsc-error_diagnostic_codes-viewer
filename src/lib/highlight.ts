import type { Attachment } from "svelte/attachments";

const HIGHLIGHT_SELECTOR = "error-code";

// CSS Custom Highlight API attachment for error code highlighting
export function highlightErrorCode(errorCode: string): Attachment {
  return (element: Element) => {
    const textNode = element.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;

    const text = textNode.textContent;
    if (!text) return;

    const searchTerm = `TS${errorCode}`;

    CSS.highlights.clear();

    const ranges: Range[] = [];
    let startIndex = 0;
    while (true) {
      const index = text.indexOf(searchTerm, startIndex);
      if (index === -1) break;

      const range = document.createRange();
      range.setStart(textNode, index);
      range.setEnd(textNode, index + searchTerm.length);
      ranges.push(range);

      startIndex = index + searchTerm.length;
    }

    if (ranges.length > 0) {
      const highlight = new Highlight(...ranges);
      CSS.highlights.set(HIGHLIGHT_SELECTOR, highlight);
    }

    return () => CSS.highlights.clear();
  };
}
