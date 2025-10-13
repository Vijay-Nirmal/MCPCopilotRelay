import { create } from 'zustand';

export interface MCPConfig {
  transport: 'stdio' | 'sse' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface MCPCapabilities {
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: any;
  }>;
  prompts?: Array<{
    name: string;
    description?: string;
    arguments?: any[];
  }>;
  resources?: Array<{
    uri: string;
    name: string;
    mimeType?: string;
  }>;
}

export interface ToolMapping {
  name: string; // Original MCP tool name
  toolId: string; // User-editable tool identifier used in VS Code
  selected: boolean;
  type: 'lm-tool' | 'command';
  displayName: string;
  description: string;
}

export interface PromptMapping {
  name: string;
  selected: boolean;
  type: 'chat-participant';
  displayName: string;
  description: string;
  slashCommand?: string;
}

export interface ExtensionSetting {
  key: string;
  type: 'string' | 'boolean' | 'number' | 'object' | 'array';
  description: string;
  default?: any;
  
  // MCP Parameter mapping - how this setting value is used in MCP connection
  mcpMapping?: {
    target: 'header' | 'env' | 'arg' | 'url-param'; // Where to inject the value
    key: string; // The key/name in the target (e.g., header name, env var name)
    required?: boolean; // Whether this is required for MCP connection
  };
  
  // For secret values (API keys, tokens)
  secret?: boolean;
}

interface WizardState {
  // Step 1: MCP Connection
  mcpConfig: MCPConfig | null;
  isConnected: boolean;
  connectionError: string | null;

  // Step 2: Discover Capabilities
  capabilities: MCPCapabilities | null;
  isDiscovering: boolean;
  discoveryError: string | null;

  // Step 3: Map to VS Code
  toolMappings: Record<string, ToolMapping>;
  promptMappings: Record<string, PromptMapping>;

  // Step 4: Extension Info
  extensionName: string;
  extensionDisplayName: string;
  extensionDescription: string;
  extensionVersion: string;
  extensionPublisher: string;
  extensionAuthor: string;
  extensionLicense: string;
  extensionRepository: string;
  extensionIcon: string;
  settings: ExtensionSetting[];

  // Step 5: Preview & Build
  isBuilding: boolean;
  buildError: string | null;
  buildSuccess: boolean;
  buildResult: { vsixPath: string; sourcePath: string } | null;

  // Extension Info (consolidated)
  extensionInfo: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    publisher: string;
    author: string;
    license: string;
    repository: string;
    icon?: string;
    iconFileName?: string; // Original file name
    iconFileData?: string; // Base64-encoded icon data
    settings: ExtensionSetting[];
  };

  // Current step
  currentStep: number;

  // Actions
  setMcpConfig: (config: MCPConfig) => void;
  setIsConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  setCapabilities: (capabilities: MCPCapabilities) => void;
  setIsDiscovering: (discovering: boolean) => void;
  setDiscoveryError: (error: string | null) => void;
  setToolMappings: (mappings: Record<string, ToolMapping>) => void;
  setPromptMappings: (mappings: Record<string, PromptMapping>) => void;
  updateToolMapping: (name: string, updates: Partial<ToolMapping>) => void;
  updatePromptMapping: (name: string, updates: Partial<PromptMapping>) => void;
  setExtensionInfo: (info: {
    name: string;
    displayName: string;
    description: string;
    version: string;
    publisher: string;
    author: string;
    license: string;
    repository: string;
    icon?: string;
    iconFileName?: string;
    iconFileData?: string;
    settings: ExtensionSetting[];
  }) => void;
  addSetting: (setting: ExtensionSetting) => void;
  removeSetting: (key: string) => void;
  updateSetting: (key: string, updates: Partial<ExtensionSetting>) => void;
  setIsBuilding: (building: boolean) => void;
  setBuildError: (error: string | null) => void;
  setBuildSuccess: (success: boolean) => void;
  setBuildResult: (result: { vsixPath: string; sourcePath: string } | null) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
  exportConfig: () => any;
  importConfig: (config: any) => void;
}

const initialState = {
  mcpConfig: null,
  isConnected: false,
  connectionError: null,
  capabilities: null,
  isDiscovering: false,
  discoveryError: null,
  toolMappings: {},
  promptMappings: {},
  extensionInfo: {
    name: '',
    displayName: '',
    description: '',
    version: '1.0.0',
    publisher: '',
    author: '',
    license: 'MIT',
    repository: '',
    icon: '',
    iconFileName: undefined,
    iconFileData: undefined,
    settings: [],
  },
  extensionName: '',
  extensionDisplayName: '',
  extensionDescription: '',
  extensionVersion: '1.0.0',
  extensionPublisher: '',
  extensionAuthor: '',
  extensionLicense: 'MIT',
  extensionRepository: '',
  extensionIcon: '',
  settings: [],
  isBuilding: false,
  buildError: null,
  buildSuccess: false,
  buildResult: null,
  currentStep: 0,
};

