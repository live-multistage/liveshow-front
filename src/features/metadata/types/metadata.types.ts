export type MetadataOwnerType =
  | 'USER'
  | 'EVENT'
  | 'TICKET_PRODUCT'
  | 'ORDER'
  | 'PLAYBACK_SESSION'
  | 'FEED'
  | 'CAMERA';

export type MetadataValueType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';

export interface MetadataResponse {
  id: string;
  ownerType: MetadataOwnerType;
  ownerId: string;
  key: string;
  value: string;
  valueType: MetadataValueType;
  createdAt: string;
  updatedAt: string;
}

export interface AddMetadataRequest {
  ownerType: MetadataOwnerType;
  ownerId: string;
  key: string;
  value: string;
  valueType?: MetadataValueType;
}

export interface UpdateMetadataRequest {
  value: string;
  valueType?: MetadataValueType;
}
