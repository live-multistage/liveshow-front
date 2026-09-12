export interface ViewerJoinRequest {
  sessionId: string;
  cameraId: string;
  visitId: string;
}

export interface ViewerSessionRequest {
  sessionId: string;
}

export interface ViewerCountResponse {
  currentViewers: number;
  totalViews: number;
}
