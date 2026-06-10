import { describe, expect, it } from 'vitest';

import { esc, jsonForScript } from '../lib/present/esc.js';

describe('esc', () => {
  it('escapes the four HTML metacharacters', () => {
    expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});

describe('jsonForScript — inline <script> embedding safety', () => {
  it('neutralizes </script> breakout attempts from untrusted strings', () => {
    const payload = { summary: 'hi </script><script>alert(1)</script>' };
    const out = jsonForScript(payload);
    expect(out).not.toContain('</script>');
    expect(out).not.toContain('<script>');
    expect(out).toContain('\\u003c');
    // Round-trips losslessly — the escape is purely syntactic.
    expect(JSON.parse(out)).toEqual(payload);
  });

  it('escapes line/paragraph separators that break older parsers', () => {
    const out = jsonForScript({ s: 'a\u2028b\u2029c' });
    expect(out).toContain('\\u2028');
    expect(out).toContain('\\u2029');
    expect(JSON.parse(out)).toEqual({ s: 'a\u2028b\u2029c' });
  });
});
