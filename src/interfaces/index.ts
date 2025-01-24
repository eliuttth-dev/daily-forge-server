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
