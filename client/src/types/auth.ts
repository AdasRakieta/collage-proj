export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  isActive?: boolean;
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface RegisterRequest {
  token: string;
  username: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface Invitation {
  id: number;
  email: string;
  expiresAt: string;
  createdAt: string;
  invitedByUsername?: string;
}
