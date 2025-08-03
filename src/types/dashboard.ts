export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin';
  status: 'verified' | 'pending' | 'suspended';
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  entry_time: string;
  exit_time?: string;
  duration?: number;
  user_profiles: {
    name: string;
    email: string;
  };
}

export interface DashboardStats {
  totalAdmins: number;
  systemUptime: number;
  todayLogins: number;
  activeUsers: number;
}

export interface AnalyticsData {
  date: string;
  visits: number;
  hours: number;
  revenue: number;
}

export interface SubscriptionBreakdown {
  type: string;
  count: number;
  revenue: number;
  color: string;
}

export interface QRScanResult {
  isValid: boolean;
  timestamp: string;
  userInfo: {
    id: string;
    name: string;
    memberSince: string;
  };
}

export interface RecentScan {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  location: string;
  status: 'success' | 'failed';
  result: 'granted' | 'denied';
}

export interface SystemAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  timestamp: string;
  read: boolean;
}

export type ActiveView = 'overview' | 'analytics' | 'admins' | 'pending-users' | 'admin-management' | 'qr-scanner';