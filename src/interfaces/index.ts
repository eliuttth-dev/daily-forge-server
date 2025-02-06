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

export interface HabitCreationResponse {
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
    username: string;
    email: string;
    token?: string;
  };
}
