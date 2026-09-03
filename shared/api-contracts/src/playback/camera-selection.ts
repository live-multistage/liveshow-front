/**
 * Qual câmera é a principal e quais estão decodificando.
 *
 * Redutor puro porque o limite é físico, não estético: o mobile aguenta 4
 * decodificadores simultâneos e a janela de Libras (NBR 15290) ocupa um deles
 * sem nunca poder sair nem virar principal. Deixar essa aritmética dentro de um
 * componente é como ela se perde na primeira refatoração de layout.
 */
export interface SelectableCamera {
  cameraId: string;
  priority: number;
  /** Tem manifest/replay agora. Uma câmera anunciada mas sem path não decodifica. */
  playable: boolean;
}

export interface CameraSelectionState {
  activeCameraIds: string[];
  mainCameraId: string | null;
  librasCameraId: string | null;
  cap: number;
}

export type CameraSelectionAction =
  | {
      type: 'INIT';
      cameras: SelectableCamera[];
      primaryCameraId: string | null;
      librasCameraId: string | null;
      cap: number;
    }
  | { type: 'SET_MAIN'; cameraId: string }
  | { type: 'SYNC'; cameras: SelectableCamera[] };

export const INITIAL_CAMERA_SELECTION: CameraSelectionState = {
  activeCameraIds: [],
  mainCameraId: null,
  librasCameraId: null,
  cap: 4,
};

function order(cameras: SelectableCamera[], primaryCameraId: string | null): SelectableCamera[] {
  return [...cameras]
    .filter((c) => c.playable)
    .sort((a, b) => {
      if (a.cameraId === primaryCameraId) return -1;
      if (b.cameraId === primaryCameraId) return 1;
      return a.priority - b.priority;
    });
}

// Libras entra sempre e conta no teto; o resto preenche o que sobrar.
function fill(
  cameras: SelectableCamera[],
  primaryCameraId: string | null,
  librasCameraId: string | null,
  cap: number,
): string[] {
  const ordered = order(cameras, primaryCameraId);
  const libras = ordered.find((c) => c.cameraId === librasCameraId) ?? null;
  const rest = ordered.filter((c) => c.cameraId !== librasCameraId);
  const room = libras ? cap - 1 : cap;
  const active = rest.slice(0, Math.max(0, room)).map((c) => c.cameraId);
  return libras ? [...active, libras.cameraId] : active;
}

export function cameraSelectionReducer(
  state: CameraSelectionState,
  action: CameraSelectionAction,
): CameraSelectionState {
  switch (action.type) {
    case 'INIT': {
      const activeCameraIds = fill(action.cameras, action.primaryCameraId, action.librasCameraId, action.cap);
      const main = activeCameraIds.find((id) => id !== action.librasCameraId) ?? null;
      return {
        activeCameraIds,
        mainCameraId:
          action.primaryCameraId && activeCameraIds.includes(action.primaryCameraId) && action.primaryCameraId !== action.librasCameraId
            ? action.primaryCameraId
            : main,
        librasCameraId: action.librasCameraId,
        cap: action.cap,
      };
    }
    case 'SET_MAIN': {
      // A janela de Libras nunca vira principal: ela é obrigatória no PiP.
      if (action.cameraId === state.librasCameraId) return state;
      if (!state.activeCameraIds.includes(action.cameraId)) return state;
      return { ...state, mainCameraId: action.cameraId };
    }
    case 'SYNC': {
      const alive = new Set(action.cameras.filter((c) => c.playable).map((c) => c.cameraId));
      const kept = state.activeCameraIds.filter((id) => alive.has(id));
      const candidates = action.cameras.filter((c) => c.playable && !kept.includes(c.cameraId));
      const refilled = fill(
        [
          ...kept.map((id) => action.cameras.find((c) => c.cameraId === id)!),
          ...candidates,
        ],
        kept[0] ?? null,
        state.librasCameraId,
        state.cap,
      );
      return {
        ...state,
        activeCameraIds: refilled,
        mainCameraId: state.mainCameraId && refilled.includes(state.mainCameraId) ? state.mainCameraId : null,
      };
    }
    default:
      return state;
  }
}

// A escolha do espectador só vale enquanto ela ainda está no ar; senão promove
// a próxima — silenciar aqui deixaria o palco preto sem ninguém perceber.
export function effectiveMainCameraId(state: CameraSelectionState): string | null {
  const eligible = state.activeCameraIds.filter((id) => id !== state.librasCameraId);
  if (state.mainCameraId && eligible.includes(state.mainCameraId)) return state.mainCameraId;
  return eligible[0] ?? null;
}
