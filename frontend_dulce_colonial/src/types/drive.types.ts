export interface DriveStatus {
  connected: boolean;
  email?: string | null;
  accessTokenExpiresAt?: string | null;
  accessTokenExpiresInSeconds?: number | null;
  hasRefreshToken: boolean;
  refreshTokenIssuedAt?: string | null;
  refreshTokenExpiresAt?: string | null;
  refreshTokenExpiresInSeconds?: number | null;
  refreshTokenStatus:
    | 'ACTIVE'
    | 'MISSING'
    | 'EXPIRES_AT_KNOWN'
    | 'UNKNOWN_EXPIRATION';
  requiresReauth: boolean;
  folderConfigured: boolean;
  folderWarning?: string | null;
}

export interface DriveAuthUrl {
  url: string;
}
