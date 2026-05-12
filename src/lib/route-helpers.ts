/**
 * Re-exports `createFileRoute` and forces TanStack Start's module augmentation
 * (`server` property on routes) to load via the `import type {}` side-effect.
 * Use this everywhere instead of importing directly from `@tanstack/react-router`
 * when you need to define a `server.handlers` block.
 */
export { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/start-client-core";
