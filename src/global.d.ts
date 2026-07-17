// Ambient declarations for global (side-effect) stylesheet imports, e.g.
// `import '@/styles/globals.scss'`. CSS Modules (`*.module.scss`) keep their
// generated typing — the longer-suffix pattern wins over these catch-alls.
declare module '*.css' {}
declare module '*.scss' {}
declare module '*.sass' {}
