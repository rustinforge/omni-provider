// OpenClaw type stubs

export interface OpenClawPluginDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  register: (api: OpenClawPluginApi) => void;
}

export interface OpenClawPluginApi {
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
  };
  config: Record<string, unknown>;
  pluginConfig?: Record<string, unknown>;
  registerProvider: (provider: unknown) => void;
  registerCommand: (command: OpenClawPluginCommandDefinition) => void;
  registerService: (service: OpenClawService) => void;
}

export interface OpenClawPluginCommandDefinition {
  name: string;
  description: string;
  acceptsArgs?: boolean;
  requireAuth?: boolean;
  handler: (ctx: PluginCommandContext) => Promise<{ text: string; isError?: boolean }>;
}

export interface PluginCommandContext {
  args?: string;
  userId?: string;
}

export interface OpenClawService {
  id: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}
