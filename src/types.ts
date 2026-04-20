export type DriveStatus = 'offsite' | 'onsite' | 'pending';

export interface ActionLog {
  id: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
  transporterName: string;
  signature: string; // Base64 signature
  notes?: string;
}

export interface Issue {
  id: string;
  timestamp: string;
  reporter: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DriveRecord {
  id: string;
  month: string; // "2026-04"
  status: DriveStatus;
  checkIn?: ActionLog;
  checkOut?: ActionLog;
  issues: Issue[];
}

export interface AppConfig {
  today: string;
  lastFriday: string;
  isReminderDay: boolean;
}
