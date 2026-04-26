export type GroupType = "trip" | "flatmate" | "project" | "event" | "wedding" | "office" | "family" | "custom";
export type MemberRole = "owner" | "admin" | "member";
export type SplitType = "equal" | "exact" | "percentage";
export type SettlementStatus = "pending" | "completed" | "cancelled";
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export type ExpenseCategory = "general" | "food" | "transport" | "accommodation" | "entertainment" | "utilities" | "groceries" | "health" | "shopping" | "other";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  currency: string;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  type: GroupType;
  invite_code: string;
  owner_id: string;
  currency: string;
  image_url: string | null;
  is_active: boolean;
  member_count: number;
  total_expenses: number;
  my_balance: number;
  created_at: string;
}

export interface GroupMember {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  role: MemberRole;
  joined_at: string;
}

export interface GroupDetail extends Group {
  members: GroupMember[];
}

export interface ExpenseSplit {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  amount: number;
  percentage: number | null;
  is_settled: boolean;
  settled_at: string | null;
}

export interface Expense {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  paid_by: string;
  paid_by_name: string | null;
  paid_by_avatar: string | null;
  split_type: SplitType;
  category: ExpenseCategory;
  date: string;
  notes: string | null;
  receipt_url: string | null;
  splits: ExpenseSplit[];
  created_at: string;
}

export interface Settlement {
  id: string;
  group_id: string;
  payer_id: string;
  payer_name: string | null;
  payer_avatar: string | null;
  payee_id: string;
  payee_name: string | null;
  payee_avatar: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  status: SettlementStatus;
  proof_url: string | null;
  settled_at: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  group_id: string;
  expense_id: string | null;
  expense_title: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  assigned_to_avatar: string | null;
  created_by: string;
  created_by_name: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  is_overdue: boolean;
  created_at: string;
  updated_at: string;
}

export interface DebtSummary {
  from_user_id: string;
  from_user_name: string | null;
  from_user_avatar: string | null;
  to_user_id: string;
  to_user_name: string | null;
  to_user_avatar: string | null;
  amount: number;
  currency: string;
}

export interface GroupBalance {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  net_balance: number;
  owes: DebtSummary[];
  owed_by: DebtSummary[];
}

export interface DashboardData {
  total_owed: number;
  total_owe: number;
  net_balance: number;
  active_groups: number;
  pending_tasks: number;
  unread_notifications: number;
  monthly_spend: { month: string; total: number; my_share: number }[];
  recent_activity: {
    type: string;
    title: string;
    subtitle: string;
    amount: number | null;
    created_at: string;
    group_id: string | null;
    group_name: string | null;
  }[];
  top_groups: Group[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user_id: string;
}
