/**
 * Global ambient module: forces TanStack Start's module augmentation
 * of `FilebaseRouteOptionsInterface` (adds the `server` property) to load
 * across the entire project. The TanStack Router Vite plugin automatically
 * inserts `createFileRoute` from `@tanstack/react-router` into route files,
 * so we cannot route imports through a barrel — we need ambient augmentation.
 */
import type {} from "@tanstack/start-client-core";
