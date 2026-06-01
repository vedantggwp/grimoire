# Security Policy

## Supported Versions

Grimoire is pre-1.0 software. Security fixes target the `main` branch and the latest public release.

## Reporting a Vulnerability

Please do not open a public issue for vulnerabilities, credential leaks, unsafe file access, or MCP behavior that could expose private workspace content.

Report privately by opening a GitHub security advisory for this repository if available, or contact the maintainer through the email on the GitHub profile.

Useful reports include:

- affected command or MCP tool;
- reproduction steps using a minimal local workspace;
- expected and observed behavior;
- whether private files, network access, or generated site output are involved.

## Security Boundaries

Grimoire is designed to operate on local workspaces and generated knowledge-base artifacts. It should not require secrets for the compile, present, or serve stages. Do not place API keys, private source text, or proprietary documents in issues, examples, screenshots, or PR fixtures.
