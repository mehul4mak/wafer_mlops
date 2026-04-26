export type GroupType = "trip" | "flatmate" | "project" | "event" | "wedding" | "office" | "family" | "custom";
export type SplitType = "equal" | "exact" | "percentage";
export type SettlementStatus = "pending" | "completed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  invite_code: string;
  currency: string;
  member_count: number;
  my_balance: number;
  description: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: string;
  paid_by: string;
  paid_by_name: string | null;
  split_type: SplitType;
  category: string;
  date: string;
  created_at: string;
}

export interface Settlement {
  id: string;
  payer_name: string | null;
  payee_name: string | null;
  amount: number;
  currency: string;
  status: SettlementStatus;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to_name: string | null;
  due_date: string | null;
  is_overdue: boolean;
}

export interface DashboardData {
  total_owed: number;
  total_owe: number;
  net_balance: number;
  active_groups: number;
  pending_tasks: number;
  unread_notifications: number;
  monthly_spend: { month: string; total: number; my_share: number }[];
  recent_activity: { type: string; title: string; amount: number | null; created_at: string }[];
}
