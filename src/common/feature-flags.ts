/**
 * Feature Flags
 * 
 * Centralized configuration for experimental and proposed API features
 */

/**
 * Enable Language Model Tool Sets
 * 
 * When enabled, allows grouping language model tools under a single tool set.
 * 
 * Note: This feature requires VS Code's proposed API 'contribLanguageModelToolSets'.
 * Keep this disabled until the API is stable and officially released.
 * 
 * @see https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/common/tools/languageModelToolsContribution.ts
 */
export const ENABLE_TOOLSETS = false;
