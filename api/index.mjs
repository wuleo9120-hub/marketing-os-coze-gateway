import { handleRequest } from "../apps/api/src/server.mjs";

export default async function handler(request, response) {
  return handleRequest(request, response);
}
