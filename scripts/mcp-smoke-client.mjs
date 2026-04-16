/**
 * MCP smoke test — protocol-level client over stdio.
 *
 * Spawns dist/serve.js against /Users/ved/Developer/grimoire-wiki, then
 * exercises every registered tool via real JSON-RPC calls. This is the same
 * transport + protocol Claude Desktop uses, so a clean pass here = a clean
 * pass in any MCP client.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const SERVE_JS = '/Users/ved/Developer/grimoire/dist/serve.js';
const WORKSPACE = '/Users/ved/Developer/grimoire-wiki';

const PROBES = [
  { tool: 'grimoire_list_topics', args: {}, label: 'List all topics' },
  { tool: 'grimoire_query', args: { query: 'what is grimoire' }, label: 'Synthesize: "what is grimoire"' },
  { tool: 'grimoire_query', args: { query: 'how does grimoire compare to obsidian' }, label: 'Synthesize: grimoire vs obsidian' },
  { tool: 'grimoire_get_article', args: { slug: 'why-grimoire-exists', mode: 'auto' }, label: 'Get article (auto mode)' },
  { tool: 'grimoire_get_article', args: { slug: 'why-grimoire-exists', mode: 'summary' }, label: 'Get article (summary mode)' },
  { tool: 'grimoire_get_section', args: { slug: 'the-mcp-moat', heading: 'The seven tools' }, label: 'Get section (heading-level slice)' },
  { tool: 'grimoire_open_questions', args: {}, label: 'Open questions from overview' },
  { tool: 'grimoire_coverage_gaps', args: {}, label: 'Coverage gaps' },
  { tool: 'grimoire_search', args: { query: 'karpathy pattern', limit: 3 }, label: 'Full-text search: "karpathy pattern"' },
];

function truncate(text, max = 400) {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n... [truncated, total ${text.length} chars]`;
}

function extractText(result) {
  if (!result?.content?.[0]) return JSON.stringify(result);
  const first = result.content[0];
  if (first.type === 'text') return first.text;
  return JSON.stringify(first);
}

async function main() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [SERVE_JS, WORKSPACE],
  });

  const client = new Client(
    { name: 'grimoire-smoke-client', version: '1.0.0' },
    { capabilities: {} },
  );

  console.log('# Grimoire MCP smoke test');
  console.log(`- Server: ${SERVE_JS}`);
  console.log(`- Workspace: ${WORKSPACE}`);
  console.log(`- Transport: stdio (JSON-RPC 2.0)`);
  console.log(`- Started: ${new Date().toISOString()}`);
  console.log('');

  await client.connect(transport);
  console.log('## Handshake');
  console.log('- `initialize` → OK');
  console.log('- `notifications/initialized` → OK');
  console.log('');

  const { tools } = await client.listTools();
  console.log('## tools/list');
  console.log(`Registered ${tools.length} tools:`);
  for (const t of tools) {
    console.log(`- \`${t.name}\` — ${t.description?.split('\n')[0] ?? '(no description)'}`);
  }
  console.log('');

  console.log('## tools/call probes');
  const results = [];
  for (const probe of PROBES) {
    const start = Date.now();
    try {
      const result = await client.callTool({ name: probe.tool, arguments: probe.args });
      const elapsed = Date.now() - start;
      const text = extractText(result);
      results.push({ ...probe, ok: true, bytes: text.length, ms: elapsed, preview: truncate(text) });
    } catch (err) {
      const elapsed = Date.now() - start;
      results.push({ ...probe, ok: false, error: err.message, ms: elapsed });
    }
  }

  for (const r of results) {
    console.log(`### ${r.tool} — ${r.label}`);
    console.log(`- args: \`${JSON.stringify(r.args)}\``);
    console.log(`- ${r.ok ? `OK (${r.bytes} chars, ${r.ms}ms)` : `FAIL (${r.ms}ms): ${r.error}`}`);
    if (r.ok) {
      console.log('');
      console.log('```');
      console.log(r.preview);
      console.log('```');
    }
    console.log('');
  }

  await client.close();

  const passed = results.filter((r) => r.ok).length;
  console.log('## Summary');
  console.log(`- ${passed}/${results.length} probes passed`);
  console.log(`- Total tools listed: ${tools.length}`);
  console.log(`- Finished: ${new Date().toISOString()}`);

  if (passed !== results.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exitCode = 1;
});