export const useWizardStore = create<WizardState>((set, get) => ({
  ...initialState,

  setMcpConfig: (config) => set({ mcpConfig: config }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setConnectionError: (error) => set({ connectionError: error }),
  setCapabilities: (capabilities) => set({ capabilities }),
  setIsDiscovering: (discovering) => set({ isDiscovering: discovering }),
  setDiscoveryError: (error) => set({ discoveryError: error }),
  setToolMappings: (mappings) => set({ toolMappings: mappings }),
  setPromptMappings: (mappings) => set({ promptMappings: mappings }),

  updateToolMapping: (name, updates) =>
    set((state) => ({
      toolMappings: {
        ...state.toolMappings,
        [name]: { ...state.toolMappings[name]!, ...updates },
      },
    })),

  updatePromptMapping: (name, updates) =>
    set((state) => ({
      promptMappings: {
        ...state.promptMappings,
        [name]: { ...state.promptMappings[name]!, ...updates },
      },
    })),

  setExtensionInfo: (info) => set({ extensionInfo: info }),

  addSetting: (setting) =>
    set((state) => ({
      extensionInfo: {
        ...state.extensionInfo,
        settings: [...state.extensionInfo.settings, setting],
      },
    })),

  removeSetting: (key) =>
    set((state) => ({
      extensionInfo: {
        ...state.extensionInfo,
        settings: state.extensionInfo.settings.filter((s) => s.key !== key),
      },
    })),

  updateSetting: (key, updates) =>
    set((state) => ({
      extensionInfo: {
        ...state.extensionInfo,
        settings: state.extensionInfo.settings.map((s) =>
          s.key === key ? { ...s, ...updates } : s
        ),
      },
    })),

  setIsBuilding: (building) => set({ isBuilding: building }),
  setBuildError: (error) => set({ buildError: error }),
  setBuildSuccess: (success) => set({ buildSuccess: success }),
  setBuildResult: (result) => set({ buildResult: result }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, 4) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),

  reset: () => set(initialState),

  exportConfig: () => {
    const state = get();
    return {
      mcp: state.mcpConfig,
      capabilities: state.capabilities,
      mappings: {
        tools: state.toolMappings,
        prompts: state.promptMappings,
      },
      settings: state.extensionInfo.settings.reduce((acc, s) => {
        acc[s.key] = {
          type: s.type,
          description: s.description,
          default: s.default,
          mcpMapping: s.mcpMapping,
          secret: s.secret,
        };
        return acc;
      }, {} as Record<string, any>),
      extension: {
        name: state.extensionInfo.name,
        displayName: state.extensionInfo.displayName,
        description: state.extensionInfo.description,
        version: state.extensionInfo.version,
        publisher: state.extensionInfo.publisher,
        author: state.extensionInfo.author,
        license: state.extensionInfo.license,
        repository: state.extensionInfo.repository,
        icon: state.extensionInfo.icon,
        iconFileName: state.extensionInfo.iconFileName,
        iconFileData: state.extensionInfo.iconFileData,
      },
    };
  },

  importConfig: (config) => {
    set({
      mcpConfig: config.mcp || null,
      isConnected: true, // Mark as connected since we're importing a valid config
      connectionError: null,
      capabilities: config.capabilities || null,
      toolMappings: config.mappings?.tools || {},
      promptMappings: config.mappings?.prompts || {},
      extensionInfo: {
        name: config.extension?.name || '',
        displayName: config.extension?.displayName || '',
        description: config.extension?.description || '',
        version: config.extension?.version || '1.0.0',
        publisher: config.extension?.publisher || '',
        author: config.extension?.author || '',
        license: config.extension?.license || 'MIT',
        repository: config.extension?.repository || '',
        icon: config.extension?.icon || '',
        iconFileName: config.extension?.iconFileName,
        iconFileData: config.extension?.iconFileData,
        settings: config.settings ? Object.entries(config.settings).map(([key, value]: any) => ({
          key,
          type: value.type,
          description: value.description,
          default: value.default,
          mcpMapping: value.mcpMapping,
          secret: value.secret,
        })) : [],
      },
      // Also set legacy fields for backward compatibility
      extensionName: config.extension?.name || '',
      extensionDisplayName: config.extension?.displayName || '',
      extensionDescription: config.extension?.description || '',
      extensionVersion: config.extension?.version || '1.0.0',
      extensionPublisher: config.extension?.publisher || '',
      extensionAuthor: config.extension?.author || '',
      extensionLicense: config.extension?.license || 'MIT',
      extensionRepository: config.extension?.repository || '',
      extensionIcon: config.extension?.icon || '',
      settings: config.settings ? Object.entries(config.settings).map(([key, value]: any) => ({
        key,
        type: value.type,
        description: value.description,
        default: value.default,
        mcpMapping: value.mcpMapping,
        secret: value.secret,
      })) : [],
      currentStep: 4, // Jump directly to Preview & Build step
    });
  },
}));
