import { createJsonStoreAdapter } from "./json-store-adapter.mjs";
import { createPostgresStoreAdapter } from "./postgres-store-adapter.mjs";

export function createStoreAdapter(options = {}) {
  const adapterName = options.adapter ?? process.env.STORE_ADAPTER ?? "json";

  if (adapterName === "json") {
    return createJsonStoreAdapter(options);
  }

  if (adapterName === "postgres") {
    return createPostgresStoreAdapter(options);
  }

  throw new Error(`Unsupported STORE_ADAPTER: ${adapterName}`);
}

export const STORE_ADAPTER_CONTRACT = {
  load: "load(defaultState, normalizeState) -> normalized state",
  persist: "persist(state) -> void",
  info: "info(sequence) -> serializable metadata"
};
