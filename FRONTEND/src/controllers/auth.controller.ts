import type { LoginPayload, UserDTO } from '../models/User';
import { postJson, getJson } from '../services/api';

export async function login(payload: LoginPayload): Promise<{ user: UserDTO; token: string }> {
  // placeholder implementation - expects API endpoint POST /api/auth/login
  const res = await postJson('/api/auth/login', payload);
  // res should contain { user, token }
  return res;
}

export async function register(payload: { name: string; email: string; password: string }): Promise<{ user: UserDTO; token: string }>{
  // expects POST /api/auth/register
  const res = await postJson('/api/auth/register', payload);
  return res;
}

export async function me(token: string): Promise<UserDTO> {
  // Validar token con el backend - GET /api/auth/me
  const res = await getJson('/api/auth/me', token);
  return res;
}
