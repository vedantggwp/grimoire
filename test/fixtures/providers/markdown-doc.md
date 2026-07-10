# Agent SDK Overview

## Core concepts

The Agent SDK gives an application a structured loop for planning, tool use, and
final response generation. This fixture is deliberately long enough to pass the
provider's markdown acceptance gate. It contains headings, paragraphs, and enough
body text to look like a real documentation capture rather than a small search
snippet or synthetic summary.

## Runtime behavior

The runtime keeps model state, tool results, and session metadata separate so a
caller can audit what happened during a run. Each step is represented as a
message-like event. Tool calls include names, arguments, results, and errors.
Those events can be replayed for debugging, logged for observability, or used to
resume a partially complete session.

## Integration notes

Applications normally create an agent, register tools, pass in user context, and
then let the loop continue until a final answer is available. The important
property for this fixture is that the text is plain markdown. A verbatim route
can preserve it exactly, while an HTML extractor should never be credited with
the same fidelity tier.

