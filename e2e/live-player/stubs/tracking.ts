const a={track(n:string,p:unknown){console.warn('[analytics]',n,JSON.stringify(p))}};export const useAnalytics=()=>a;
