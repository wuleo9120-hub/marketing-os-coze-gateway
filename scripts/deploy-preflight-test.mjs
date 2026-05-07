import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dockerfile = readFileSync("Dockerfile", "utf8");
const renderYaml = readFileSync("render.yaml", "utf8");
const envExample = readFileSync(".env.example", "utf8");
const server = readFileSync("apps/api/src/server.mjs", "utf8");

assert.match(dockerfile, /FROM node:24-alpine/);
assert.match(dockerfile, /HOST=0\.0\.0\.0/);
assert.match(dockerfile, /STORE_PATH=\/data\/dev-store\.json/);
assert.match(renderYaml, /runtime: docker/);
assert.match(renderYaml, /COZE_PLUGIN_ENABLED/);
assert.match(renderYaml, /COZE_PLUGIN_TOKEN/);
assert.match(envExample, /COZE_PLUGIN_TOKEN=/);
assert.match(server, /api\/coze\/openapi\.yaml/);
assert.match(server, /process\.env\.RENDER/);

console.log("deploy-preflight-test passed", {
  dockerfile_bytes: Buffer.byteLength(dockerfile),
  render_yaml_bytes: Buffer.byteLength(renderYaml)
});
