import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { callCompanionCommand } from './command-client.js';
import { createRetrovisorMcpServer } from './mcp-server.js';

const server = createRetrovisorMcpServer((name, args) => callCompanionCommand(name, args));
const transport = new StdioServerTransport();

try {
  await server.connect(transport);
} catch (error) {
  process.stderr.write(`[retrovisor-mcp] ${error?.message || error}\n`);
  process.exitCode = 1;
}
