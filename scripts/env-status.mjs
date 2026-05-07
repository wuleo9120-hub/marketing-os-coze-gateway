import "../apps/api/src/core/env-loader.mjs";
import { getConfigOverview } from "../apps/api/src/core/config-registry.mjs";

const wanted = [
  "MINIMAX_API_KEY",
  "MINIMAX_BASE_URL",
  "MINIMAX_MODEL",
  "OPENCLAW_BASE_URL",
  "HERMES_GATEWAY_URL",
  "CODEX_GATEWAY_URL"
];

const env = Object.fromEntries(
  wanted.map((name) => {
    const value = process.env[name] ?? "";
    return [
      name,
      {
        present: Boolean(value),
        length: value.length,
        masked: value ? `${value.slice(0, 4)}...${value.slice(-4)}` : null
      }
    ];
  })
);

console.log(
  JSON.stringify(
    {
      env,
      config: getConfigOverview().totals
    },
    null,
    2
  )
);
