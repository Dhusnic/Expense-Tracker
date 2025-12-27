import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, delay, tap } from 'rxjs/operators';
import {
    ExpenseListItem,
    ExpenseListResponse,
    FilterOptions,
    SortOptions,
    PaginationConfig,
    RecurrenceFrequency
} from '../models/expense-list.models';
import { TransactionType, PaymentMethod } from '../models/expense-tracker.models';

@Injectable({
    providedIn: 'root'
})
export class ExpenseListService {
    private readonly API_BASE_URL = '/api/expense-tracker';

    // Signals for state management
    transactions = signal<ExpenseListItem[]>([]);
    loading = signal<boolean>(false);
    selectedTransactions = signal<Set<string>>(new Set());

    // BehaviorSubjects for compatibility
    private transactionsSubject = new BehaviorSubject<ExpenseListItem[]>([]);
    transactions$ = this.transactionsSubject.asObservable();

    constructor(private http: HttpClient) {
        this.loadMockData();
    }

    /**
     * Get transactions with filters, sorting, and pagination
     */
    getTransactions(
        filters: Partial<FilterOptions>,
        sort: SortOptions,
        pagination: PaginationConfig
    ): Observable<ExpenseListResponse> {
        const params = this.buildQueryParams(filters, sort, pagination);

        // TODO: Replace with actual API call
        // return this.http.get<ExpenseListResponse>(
        //   `${this.API_BASE_URL}/transactions`,
        //   { params }
        // );

        // Mock implementation
        return this.getMockTransactions(filters, sort, pagination);
    }

    /**
     * Get transaction by ID
     */
    getTransactionById(id: string): Observable<ExpenseListItem> {
        // TODO: Replace with actual API call
        // return this.http.get<ExpenseListItem>(`${this.API_BASE_URL}/transactions/${id}`);

        const transaction = this.getMockData().find(t => t.id === id);
        return of(transaction!).pipe(delay(300));
    }

    /**
     * Delete transaction
     */
    deleteTransaction(id: string): Observable<any> {
        // TODO: Replace with actual API call
        // return this.http.delete(`${this.API_BASE_URL}/transactions/${id}`);

        return of({ success: true, message: 'Transaction deleted successfully' }).pipe(delay(500));
    }

    /**
     * Bulk delete transactions
     */
    bulkDeleteTransactions(ids: string[]): Observable<any> {
        // TODO: Replace with actual API call
        // return this.http.post(`${this.API_BASE_URL}/transactions/bulk-delete`, { ids });

        return of({ success: true, message: `${ids.length} transactions deleted successfully` }).pipe(delay(1000));
    }

    /**
     * Export transactions
     */
    exportTransactions(format: 'csv' | 'excel' | 'pdf', ids?: string[]): Observable<Blob> {
        const params = new HttpParams().set('format', format);

        // TODO: Replace with actual API call
        // return this.http.post(`${this.API_BASE_URL}/transactions/export`, { ids }, {
        //   params,
        //   responseType: 'blob'
        // });

        // Mock implementation
        const mockData = 'Mock export data';
        const blob = new Blob([mockData], { type: 'text/plain' });
        return of(blob).pipe(delay(1500));
    }

    /**
     * Toggle favorite
     */
    toggleFavorite(id: string): Observable<any> {
        // TODO: Replace with actual API call
        return of({ success: true }).pipe(delay(300));
    }

    /**
     * Build query params
     */
    private buildQueryParams(
        filters: Partial<FilterOptions>,
        sort: SortOptions,
        pagination: PaginationConfig
    ): HttpParams {
        let params = new HttpParams()
            .set('page', pagination.currentPage.toString())
            .set('pageSize', pagination.pageSize.toString())
            .set('sortField', sort.field)
            .set('sortDirection', sort.direction);

        if (filters.searchQuery) {
            params = params.set('search', filters.searchQuery);
        }

        if (filters.dateRange?.startDate) {
            params = params.set('startDate', filters.dateRange.startDate.toISOString());
        }

        if (filters.dateRange?.endDate) {
            params = params.set('endDate', filters.dateRange.endDate.toISOString());
        }

        if (filters.transactionTypes?.length) {
            params = params.set('types', filters.transactionTypes.join(','));
        }

        if (filters.categoryIds?.length) {
            params = params.set('categories', filters.categoryIds.join(','));
        }

        if (filters.accountIds?.length) {
            params = params.set('accounts', filters.accountIds.join(','));
        }

        if (filters.amountRange?.min !== null && filters.amountRange?.min !== undefined) {
            params = params.set('minAmount', filters.amountRange.min.toString());
        }

        if (filters.amountRange?.max !== null && filters.amountRange?.max !== undefined) {
            params = params.set('maxAmount', filters.amountRange.max.toString());
        }

        return params;
    }

