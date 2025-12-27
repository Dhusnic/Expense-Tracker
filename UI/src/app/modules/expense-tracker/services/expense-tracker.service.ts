import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import {
    TransactionFormData,
    Category,
    Account,
    UpiProvider,
    Contact,
    TransactionType,
    ApiResponse,
    PaymentMethod
} from '../models/expense-tracker.models';

@Injectable({
    providedIn: 'root'
})
export class ExpenseTrackerService {
    private readonly API_BASE_URL = '/api/expense-tracker'; // Update with your actual API URL

    // Signals for reactive state management
    categories = signal<Category[]>([]);
    accounts = signal<Account[]>([]);
    upiProviders = signal<UpiProvider[]>([]);
    contacts = signal<Contact[]>([]);

    // BehaviorSubjects for RxJS compatibility
    private categoriesSubject = new BehaviorSubject<Category[]>([]);
    private accountsSubject = new BehaviorSubject<Account[]>([]);

    categories$ = this.categoriesSubject.asObservable();
    accounts$ = this.accountsSubject.asObservable();

    constructor(private http: HttpClient) {
        this.initializeMockData();
    }

    /**
     * Initialize mock data (remove this when API is ready)
     */
    private initializeMockData(): void {
        this.categories.set(this.getMockCategories());
        this.accounts.set(this.getMockAccounts());
        this.upiProviders.set(this.getMockUpiProviders());
        this.contacts.set(this.getMockContacts());

        this.categoriesSubject.next(this.getMockCategories());
        this.accountsSubject.next(this.getMockAccounts());
    }

    /**
     * Save transaction
     */
    saveTransaction(transaction: TransactionFormData): Observable<ApiResponse<TransactionFormData>> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        // TODO: Replace with actual API call
        // return this.http.post<ApiResponse<TransactionFormData>>(
        //   `${this.API_BASE_URL}/transactions`,
        //   transaction,
        //   { headers }
        // );

