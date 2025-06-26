# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a specialized development tool for visualizing TypeScript diagnostic error codes extracted from the TypeScript compiler's test suite. It provides a 3-column interactive interface to browse error codes, their associated test files, and the actual error content.

## Development Commands

```bash
# Initialize/update error code data (requires TypeScript repo)
DEBUG=1 TS_REPO_DIR=../TypeScript OUTPUT_DIR=./src/lib bun ./init.ts

# Start development server (requires TypeScript repo path)
TS_REPO_DIR=../TypeScript npm run dev

# Build and other standard commands
npm run build
npm run preview
npm run check
npm run check:watch
npm run format

# TypeScript and Svelte checking
npm run check          # One-time check
npm run check:watch    # Watch mode
```

## Architecture

### Data Generation Pipeline

- `init.ts` scans TypeScript repo's `tests/baselines/reference/*.errors.txt` files
- Extracts diagnostic error codes using regex pattern matching
- Generates `src/lib/diagnostic-error-codes.json` mapping codes to files
- Requires `TS_REPO_DIR` environment variable pointing to TypeScript repository

### Runtime Architecture

- **SvelteKit 2 + Svelte 5** frontend with reactive state management
- **3-column layout**: Error codes (120px) | Files (1fr) | Content (2fr)
- **API endpoint** (`/api/file`) serves `.errors.txt` file contents from local filesystem
- **Mouse-driven interaction**: Hover-based navigation, no clicking required

### Key Files

- `/src/routes/+page.svelte` - Main UI component with state management and CSS Grid layout
- `/src/routes/api/file/+server.ts` - File serving API with path validation and ANSI stripping
- `/src/lib/diagnostic-error-codes.json` - Generated error code mappings (created by init.ts)
- `/src/lib/highlight.ts` - CSS Custom Highlight API for error code highlighting in content
- `/init.ts` - Data extraction script that processes TypeScript test suite baseline files

## Environment Requirements

This tool requires a local TypeScript repository clone alongside this project. The `TS_REPO_DIR` environment variable must point to the TypeScript repo root for both data generation and runtime file access.

## UI Interaction Patterns

- Error codes and file lists use `mouseenter` events for hover-based selection
- No URL manipulation - pure client-side state management
- File content loads dynamically via API calls with AbortController for cleanup
- CSS Grid layout with overflow handling for large datasets
- Checkbox-based review tracking with localStorage persistence
- Error code highlighting in file content using CSS Custom Highlight API

## State Management

- Svelte 5 reactive state with `$state()` and `$derived()`
- Range/code/file selection cascade automatically
- Review status tracked in localStorage and managed with Set data structure
- File content fetched on demand with proper cleanup using AbortController
