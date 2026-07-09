export const config = {
  apiUrl: (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, ''),
  appName: 'Liveshow',
} as const;
