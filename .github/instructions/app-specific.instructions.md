---
applyTo: "src/**"
description: "This document contains instructions that must be followed for this project."
---

## Rules:

* Use sveltekit remote functions instead of API routes. Always use the `command` function type, not `form` remote functions.

## Design style

* use the default shadcn components and dark theme styling. To add a component, use `bun x shadcn-svelte@latest add <component-name>`