export interface DriveStatus {
  connected: boolean;
  email?: string;
  expiresAt?: string;
}

export interface DriveAuthUrl {
  url: string;
}
