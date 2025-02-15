interface ScheduleData {
  type: string;
  timesPerDay: number;
}

export interface UserData {
  username: string;
  email: string;
  password?: string;
}

export interface HabitData {
  ID?: number;
  userID: string;
  name: string;
  description?: string;
  schedule?: ScheduleData;
  category: string;
  reminders?: string[];
  streakTracking: boolean;
  autoComplete: boolean;
}

export interface UserCreationResponse {
  isSuccess: boolean;
  status: string;
  message: string;
  data?: UserData;
}

export interface HabitResponse {
  isSuccess: boolean;
  status: string;
  message: string;
  habit?: HabitData;
}

export interface UserLoginData {
  identifier: string; // username or email
  password: string;
}

export interface UserLoginResponse {
  isSuccess: boolean;
  status: string;
  message: string;
  data?: {
    id: number;
    username: string;
    email: string;
    token?: string;
  };
}

export interface ErrorResponse {
  status: "error";
  error: { message: string };
  data: null;
}

export interface SuccessResponse {
  status: "success";
  data?: unknown;
  error: null;
}

export interface HabitHistory {
  id?: number;
  habitId: number;
  userId: number;
  action: "COMPLETED" | "UNDONE";
  timestamp?: Date;
}
