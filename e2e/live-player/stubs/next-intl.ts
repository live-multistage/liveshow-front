const M:Record<string,string>={noSignal:'SINAL PERDIDO',connecting:'CONECTANDO',backToLive:'backToLive',noActiveCamera:'NOCAM',addCamera:'+',compositionFull:'full',mainStage:'Main',replayUnavailable:'RU'};
export const useTranslations=()=>(k:string)=>M[k]??k;
