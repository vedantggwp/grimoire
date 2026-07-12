---
title: "Aurora Cache Strategy"
summary: "Aurora cache invalidation uses versioned keys and short TTLs to keep generated pages fresh."
tags: [aurora, cache, invalidation]
updated: 2026-07-12
confidence: P0
---

# Aurora Cache Strategy

## Overview

Aurora cache invalidation relies on versioned keys, short TTLs, and a publish event that clears stale generated pages.

## Runbook

When an editor publishes content, the service increments the aurora version key and refreshes cached page fragments.
