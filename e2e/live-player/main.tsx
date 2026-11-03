import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { usePlayerShell } from '@/features/streaming/hooks/use-player-shell';
import { useLiveDvr } from '@/features/streaming/hooks/use-live-dvr';
import { CameraGrid } from '@/features/streaming/components/CameraGrid';
import { LiveBadge } from '@/features/streaming/components/transport/LiveBadge';

// Evidence-only: lets the driver read each SourceBuffer, not just the intersection.
const om=MediaSource.prototype.addSourceBuffer; (window as any).__ms=new Map();
MediaSource.prototype.addSourceBuffer=function(t:string){const sb=om.call(this,t);(this as any).__sbs=[...((this as any).__sbs||[]),{t,sb}];return sb};
const ou=URL.createObjectURL; URL.createObjectURL=function(o:any){const u=ou.call(URL,o);if(o instanceof MediaSource)(window as any).__ms.set(u,o);return u} as any;

function Live({data}:{data:any}){
  const shell=usePlayerShell({cameras:data.cameras,stages:data.stages,primaryCameraId:data.primaryCameraId,librasCameraId:null,streams:data.streams,defaultStreamId:data.defaultStreamId,initialPaused:false,
    onMainCameraChange:()=>endRewind(),onMainDeselected:()=>clearRewindIntent(),onStageChange:()=>resetForStageChange()});
  const {audio,quality}=shell;
  const {dvr,dvrSeeking,seekCommand,atLive,handleProgress,handleSeek,endRewind,resetForStageChange,clearRewindIntent}=useLiveDvr(shell.effectiveMainCameraId);
  (window as any).__h={shell,dvr,dvrSeeking,atLive,handleSeek};
  return <div style={{position:'relative',width:1000,height:600}} ref={shell.containerRef}>
    <div style={{position:'absolute',zIndex:50,left:0,top:0,display:'flex',gap:8}}>
      {shell.stages.map(s=><button key={s.stageId} data-stage={s.stageId} onClick={()=>shell.setActiveStageId(s.stageId)}>{s.name}</button>)}
      <button data-toggle-pause onClick={()=>shell.togglePlay()}>pause</button>
      <span data-badge><LiveBadge atLive={atLive} onBackToLive={()=>dvr&&handleSeek(dvr.edge)}/></span>
    </div>
    <div style={{position:'absolute',inset:'40px 0 0 0'}}>
    {shell.activeStage&&<CameraGrid key={shell.activeStage.stageId} eventId="e" cameras={shell.stageCameras} selectedLevel={quality.currentLevel} onLevelsReady={quality.onLevelsReady}
      globalMuted={audio.globalMuted} onGlobalMutedChange={audio.setGlobalMuted} audioCameraId={audio.effectiveAudioCameraId} audioTrackIndex={audio.effectiveAudioTrackIndex} onAudioCameraChange={audio.handleAudioCameraChange}
      volume={audio.volume} paused={shell.paused} viewMode={shell.effectiveViewMode} onViewModeChange={shell.setViewMode} mainCameraId={shell.effectiveMainCameraId} onMainCameraChange={shell.handleMainCameraChange}
      activeCameraIds={shell.activeCameraIds} librasCameraId={shell.librasInStage} pickerOpen={shell.cameraStripOpen} onToggleCamera={shell.toggleCamera} onClosePicker={()=>shell.setCameraStripOpen(false)} mode="live"
      onAutoplayBlocked={()=>audio.setGlobalMuted(true)} dvrActive={dvrSeeking} seekCommand={seekCommand} onProgress={handleProgress}/>}
    </div></div>;
}
function App(){
  const sc=new URLSearchParams(location.search).get('sc')||'base';
  const [data,setData]=useState<any>(null);
  useEffect(()=>{let on=true;const f=()=>(window as any).__pollOff?0:fetch('/playback.json?sc='+sc).then(r=>r.json()).then(d=>on&&setData(d));f();const i=setInterval(f,Number(new URLSearchParams(location.search).get('poll')||5000));return()=>{on=false;clearInterval(i)}},[sc]);
  return data?<Live data={data}/>:null;
}
createRoot(document.getElementById('root')!).render(<App/>);
