export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE',
    TRANSFER = 'TRANSFER',
    DEBT_GIVEN = 'DEBT_GIVEN',
    DEBT_RECEIVED = 'DEBT_RECEIVED',
    DEBT_REPAYMENT = 'DEBT_REPAYMENT',
    DEBT_COLLECTION = 'DEBT_COLLECTION'
}

export enum PaymentMethod {
    CASH = 'CASH',
    UPI = 'UPI',
    CREDIT_CARD = 'CREDIT_CARD',
    DEBIT_CARD = 'DEBIT_CARD',
    NET_BANKING = 'NET_BANKING',
    BANK_TRANSFER = 'BANK_TRANSFER',
    WALLET = 'WALLET',
    CHEQUE = 'CHEQUE',
    OTHER = 'OTHER'
}

export enum RecurrenceFrequency {
    NONE = 'NONE',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
    YEARLY = 'YEARLY'
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: TransactionType;
    parentId?: string;
    subcategories?: Category[];
}

export interface Account {
    id: string;
    name: string;
    type: 'BANK' | 'CREDIT_CARD' | 'CASH' | 'WALLET' | 'INVESTMENT';
    accountNumber?: string;
    bankName?: string;
    balance: number;
    currency: string;
    icon: string;
    isActive: boolean;
}

export interface UpiProvider {
    id: string;
    name: string;
    icon: string;
    upiId?: string;
}

export interface Contact {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    upiId?: string;
}

export interface Attachment {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    uploadedAt: Date;
}

export interface SplitTransaction {
    contactId: string;
    amount: number;
    percentage?: number;
    settled: boolean;
}

export interface RecurringConfig {
    frequency: RecurrenceFrequency;
    startDate: Date;
    endDate?: Date;
    occurrences?: number;
    nextOccurrence?: Date;
}

export interface TransactionFormData {
    transactionId?: string;
    // Step 1: Transaction Type
    transactionType: TransactionType;

    // Step 2: Basic Info
    amount: number;
    currency: string;
    transactionDate: Date;
    categoryId: string;
    subcategoryId?: string;
    description: string;
    notes?: string;
    tags?: string[];

    // Step 3: Payment Details
    paymentMethod: PaymentMethod;
    fromAccountId?: string;
    toAccountId?: string;
    upiProviderId?: string;
    upiTransactionId?: string;
    cardLastFourDigits?: string;
    chequeNumber?: string;
    referenceNumber?: string;

    // Debt specific
    contactId?: string;
    dueDate?: Date;
    isPaid?: boolean;

    // Advanced Features
    isRecurring: boolean;
    recurringConfig?: RecurringConfig;
    isTaxDeductible: boolean;
    taxCategory?: string;
    location?: {
        latitude: number;
        longitude: number;
        address: string;
    };
    attachments?: Attachment[];
    splitTransactions?: SplitTransaction[];

    // Transfer specific
    transferFee?: number;
    createLinkedTransactions?: boolean;

    // Metadata
    createdAt?: Date;
    updatedAt?: Date;
    createdBy?: string;
    is_duplicated ?: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: string[];
}

export interface FilterOptions {
    dateRange: {
        startDate: Date | null;
        endDate: Date | null;
        preset?: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom';
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