        // Mock implementation
        return of({
            success: true,
            data: { ...transaction, createdAt: new Date(), updatedAt: new Date() },
            message: 'Transaction saved successfully'
        }).pipe(delay(1000));
    }

    /**
     * Update transaction
     */
    updateTransaction(id: string, transaction: TransactionFormData): Observable<ApiResponse<TransactionFormData>> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

        // TODO: Replace with actual API call
        // return this.http.put<ApiResponse<TransactionFormData>>(
        //   `${this.API_BASE_URL}/transactions/${id}`,
        //   transaction,
        //   { headers }
        // );

        return of({
            success: true,
            data: { ...transaction, updatedAt: new Date() },
            message: 'Transaction updated successfully'
        }).pipe(delay(1000));
    }

    /**
     * Get categories by transaction type
     */
    getCategoriesByType(type: TransactionType): Observable<Category[]> {
        // TODO: Replace with actual API call
        // return this.http.get<ApiResponse<Category[]>>(
        //   `${this.API_BASE_URL}/categories?type=${type}`
        // ).pipe(map(response => response.data || []));

        return of(this.getMockCategories().filter(cat => cat.type === type)).pipe(delay(300));
    }

    /**
     * Get all accounts
     */
    getAccounts(): Observable<Account[]> {
        // TODO: Replace with actual API call
        // return this.http.get<ApiResponse<Account[]>>(
        //   `${this.API_BASE_URL}/accounts`
        // ).pipe(map(response => response.data || []));

        return of(this.getMockAccounts()).pipe(delay(300));
    }

    /**
     * Get UPI providers
     */
    getUpiProviders(): Observable<UpiProvider[]> {
        // TODO: Replace with actual API call
        return of(this.getMockUpiProviders()).pipe(delay(300));
    }

    /**
     * Get contacts
     */
    getContacts(): Observable<Contact[]> {
        // TODO: Replace with actual API call
        // return this.http.get<ApiResponse<Contact[]>>(
        //   `${this.API_BASE_URL}/contacts`
        // ).pipe(map(response => response.data || []));

        return of(this.getMockContacts()).pipe(delay(300));
    }

    /**
     * Upload attachment
     */
    uploadAttachment(file: File): Observable<ApiResponse<any>> {
        const formData = new FormData();
        formData.append('file', file);

        // TODO: Replace with actual API call
        // return this.http.post<ApiResponse<any>>(
        //   `${this.API_BASE_URL}/attachments`,
        //   formData
        // );

        return of({
            success: true,
            data: {
                id: Math.random().toString(36).substr(2, 9),
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileUrl: URL.createObjectURL(file),
                uploadedAt: new Date()
            },
            message: 'File uploaded successfully'
        }).pipe(delay(1000));
    }

    /**
     * Get supported currencies
     */
    getSupportedCurrencies(): string[] {
        return ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD'];
    }

    /**
     * Get payment methods
     */
    getPaymentMethods(): { value: PaymentMethod; label: string; icon: string }[] {
        return [
            { value: PaymentMethod.CASH, label: 'Cash', icon: 'bi-cash-coin' },
            { value: PaymentMethod.UPI, label: 'UPI', icon: 'bi-phone' },
            { value: PaymentMethod.CREDIT_CARD, label: 'Credit Card', icon: 'bi-credit-card' },
            { value: PaymentMethod.DEBIT_CARD, label: 'Debit Card', icon: 'bi-credit-card-2-front' },
            { value: PaymentMethod.NET_BANKING, label: 'Net Banking', icon: 'bi-bank' },
            { value: PaymentMethod.BANK_TRANSFER, label: 'Bank Transfer', icon: 'bi-arrow-left-right' },
            { value: PaymentMethod.WALLET, label: 'Wallet', icon: 'bi-wallet2' },
            { value: PaymentMethod.CHEQUE, label: 'Cheque', icon: 'bi-receipt' },
            { value: PaymentMethod.OTHER, label: 'Other', icon: 'bi-three-dots' }
        ];
    }

    // ==================== MOCK DATA METHODS ====================
    // TODO: Remove these when API is integrated

    private getMockCategories(): Category[] {
        return [
            // Income Categories
            {
                id: 'inc-1',
                name: 'Salary',
                icon: 'bi-cash-stack',
                color: '#10b981',
                type: TransactionType.INCOME,
                subcategories: [
                    { id: 'inc-1-1', name: 'Monthly Salary', icon: 'bi-calendar-month', color: '#10b981', type: TransactionType.INCOME, parentId: 'inc-1' },
                    { id: 'inc-1-2', name: 'Bonus', icon: 'bi-gift', color: '#10b981', type: TransactionType.INCOME, parentId: 'inc-1' },
                    { id: 'inc-1-3', name: 'Overtime', icon: 'bi-clock', color: '#10b981', type: TransactionType.INCOME, parentId: 'inc-1' }
                ]
            },
            {
                id: 'inc-2',
                name: 'Business Income',
                icon: 'bi-briefcase',
                color: '#06b6d4',
                type: TransactionType.INCOME,
                subcategories: [
                    { id: 'inc-2-1', name: 'Sales', icon: 'bi-cart', color: '#06b6d4', type: TransactionType.INCOME, parentId: 'inc-2' },
                    { id: 'inc-2-2', name: 'Services', icon: 'bi-tools', color: '#06b6d4', type: TransactionType.INCOME, parentId: 'inc-2' },
                    { id: 'inc-2-3', name: 'Consulting', icon: 'bi-person-badge', color: '#06b6d4', type: TransactionType.INCOME, parentId: 'inc-2' }
                ]
            },
            {
                id: 'inc-3',
                name: 'Investment',
                icon: 'bi-graph-up',
                color: '#8b5cf6',
                type: TransactionType.INCOME,
                subcategories: [
                    { id: 'inc-3-1', name: 'Dividends', icon: 'bi-pie-chart', color: '#8b5cf6', type: TransactionType.INCOME, parentId: 'inc-3' },
                    { id: 'inc-3-2', name: 'Interest', icon: 'bi-percent', color: '#8b5cf6', type: TransactionType.INCOME, parentId: 'inc-3' },
                    { id: 'inc-3-3', name: 'Capital Gains', icon: 'bi-arrow-up-circle', color: '#8b5cf6', type: TransactionType.INCOME, parentId: 'inc-3' }
                ]
            },
            {
                id: 'inc-4',
                name: 'Other Income',
                icon: 'bi-plus-circle',
                color: '#f59e0b',
                type: TransactionType.INCOME
            },

            // Expense Categories
            {
                id: 'exp-1',
                name: 'Food & Dining',
                icon: 'bi-cup-straw',
                color: '#ef4444',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-1-1', name: 'Groceries', icon: 'bi-bag', color: '#ef4444', type: TransactionType.EXPENSE, parentId: 'exp-1' },
                    { id: 'exp-1-2', name: 'Restaurants', icon: 'bi-shop', color: '#ef4444', type: TransactionType.EXPENSE, parentId: 'exp-1' },
                    { id: 'exp-1-3', name: 'Cafes', icon: 'bi-cup-hot', color: '#ef4444', type: TransactionType.EXPENSE, parentId: 'exp-1' },
                    { id: 'exp-1-4', name: 'Food Delivery', icon: 'bi-bicycle', color: '#ef4444', type: TransactionType.EXPENSE, parentId: 'exp-1' }
                ]
            },
            {
                id: 'exp-2',
                name: 'Transportation',
                icon: 'bi-car-front',
                color: '#3b82f6',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-2-1', name: 'Fuel', icon: 'bi-fuel-pump', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: 'exp-2' },
                    { id: 'exp-2-2', name: 'Public Transport', icon: 'bi-bus-front', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: 'exp-2' },
                    { id: 'exp-2-3', name: 'Taxi/Ride Share', icon: 'bi-taxi-front', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: 'exp-2' },
                    { id: 'exp-2-4', name: 'Parking', icon: 'bi-p-square', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: 'exp-2' },
                    { id: 'exp-2-5', name: 'Vehicle Maintenance', icon: 'bi-wrench', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: 'exp-2' }
                ]
            },
            {
                id: 'exp-3',
                name: 'Shopping',
                icon: 'bi-bag-heart',
                color: '#ec4899',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-3-1', name: 'Clothing', icon: 'bi-bag', color: '#ec4899', type: TransactionType.EXPENSE, parentId: 'exp-3' },
                    { id: 'exp-3-2', name: 'Electronics', icon: 'bi-laptop', color: '#ec4899', type: TransactionType.EXPENSE, parentId: 'exp-3' },
                    { id: 'exp-3-3', name: 'Household Items', icon: 'bi-house', color: '#ec4899', type: TransactionType.EXPENSE, parentId: 'exp-3' },
                    { id: 'exp-3-4', name: 'Personal Care', icon: 'bi-heart-pulse', color: '#ec4899', type: TransactionType.EXPENSE, parentId: 'exp-3' }
                ]
            },
            {
                id: 'exp-4',
                name: 'Bills & Utilities',
                icon: 'bi-receipt',
                color: '#f97316',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-4-1', name: 'Electricity', icon: 'bi-lightning', color: '#f97316', type: TransactionType.EXPENSE, parentId: 'exp-4' },
                    { id: 'exp-4-2', name: 'Water', icon: 'bi-droplet', color: '#f97316', type: TransactionType.EXPENSE, parentId: 'exp-4' },
                    { id: 'exp-4-3', name: 'Internet', icon: 'bi-wifi', color: '#f97316', type: TransactionType.EXPENSE, parentId: 'exp-4' },
                    { id: 'exp-4-4', name: 'Mobile', icon: 'bi-phone', color: '#f97316', type: TransactionType.EXPENSE, parentId: 'exp-4' },
                    { id: 'exp-4-5', name: 'Gas', icon: 'bi-fire', color: '#f97316', type: TransactionType.EXPENSE, parentId: 'exp-4' }
                ]
            },
            {
                id: 'exp-5',
                name: 'Entertainment',
                icon: 'bi-film',
                color: '#a855f7',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-5-1', name: 'Movies', icon: 'bi-camera-reels', color: '#a855f7', type: TransactionType.EXPENSE, parentId: 'exp-5' },
                    { id: 'exp-5-2', name: 'Streaming Services', icon: 'bi-play-circle', color: '#a855f7', type: TransactionType.EXPENSE, parentId: 'exp-5' },
                    { id: 'exp-5-3', name: 'Gaming', icon: 'bi-controller', color: '#a855f7', type: TransactionType.EXPENSE, parentId: 'exp-5' },
                    { id: 'exp-5-4', name: 'Sports', icon: 'bi-trophy', color: '#a855f7', type: TransactionType.EXPENSE, parentId: 'exp-5' }
                ]
            },
            {
                id: 'exp-6',
                name: 'Healthcare',
                icon: 'bi-heart-pulse-fill',
                color: '#dc2626',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-6-1', name: 'Doctor Visits', icon: 'bi-hospital', color: '#dc2626', type: TransactionType.EXPENSE, parentId: 'exp-6' },
                    { id: 'exp-6-2', name: 'Medicines', icon: 'bi-capsule', color: '#dc2626', type: TransactionType.EXPENSE, parentId: 'exp-6' },
                    { id: 'exp-6-3', name: 'Lab Tests', icon: 'bi-clipboard2-pulse', color: '#dc2626', type: TransactionType.EXPENSE, parentId: 'exp-6' },
                    { id: 'exp-6-4', name: 'Insurance', icon: 'bi-shield-plus', color: '#dc2626', type: TransactionType.EXPENSE, parentId: 'exp-6' }
                ]
            },
            {
                id: 'exp-7',
                name: 'Education',
                icon: 'bi-book',
                color: '#0ea5e9',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-7-1', name: 'Tuition Fees', icon: 'bi-mortarboard', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: 'exp-7' },
                    { id: 'exp-7-2', name: 'Books', icon: 'bi-journal', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: 'exp-7' },
                    { id: 'exp-7-3', name: 'Online Courses', icon: 'bi-laptop', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: 'exp-7' },
                    { id: 'exp-7-4', name: 'Stationery', icon: 'bi-pencil', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: 'exp-7' }
                ]
            },
            {
                id: 'exp-8',
                name: 'Housing',
                icon: 'bi-house-door',
                color: '#84cc16',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-8-1', name: 'Rent', icon: 'bi-key', color: '#84cc16', type: TransactionType.EXPENSE, parentId: 'exp-8' },
                    { id: 'exp-8-2', name: 'Mortgage', icon: 'bi-bank2', color: '#84cc16', type: TransactionType.EXPENSE, parentId: 'exp-8' },
                    { id: 'exp-8-3', name: 'Maintenance', icon: 'bi-tools', color: '#84cc16', type: TransactionType.EXPENSE, parentId: 'exp-8' },
                    { id: 'exp-8-4', name: 'Property Tax', icon: 'bi-file-text', color: '#84cc16', type: TransactionType.EXPENSE, parentId: 'exp-8' }
                ]
            },
            {
                id: 'exp-9',
                name: 'Travel',
                icon: 'bi-airplane',
                color: '#06b6d4',
                type: TransactionType.EXPENSE,
                subcategories: [
                    { id: 'exp-9-1', name: 'Flights', icon: 'bi-airplane-engines', color: '#06b6d4', type: TransactionType.EXPENSE, parentId: 'exp-9' },
                    { id: 'exp-9-2', name: 'Hotels', icon: 'bi-building', color: '#06b6d4', type: TransactionType.EXPENSE, parentId: 'exp-9' },
                    { id: 'exp-9-3', name: 'Vacation', icon: 'bi-palm-tree', color: '#06b6d4', type: TransactionType.EXPENSE, parentId: 'exp-9' }
                ]
            },
            {
                id: 'exp-10',
                name: 'Other Expenses',
                icon: 'bi-three-dots',
                color: '#6b7280',
                type: TransactionType.EXPENSE
            }
        ];
    }

    private getMockAccounts(): Account[] {
        return [
            {
                id: 'acc-1',
                name: 'HDFC Savings Account',
                type: 'BANK',
                accountNumber: '****1234',
                bankName: 'HDFC Bank',
                balance: 50000,
                currency: 'INR',
                icon: 'bi-bank2',
                isActive: true
            },
            {
                id: 'acc-2',
                name: 'SBI Current Account',
                type: 'BANK',
                accountNumber: '****5678',
                bankName: 'State Bank of India',
                balance: 75000,
                currency: 'INR',
                icon: 'bi-bank',
                isActive: true
            },
            {
                id: 'acc-3',
                name: 'ICICI Credit Card',
                type: 'CREDIT_CARD',
                accountNumber: '****9012',
                bankName: 'ICICI Bank',
                balance: -15000,
                currency: 'INR',
                icon: 'bi-credit-card',
                isActive: true
            },
            {
                id: 'acc-4',
                name: 'Cash Wallet',
                type: 'CASH',
                balance: 5000,
                currency: 'INR',
                icon: 'bi-wallet2',
                isActive: true
            },
            {
                id: 'acc-5',
                name: 'Paytm Wallet',
                type: 'WALLET',
                balance: 2500,
                currency: 'INR',
                icon: 'bi-wallet',
                isActive: true
            }
        ];
    }

    private getMockUpiProviders(): UpiProvider[] {
        return [
            { id: 'upi-1', name: 'Google Pay', icon: 'bi-google' },
            { id: 'upi-2', name: 'PhonePe', icon: 'bi-phone' },
            { id: 'upi-3', name: 'Paytm', icon: 'bi-wallet2' },
            { id: 'upi-4', name: 'Amazon Pay', icon: 'bi-amazon' },
            { id: 'upi-5', name: 'BHIM', icon: 'bi-bank' },
            { id: 'upi-6', name: 'WhatsApp Pay', icon: 'bi-whatsapp' },
            { id: 'upi-7', name: 'Other', icon: 'bi-three-dots' }
        ];
    }

    private getMockContacts(): Contact[] {
        return [
            { id: 'cnt-1', name: 'John Doe', phone: '+91 98765 43210', email: 'john@example.com', upiId: 'john@paytm' },
            { id: 'cnt-2', name: 'Jane Smith', phone: '+91 98765 43211', email: 'jane@example.com', upiId: 'jane@gpay' },
            { id: 'cnt-3', name: 'Bob Johnson', phone: '+91 98765 43212', email: 'bob@example.com' },
            { id: 'cnt-4', name: 'Alice Brown', phone: '+91 98765 43213', email: 'alice@example.com', upiId: 'alice@phonepe' }
        ];
    }
}
