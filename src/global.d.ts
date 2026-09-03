// Ambient declarations for global (side-effect) stylesheet imports, e.g.
// `import '@/styles/globals.scss'`. CSS Modules (`*.module.scss`) keep their
// generated typing — the longer-suffix pattern wins over these catch-alls.
declare module '*.css' {}
declare module '*.scss' {}
declare module '*.sass' {}

// @types/react is pinned to 18.3.x (matches our installed React 18 runtime),
// which doesn't type `cache` — it's a React 19 API. Next.js's App Router
// still provides a working `cache` from 'react' at runtime for RSC/server
// files (it vendors its own React build for the server condition), so this
// just fills the type gap rather than the runtime gap. `import 'react'`
// first so this is a module *augmentation* (merges with the real types)
// instead of a full ambient module declaration that would shadow them.
import 'react';

declare module 'react' {
  export function cache<T extends (...args: never[]) => unknown>(fn: T): T;
}
