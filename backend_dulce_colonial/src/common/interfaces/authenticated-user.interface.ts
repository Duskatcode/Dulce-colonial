export interface AuthenticatedUser {
  id: number;
  name: string;
  role: string;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}
