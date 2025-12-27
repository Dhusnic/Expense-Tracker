import { TransactionFormData, TransactionType } from './expense-tracker.models';

export interface ExpenseListItem extends TransactionFormData {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    status: 'PAID' | 'PENDING' | 'OVERDUE' | 'RECURRING';
    isReconciled: boolean;
    isFavorite: boolean;
}

// export type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom';

// export interface FilterOptions {
//     dateRange: {
//         startDate: Date | null;
//         endDate: Date | null;
//         preset?: DatePreset;
//     };
//     transactionTypes: TransactionType[];
//     categoryIds: string[];
//     accountIds: string[];
//     paymentMethods: string[];
//     amountRange: {
//         min: number | null;
//         max: number | null;
//     };
//     tags: string[];
//     status: string[];
//     searchQuery: string;
// }


/**
 * Recurrence Frequency Enum
 */
export enum RecurrenceFrequency {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}



// Add this type definition
export type DatePreset = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom';

export interface ExpenseListItem extends TransactionFormData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'PAID' | 'PENDING' | 'OVERDUE' | 'RECURRING';
  isReconciled: boolean;
  isFavorite: boolean;
}

export interface FilterOptions {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
    preset?: DatePreset;  // Use the type here
  };
  transactionTypes: TransactionType[];
  categoryIds: string[];
  accountIds: string[];
  paymentMethods: string[];
  amountRange: {
    min: number | null;
    max: number | null;
  };
  tags: string[];
  status: string[];
  searchQuery: string;
}

// ... rest of your interfaces



export interface SortOptions {
    field: 'date' | 'amount' | 'description' | 'category' | 'type';
    direction: 'asc' | 'desc';
}

export interface GroupByOption {
    value: 'none' | 'date' | 'month' | 'category' | 'account' | 'type';
    label: string;
}

export interface ViewMode {
    value: 'table' | 'card' | 'compact' | 'timeline';
    label: string;
    icon: string;
}

export interface PaginationConfig {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

export interface ExpenseListResponse {
    transactions: ExpenseListItem[];
    pagination: PaginationConfig;
    summary: {
        totalIncome: number;
        totalExpense: number;
        netBalance: number;
        pendingAmount: number;
        recurringAmount: number;
    };
}

export interface BulkAction {
    type: 'delete' | 'export' | 'markPaid' | 'markUnpaid' | 'categorize';
    label: string;
    icon: string;
    confirmRequired: boolean;
}
