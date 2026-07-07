import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — created on first use so the missing env var only blows up
// at call time, not at module load (which would crash the entire server).
let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export const CLAUDE_MODEL = "claude-sonnet-4-6";
