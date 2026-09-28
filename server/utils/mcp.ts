import type { ToolSet } from "ai";

/**
 * MCP tools seam.
 *
 * Configure MCP servers with the `MCP_SERVERS` env var (JSON array):
 *   MCP_SERVERS=[{"name":"docs","url":"https://mcp.example.com/sse"}]
 *
 * Returns an empty toolset while no servers are configured, so the assistant
 * keeps working without tools. The integration (AI SDK MCP client + auth) is
 * intentionally left as a seam.
 */
export async function loadMcpTools(): Promise<ToolSet> {
	const raw = process.env.MCP_SERVERS;
	if (!raw) return {};

	try {
		const servers = JSON.parse(raw) as { name?: string; url?: string }[];
		if (!Array.isArray(servers) || servers.length === 0) return {};

		// TODO(integration): connect each server and merge its tools, e.g.
		//   import { experimental_createMCPClient as createMCPClient } from "ai";
		//   const client = await createMCPClient({ transport: { type: "sse", url } });
		//   Object.assign(tools, await client.tools());
		return {};
	} catch {
		return {};
	}
}