    /**
     * Mock data generation
     */
    private getMockTransactions(
        filters: Partial<FilterOptions>,
        sort: SortOptions,
        pagination: PaginationConfig
    ): Observable<ExpenseListResponse> {
        let data = this.getMockData();

        // Apply filters
        data = this.applyFilters(data, filters);

        // Apply sorting
        data = this.applySorting(data, sort);

        // Calculate summary
        const summary = this.calculateSummary(data);

        // Apply pagination
        const start = pagination.currentPage * pagination.pageSize;
        const end = start + pagination.pageSize;
        const paginatedData = data.slice(start, end);

        const response: ExpenseListResponse = {
            transactions: paginatedData,
            pagination: {
                ...pagination,
                totalItems: data.length,
                totalPages: Math.ceil(data.length / pagination.pageSize)
            },
            summary
        };

        return of(response).pipe(delay(800));
    }

    /**
     * Apply filters to data
     */
    private applyFilters(data: ExpenseListItem[], filters: Partial<FilterOptions>): ExpenseListItem[] {
        let filtered = [...data];

        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(query) ||
                t.notes?.toLowerCase().includes(query)
            );
        }

        if (filters.transactionTypes?.length) {
            filtered = filtered.filter(t => filters.transactionTypes!.includes(t.transactionType));
        }

        if (filters.categoryIds?.length) {
            filtered = filtered.filter(t => filters.categoryIds!.includes(t.categoryId));
        }

        if (filters.accountIds?.length) {
            filtered = filtered.filter(t =>
                filters.accountIds!.includes(t.fromAccountId!) ||
                filters.accountIds!.includes(t.toAccountId!)
            );
        }

        if (filters.status?.length) {
            filtered = filtered.filter(t => filters.status!.includes(t.status));
        }

        if (filters.dateRange?.startDate) {
            filtered = filtered.filter(t => t.transactionDate >= filters.dateRange!.startDate!);
        }

        if (filters.dateRange?.endDate) {
            filtered = filtered.filter(t => t.transactionDate <= filters.dateRange!.endDate!);
        }

        if (filters.amountRange?.min !== null && filters.amountRange?.min !== undefined) {
            filtered = filtered.filter(t => t.amount >= filters.amountRange!.min!);
        }

        if (filters.amountRange?.max !== null && filters.amountRange?.max !== undefined) {
            filtered = filtered.filter(t => t.amount <= filters.amountRange!.max!);
        }

        if (filters.tags?.length) {
            filtered = filtered.filter(t =>
                t.tags?.some(tag => filters.tags!.includes(tag))
            );
        }

        return filtered;
    }

    /**
     * Apply sorting to data
     */
    private applySorting(data: ExpenseListItem[], sort: SortOptions): ExpenseListItem[] {
        return data.sort((a, b) => {
            let aVal: any, bVal: any;

            switch (sort.field) {
                case 'date':
                    aVal = a.transactionDate.getTime();
                    bVal = b.transactionDate.getTime();
                    break;
                case 'amount':
                    aVal = a.amount;
                    bVal = b.amount;
                    break;
                case 'description':
                    aVal = a.description.toLowerCase();
                    bVal = b.description.toLowerCase();
                    break;
                case 'category':
                    aVal = a.categoryId;
                    bVal = b.categoryId;
                    break;
                case 'type':
                    aVal = a.transactionType;
                    bVal = b.transactionType;
                    break;
                default:
                    return 0;
            }

            if (sort.direction === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
        });
    }

    /**
     * Calculate summary
     */
    private calculateSummary(data: ExpenseListItem[]) {
        const totalIncome = data
            .filter(t => t.transactionType === TransactionType.INCOME)
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = data
            .filter(t => t.transactionType === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);

        const pendingAmount = data
            .filter(t => t.status === 'PENDING')
            .reduce((sum, t) => sum + t.amount, 0);

        const recurringAmount = data
            .filter(t => t.isRecurring)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
            pendingAmount,
            recurringAmount
        };
    }

    /**
     * Load mock data
     */
    private loadMockData(): void {
        const mockData = this.getMockData();
        this.transactions.set(mockData);
        this.transactionsSubject.next(mockData);
    }

    /**
     * Get mock data (DUMMY DATA)
     */
    // private getMockData(): ExpenseListItem[] {
    //     const now = new Date();
    //     return [
    //         {
    //             id: 'txn-001',
    //             transactionType: TransactionType.INCOME,
    //             amount: 75000,
    //             currency: 'INR',
    //             transactionDate: new Date(now.getFullYear(), now.getMonth(), 1),
    //             categoryId: 'inc-1',
    //             description: 'Monthly Salary - December 2025',
    //             notes: 'Regular monthly salary payment',
    //             tags: ['salary', 'income', 'monthly'],
    //             paymentMethod: PaymentMethod.BANK_TRANSFER,
    //             toAccountId: 'acc-1',
    //             referenceNumber: 'SAL-DEC-2025',
    //             isRecurring: true,
    //             isTaxDeductible: false,
    //             status: 'PAID',
    //             isReconciled: true,
    //             isFavorite: false,
    //             createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
    //             updatedAt: new Date(now.getFullYear(), now.getMonth(), 1)
    //         },
    //         {
    //             id: 'txn-002',
    //             transactionType: TransactionType.EXPENSE,
    //             amount: 1250,
    //             currency: 'INR',
    //             transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
    //             categoryId: 'exp-1',
    //             subcategoryId: 'exp-1-1',
    //             description: 'Weekly Grocery Shopping',
    //             notes: 'Big Basket order - fruits, vegetables, and essentials',
    //             tags: ['groceries', 'food', 'essential'],
    //             paymentMethod: PaymentMethod.UPI,
    //             fromAccountId: 'acc-1',
    //             upiProviderId: 'upi-1',
    //             upiTransactionId: 'UPI123456789',
    //             isRecurring: false,
    //             isTaxDeductible: false,
    //             status: 'PAID',
    //             isReconciled: true,
    //             isFavorite: false,
    //             attachments: [{
    //                 id: 'att-001',
    //                 fileName: 'grocery_bill.pdf',
    //                 fileType: 'application/pdf',
    //                 fileSize: 245000,
    //                 fileUrl: '/uploads/grocery_bill.pdf',
    //                 uploadedAt: new Date()
    //             }],
    //             createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
    //             updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
    //         },
    //         {
    //             id: 'txn-003',
    //             transactionType: TransactionType.EXPENSE,
    //             amount: 450,
    //             currency: 'INR',
    //             transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    //             categoryId: 'exp-2',
    //             subcategoryId: 'exp-2-1',
    //             description: 'Petrol Fill-up',
    //             notes: 'Indian Oil petrol pump',
    //             tags: ['fuel', 'transport', 'vehicle'],
    //             paymentMethod: PaymentMethod.CREDIT_CARD,
    //             fromAccountId: 'acc-3',
    //             cardLastFourDigits: '9012',
    //             isRecurring: false,
    //             isTaxDeductible: true,
    //             taxCategory: 'BUSINESS',
    //             status: 'PAID',
    //             isReconciled: false,
    //             isFavorite: false,
    //             createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
    //             updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    //         },
    //         // Continue with more dummy data...
    //         // (I'll add 47 more transactions to make it realistic)
    //     ];
    // }

    /**
 * Get mock data (50 REALISTIC DUMMY TRANSACTIONS)
 */
    private getMockData(): ExpenseListItem[] {
        const now = new Date();

        return [
            // Transaction 1 - Salary
            {
                id: 'txn-001',
                transactionType: TransactionType.INCOME,
                amount: 75000,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 1),
                categoryId: 'inc-1',
                description: 'Monthly Salary - December 2025',
                notes: 'Regular monthly salary payment from employer',
                tags: ['salary', 'income', 'monthly'],
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                toAccountId: 'acc-1',
                referenceNumber: 'SAL-DEC-2025',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 0, 1),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: true,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 1)
            },

            // Transaction 2 - Grocery Shopping
            {
                id: 'txn-002',
                transactionType: TransactionType.EXPENSE,
                amount: 2450,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                categoryId: 'exp-1',
                subcategoryId: 'exp-1-1',
                description: 'Weekly Grocery Shopping - Big Basket',
                notes: 'Groceries including vegetables, fruits, dairy products, and household essentials',
                tags: ['groceries', 'food', 'essential', 'bigbasket'],
                paymentMethod: PaymentMethod.UPI,
                fromAccountId: 'acc-1',
                upiProviderId: 'upi-1',
                upiTransactionId: 'UPI458796321478',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                attachments: [{
                    id: 'att-001',
                    fileName: 'grocery_receipt.pdf',
                    fileType: 'application/pdf',
                    fileSize: 245000,
                    fileUrl: '/uploads/grocery_receipt.pdf',
                    uploadedAt: new Date()
                }],
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            },

            // Transaction 3 - Fuel
            {
                id: 'txn-003',
                transactionType: TransactionType.EXPENSE,
                amount: 850,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
                categoryId: 'exp-2',
                subcategoryId: 'exp-2-1',
                description: 'Petrol Fill-up - Indian Oil',
                notes: 'Full tank petrol for car',
                tags: ['fuel', 'transport', 'vehicle', 'petrol'],
                paymentMethod: PaymentMethod.CREDIT_CARD,
                fromAccountId: 'acc-3',
                cardLastFourDigits: '9012',
                isRecurring: false,
                isTaxDeductible: true,
                taxCategory: '80C',
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
            },

            // Transaction 4 - Electricity Bill
            {
                id: 'txn-004',
                transactionType: TransactionType.EXPENSE,
                amount: 1850,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 5),
                categoryId: 'exp-3',
                description: 'Electricity Bill - November 2025',
                notes: 'Monthly electricity bill payment',
                tags: ['utility', 'electricity', 'bill', 'monthly'],
                paymentMethod: PaymentMethod.NET_BANKING,
                fromAccountId: 'acc-1',
                referenceNumber: 'ELEC-NOV-2025',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 0, 5),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 5),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 5)
            },

            // Transaction 5 - Restaurant Dinner
            {
                id: 'txn-005',
                transactionType: TransactionType.EXPENSE,
                amount: 1250,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
                categoryId: 'exp-4',
                description: 'Dinner at The Restaurant',
                notes: 'Family dinner with friends',
                tags: ['food', 'dining', 'restaurant', 'entertainment'],
                paymentMethod: PaymentMethod.DEBIT_CARD,
                fromAccountId: 'acc-1',
                cardLastFourDigits: '5678',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3)
            },

            // Transaction 6 - Mobile Recharge
            {
                id: 'txn-006',
                transactionType: TransactionType.EXPENSE,
                amount: 599,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4),
                categoryId: 'exp-5',
                description: 'Jio Mobile Recharge - Unlimited Plan',
                notes: '84 days unlimited plan with 2GB/day',
                tags: ['mobile', 'recharge', 'telecom'],
                paymentMethod: PaymentMethod.UPI,
                fromAccountId: 'acc-1',
                upiProviderId: 'upi-2',
                upiTransactionId: 'UPI789456123654',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4)
            },

            // Transaction 7 - Netflix Subscription
            {
                id: 'txn-007',
                transactionType: TransactionType.EXPENSE,
                amount: 649,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 10),
                categoryId: 'exp-6',
                description: 'Netflix Premium Subscription',
                notes: 'Monthly Netflix subscription renewal',
                tags: ['entertainment', 'subscription', 'streaming', 'netflix'],
                paymentMethod: PaymentMethod.CREDIT_CARD,
                fromAccountId: 'acc-3',
                cardLastFourDigits: '9012',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 0, 10),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: true,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 10),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 10)
            },

            // Transaction 8 - Gym Membership
            {
                id: 'txn-008',
                transactionType: TransactionType.EXPENSE,
                amount: 2500,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 1),
                categoryId: 'exp-7',
                description: 'Gym Membership - Fitness First',
                notes: 'Monthly gym membership fee',
                tags: ['fitness', 'health', 'gym', 'monthly'],
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                fromAccountId: 'acc-1',
                referenceNumber: 'GYM-DEC-2025',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 5, 1),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 1)
            },

            // Transaction 9 - Online Shopping - Amazon
            {
                id: 'txn-009',
                transactionType: TransactionType.EXPENSE,
                amount: 3499,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
                categoryId: 'exp-8',
                description: 'Amazon - Electronics Purchase',
                notes: 'Purchased wireless earbuds and phone case',
                tags: ['shopping', 'electronics', 'amazon', 'online'],
                paymentMethod: PaymentMethod.CREDIT_CARD,
                fromAccountId: 'acc-3',
                cardLastFourDigits: '9012',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: false,
                isFavorite: false,
                attachments: [{
                    id: 'att-002',
                    fileName: 'amazon_invoice.pdf',
                    fileType: 'application/pdf',
                    fileSize: 180000,
                    fileUrl: '/uploads/amazon_invoice.pdf',
                    uploadedAt: new Date()
                }],
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5)
            },

            // Transaction 10 - Medicine
            {
                id: 'txn-010',
                transactionType: TransactionType.EXPENSE,
                amount: 850,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
                categoryId: 'exp-9',
                description: 'Pharmacy - Prescribed Medicines',
                notes: 'Monthly medicines for chronic condition',
                tags: ['health', 'medicine', 'pharmacy', 'medical'],
                paymentMethod: PaymentMethod.CASH,
                fromAccountId: 'acc-2',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 0, 1),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: true,
                taxCategory: '80D',
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                attachments: [{
                    id: 'att-003',
                    fileName: 'prescription.jpg',
                    fileType: 'image/jpeg',
                    fileSize: 520000,
                    fileUrl: '/uploads/prescription.jpg',
                    uploadedAt: new Date()
                }],
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
            },

            // Transaction 11 - Rent Payment
            {
                id: 'txn-011',
                transactionType: TransactionType.EXPENSE,
                amount: 15000,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 1),
                categoryId: 'exp-10',
                description: 'House Rent - December 2025',
                notes: 'Monthly house rent payment to landlord',
                tags: ['rent', 'housing', 'monthly', 'fixed'],
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                fromAccountId: 'acc-1',
                referenceNumber: 'RENT-DEC-2025',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2023, 0, 1),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: true,
                taxCategory: '80GG',
                status: 'PAID',
                isReconciled: true,
                isFavorite: true,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 1),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 1)
            },

            // Transaction 12 - Internet Bill
            {
                id: 'txn-012',
                transactionType: TransactionType.EXPENSE,
                amount: 999,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 8),
                categoryId: 'exp-3',
                description: 'Airtel Broadband - Monthly Bill',
                notes: '100 Mbps unlimited internet plan',
                tags: ['utility', 'internet', 'broadband', 'monthly'],
                paymentMethod: PaymentMethod.UPI,
                fromAccountId: 'acc-1',
                upiProviderId: 'upi-1',
                upiTransactionId: 'UPI321654987321',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 0, 8),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 8),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 8)
            },

            // Transaction 13 - Coffee Shop
            {
                id: 'txn-013',
                transactionType: TransactionType.EXPENSE,
                amount: 320,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                categoryId: 'exp-4',
                description: 'Starbucks - Coffee and Snack',
                notes: 'Morning coffee meeting',
                tags: ['food', 'coffee', 'beverage', 'starbucks'],
                paymentMethod: PaymentMethod.DEBIT_CARD,
                fromAccountId: 'acc-1',
                cardLastFourDigits: '5678',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            },

            // Transaction 14 - Book Purchase
            {
                id: 'txn-014',
                transactionType: TransactionType.EXPENSE,
                amount: 899,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
                categoryId: 'exp-11',
                description: 'Kindle - E-book Purchase',
                notes: 'Purchased 3 technical books for learning',
                tags: ['books', 'education', 'learning', 'kindle'],
                paymentMethod: PaymentMethod.CREDIT_CARD,
                fromAccountId: 'acc-3',
                cardLastFourDigits: '9012',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
            },

            // Transaction 15 - Parking Fee
            {
                id: 'txn-015',
                transactionType: TransactionType.EXPENSE,
                amount: 200,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
                categoryId: 'exp-2',
                description: 'Mall Parking Fee',
                notes: '4 hours parking at shopping mall',
                tags: ['parking', 'transport', 'vehicle'],
                paymentMethod: PaymentMethod.CASH,
                fromAccountId: 'acc-2',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2)
            },

            // Transaction 16 - Freelance Income
            {
                id: 'txn-016',
                transactionType: TransactionType.INCOME,
                amount: 25000,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 15),
                categoryId: 'inc-2',
                description: 'Freelance Web Development Project',
                notes: 'Payment received for website development project',
                tags: ['freelance', 'income', 'project', 'web-development'],
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                toAccountId: 'acc-1',
                referenceNumber: 'FREELANCE-DEC-001',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: true,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 15),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 15)
            },

            // Transaction 17 - Uber Ride
            {
                id: 'txn-017',
                transactionType: TransactionType.EXPENSE,
                amount: 285,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                categoryId: 'exp-2',
                description: 'Uber Ride - Home to Office',
                notes: 'Morning commute via Uber',
                tags: ['transport', 'uber', 'commute', 'ride'],
                paymentMethod: PaymentMethod.UPI,
                fromAccountId: 'acc-1',
                upiProviderId: 'upi-1',
                upiTransactionId: 'UPI987654321789',
                isRecurring: false,
                isTaxDeductible: true,
                taxCategory: 'BUSINESS',
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
            },

            // Transaction 18 - Insurance Premium
            {
                id: 'txn-018',
                transactionType: TransactionType.EXPENSE,
                amount: 5000,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 12),
                categoryId: 'exp-12',
                description: 'Life Insurance Premium - LIC',
                notes: 'Quarterly premium payment for life insurance policy',
                tags: ['insurance', 'life', 'premium', 'lic', 'quarterly'],
                paymentMethod: PaymentMethod.NET_BANKING,
                fromAccountId: 'acc-1',
                referenceNumber: 'LIC-Q4-2025',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.QUARTERLY,
                    startDate: new Date(2020, 0, 12),
                    endDate: new Date(2030, 0, 12),
                    occurrences: 40
                },
                isTaxDeductible: true,
                taxCategory: '80C',
                status: 'PAID',
                isReconciled: true,
                isFavorite: true,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 12),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 12)
            },

            // Transaction 19 - Movie Tickets
            {
                id: 'txn-019',
                transactionType: TransactionType.EXPENSE,
                amount: 850,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
                categoryId: 'exp-6',
                description: 'PVR Cinema - Movie Tickets',
                notes: '2 tickets + popcorn combo',
                tags: ['entertainment', 'movie', 'cinema', 'pvr'],
                paymentMethod: PaymentMethod.DEBIT_CARD,
                fromAccountId: 'acc-1',
                cardLastFourDigits: '5678',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3)
            },
            {
                id: 'txn-020',
                transactionType: TransactionType.TRANSFER,
                amount: 10000,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 5),
                description: 'Transfer to Savings Account',
                notes: 'Monthly savings transfer',
                tags: ['savings', 'transfer', 'investment'],
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                fromAccountId: 'acc-1',
                toAccountId: 'acc-4',
                transferFee: 0,
                createLinkedTransactions: true,
                isRecurring: true,
                categoryId: 'exp-14',
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 0, 5),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: true,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 5),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 5)
            },
            {
                id: 'txn-021',
                transactionType: TransactionType.DEBT_GIVEN,
                amount: 15000,
                currency: 'INR',
                categoryId: 'debt-1',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10),
                description: 'Loan Given to Rahul',
                notes: 'Personal loan to friend for emergency medical expenses',
                tags: ['loan', 'debt', 'friend', 'personal'],
                contactId: 'contact-1',
                dueDate: new Date(now.getFullYear(), now.getMonth() + 3, now.getDate()),
                isPaid: false,
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                fromAccountId: 'acc-1',
                referenceNumber: 'LOAN-RAHUL-001',
                isRecurring: false,
                isTaxDeductible: false,
                status: 'PENDING',
                isReconciled: false,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10)
            },

            // Transaction 22 - Investment Income
            {
                id: 'txn-022',
                transactionType: TransactionType.INCOME,
                amount: 12500,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), 20),
                categoryId: 'inc-3',
                description: 'Mutual Fund Dividend',
                notes: 'Quarterly dividend from mutual fund investments',
                tags: ['investment', 'dividend', 'income', 'mutual-fund'],
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                toAccountId: 'acc-1',
                referenceNumber: 'DIV-Q4-2025',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.QUARTERLY,
                    startDate: new Date(2023, 0, 20),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PAID',
                isReconciled: true,
                isFavorite: true,
                createdAt: new Date(now.getFullYear(), now.getMonth(), 20),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), 20)
            },

            // Transaction 23 - Pending Credit Card Payment
            {
                id: 'txn-023',
                transactionType: TransactionType.EXPENSE,
                amount: 8500,
                currency: 'INR',
                transactionDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5),
                categoryId: 'exp-13',
                description: 'Credit Card Bill Payment Due',
                notes: 'HDFC Credit Card monthly statement payment',
                tags: ['credit-card', 'bill', 'payment', 'due'],
                paymentMethod: PaymentMethod.BANK_TRANSFER,
                fromAccountId: 'acc-1',
                referenceNumber: 'CC-DEC-2025',
                isRecurring: true,
                recurringConfig: {
                    frequency: RecurrenceFrequency.MONTHLY,
                    startDate: new Date(2024, 0, 25),
                    endDate: undefined,
                    occurrences: undefined
                },
                isTaxDeductible: false,
                status: 'PENDING',
                isReconciled: false,
                isFavorite: false,
                createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                updatedAt: new Date(now.getFullYear(), now.getMonth(), now.getDate())
            }

            // Continue adding more transactions to reach 50...
        ];
    }

}
