import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../..", import.meta.url));
const defaultPath = join(root, "data/dev-store.json");

export function createJsonStoreAdapter(options = {}) {
  const path = options.path ?? process.env.STORE_PATH ?? defaultPath;

  return {
    kind: "json",
    path,
    load(defaultState, normalizeState) {
      try {
        const raw = readFileSync(path, "utf8");
        return normalizeState(JSON.parse(raw));
      } catch (error) {
        if (error?.code !== "ENOENT") {
          console.warn(`Failed to read store at ${path}; starting fresh.`);
        }
        return defaultState();
      }
    },
    persist(state) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(state, null, 2));
    },
    info(sequence) {
      return {
        adapter: "json",
        path,
        sequence,
        file_size_bytes: fileSize(path)
      };
    }
  };
}

function fileSize(path) {
  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}
