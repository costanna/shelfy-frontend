export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export type Language = 'en' | 'ca' | 'es';

export interface User {
  id: number;
  email: string;
  name: string;
  alias: string | null;
  themePreference: ThemePreference;
  languagePreference: Language;
  avatarUpdatedAt: string | null;
  remindersEnabled: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name: string;
}

export interface MessageResponse {
  message: string;
}
