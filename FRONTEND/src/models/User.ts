export interface UserDTO {
  id?: string;
  name?: string;
  email: string;
  avatarUrl?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
