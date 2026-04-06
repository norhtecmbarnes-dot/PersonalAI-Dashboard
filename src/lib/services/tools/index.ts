/**
 * Tools Index
 * Export all tools for registry
 */

export { vectorSearchTool } from './vector-search-tool';
export { sqlQueryTool } from './sql-query-tool';
export { calculateTool } from './calculate-tool';
export { webSearchTool } from './web-search-tool';
export { webFetchTool } from './web-fetch-tool';

// Calendar tools
export { calendarAddEventTool } from './calendar-add-event-tool';
export { calendarGetEventsTool } from './calendar-get-events-tool';
export { calendarDeleteEventTool } from './calendar-delete-event-tool';

// Document tools
export { documentListTool } from './document-list-tool';
export { documentChatTool } from './document-chat-tool';
export { documentReadTool } from './document-read-tool';
export { createWordDocumentTool } from './create-word-document-tool';
export { createSpreadsheetTool } from './create-spreadsheet-tool';
export { createPresentationTool } from './create-presentation-tool';
export { listDocumentsTool } from './list-documents-tool';
export { appendToSpreadsheetTool } from './append-to-spreadsheet-tool';

// Settings tools
export { getApiKeysTool } from './get-api-keys-tool';
export { setApiKeyTool } from './set-api-key-tool';
export { getSettingsTool } from './get-settings-tool';
export { setModelPreferenceTool } from './set-model-preference-tool';
export { toggleSearchModeTool } from './toggle-search-mode-tool';
export { removeApiKeyTool } from './remove-api-key-tool';

// Custom tools management
export { listCustomToolsTool } from './list-custom-tools-tool';
export { createCustomToolTool } from './create-custom-tool-tool';
export { deleteCustomToolTool } from './delete-custom-tool-tool';
export { toggleCustomToolTool } from './toggle-custom-tool-tool';

// Prompt tools
export { savePromptTool } from './save-prompt-tool';
export { getPromptsTool } from './get-prompts-tool';
export { usePromptTool } from './use-prompt-tool';
export { deletePromptTool } from './delete-prompt-tool';

// Note extraction
export { extractFromNoteTool } from './extract-from-note-tool';
