export interface UserData {
  id?: number;
  username: string;
  email: string;
  password?: string;
  token?: unknown;
}

export interface UserCreationResponse {
  isSuccess: boolean;
  status: string;
  message: string;
  data?: UserData;
}

export interface ErrorResponse {
  status: "error";
  error: { message: string };
  data: null;
}

export interface SuccessResponse {
  status: "success";
  data: unknown;
  error: null;
}
