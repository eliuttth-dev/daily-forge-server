export interface UserData {
  username: string;
  email: string;
  password?: string;
}

export interface UserCreationResponse {
  isSuccess: boolean;
  status: string;
  message: string;
  data?: UserData;
}

