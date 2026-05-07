import { generateWithCodexSupervised } from "./codex-supervised-provider.mjs";
import { generateWithMiniMax } from "./minimax-provider.mjs";
import { generateWithOpenAI } from "./openai-provider.mjs";
import { generateWithStub } from "./stub-provider.mjs";

export async function generateAgentResult(request) {
  if (request.model_route.provider === "codex_supervised") {
    try {
      return await generateWithCodexSupervised(request);
    } catch (error) {
      if (request.model_route.fallback !== "stub") throw error;
      return generateWithStub({
        ...request,
        provider_error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (request.model_route.provider === "minimax") {
    try {
      return await generateWithMiniMax(request);
    } catch (error) {
      if (request.model_route.fallback !== "stub") throw error;
      return generateWithStub({
        ...request,
        provider_error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  if (request.model_route.provider === "openai") {
    try {
      return await generateWithOpenAI(request);
    } catch (error) {
      if (request.model_route.fallback !== "stub") throw error;
      return generateWithStub({
        ...request,
        provider_error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return generateWithStub(request);
}
