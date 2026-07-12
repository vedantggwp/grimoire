---
title: "Delta Queues"
summary: "Delta queues schedule background jobs with capped retry backoff."
tags: [delta, queues, retries]
updated: 2026-07-12
confidence: P1
---

# Delta Queues

## Overview

Delta queues group background jobs by priority and apply capped retry backoff after transient failures.
