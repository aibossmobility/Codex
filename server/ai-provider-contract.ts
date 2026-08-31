export type ModelExecutionRoute = "local_model" | "cloud_model";

export type ProviderNeutralModelTask = {
  task: "classify" | "extract" | "summarize" | "reason" | "generate";
  instructions: string;
  input: string;
  response_format: "text" | "json";
  max_output_tokens?: number;
};

export type ProviderNeutralModelResult = {
  output: string;
  route: ModelExecutionRoute;
  provider_id: string;
  model_id: string;
  input_tokens?: number;
  output_tokens?: number;
  estimated_cost_micros: number;
};

/**
 * Provider adapters translate this neutral contract at the edge. Executive
 * memory, actions, connectors, and UI must never depend on vendor payloads.
 */
export interface AiProviderAdapter {
  readonly provider_id: string;
  readonly route: ModelExecutionRoute;
  isAvailable(): Promise<boolean>;
  run(task: ProviderNeutralModelTask): Promise<ProviderNeutralModelResult>;
}
