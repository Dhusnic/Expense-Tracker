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
import { ApiService } from '../../../core/services/api.service';
import { environment } from '../../../../environments/environment';
@Injectable({
    providedIn: 'root'
})
export class ExpenseTrackerService {
    private readonly API_BASE_URL = environment.apiBaseUrl + '/transactions'; // Update with your actual API URL
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

    constructor(private http: HttpClient,
        private api: ApiService
    ) {
        this.initializeMockData();
    }

    /**
     * Initialize mock data (remove this when API is ready)
     */
    private initializeMockData(): void {
        // this.categories.set(this.getMockCategories());
        this.accounts.set(this.getMockAccounts());
        this.upiProviders.set(this.getMockUpiProviders());
        this.contacts.set(this.getMockContacts());

        // this.categoriesSubject.next(this.getMockCategories());
        this.accountsSubject.next(this.getMockAccounts());
    }

    /**
     * Save transaction
     */
    saveTransaction(transaction: TransactionFormData): Observable<ApiResponse<TransactionFormData>> {
        // debugger;
        return this.http.post<ApiResponse<TransactionFormData>>(`${this.API_BASE_URL}/save`, transaction);
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
    // getCategoriesByType(type: TransactionType): Observable<Category[]> {
    //     // TODO: Replace with actual API call
    //     // return this.http.get<ApiResponse<Category[]>>(
    //     //   `${this.API_BASE_URL}/categories?type=${type}`
    //     // ).pipe(map(response => response.data || []));

    //     return of(this.getMockCategories().filter(cat => cat.type === type)).pipe(delay(300));
    // }

    getTransaction(id: string): Observable<TransactionFormData> {
        return this.http.get<TransactionFormData>(`${this.API_BASE_URL}/transactions/${id}`);
    }
        // return of(this.getMockData().find(t => t.id === id)!).pipe(delay(300));}

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

    // private getMockCategories(): Category[] {
    //     return [
    //         // Income Categories
    //         {
    //             id: '507f1f77bcf86cd799439011', // was 'inc-1'
    //             name: 'Salary',
    //             icon: 'bi-cash-stack',
    //             color: '#10b981',
    //             type: TransactionType.INCOME,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd799439012', name: 'Monthly Salary', icon: 'bi-calendar-month', color: '#10b981', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439011' },
    //                 { id: '507f1f77bcf86cd799439013', name: 'Bonus', icon: 'bi-gift', color: '#10b981', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439011' },
    //                 { id: '507f1f77bcf86cd799439014', name: 'Overtime', icon: 'bi-clock', color: '#10b981', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439011' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439015', // was 'inc-2'
    //             name: 'Business Income',
    //             icon: 'bi-briefcase',
    //             color: '#06b6d4',
    //             type: TransactionType.INCOME,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd799439016', name: 'Sales', icon: 'bi-cart', color: '#06b6d4', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439015' },
    //                 { id: '507f1f77bcf86cd799439017', name: 'Services', icon: 'bi-tools', color: '#06b6d4', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439015' },
    //                 { id: '507f1f77bcf86cd799439018', name: 'Consulting', icon: 'bi-person-badge', color: '#06b6d4', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439015' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439019', // was 'inc-3'
    //             name: 'Investment',
    //             icon: 'bi-graph-up',
    //             color: '#8b5cf6',
    //             type: TransactionType.INCOME,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd79943901a', name: 'Dividends', icon: 'bi-pie-chart', color: '#8b5cf6', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439019' },
    //                 { id: '507f1f77bcf86cd79943901b', name: 'Interest', icon: 'bi-percent', color: '#8b5cf6', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439019' },
    //                 { id: '507f1f77bcf86cd79943901c', name: 'Capital Gains', icon: 'bi-arrow-up-circle', color: '#8b5cf6', type: TransactionType.INCOME, parentId: '507f1f77bcf86cd799439019' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd79943901d', // was 'inc-4'
    //             name: 'Other Income',
    //             icon: 'bi-plus-circle',
    //             color: '#f59e0b',
    //             type: TransactionType.INCOME
    //         },

    //         // Expense Categories
    //         {
    //             id: '507f1f77bcf86cd79943901e', // was 'exp-1'
    //             name: 'Food & Dining',
    //             icon: 'bi-cup-straw',
    //             color: '#ef4444',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd79943901f', name: 'Groceries', icon: 'bi-bag', color: '#ef4444', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943901e' },
    //                 { id: '507f1f77bcf86cd799439020', name: 'Restaurants', icon: 'bi-shop', color: '#ef4444', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943901e' },
    //                 { id: '507f1f77bcf86cd799439021', name: 'Cafes', icon: 'bi-cup-hot', color: '#ef4444', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943901e' },
    //                 { id: '507f1f77bcf86cd799439022', name: 'Food Delivery', icon: 'bi-bicycle', color: '#ef4444', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943901e' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439023', // was 'exp-2'
    //             name: 'Transportation',
    //             icon: 'bi-car-front',
    //             color: '#3b82f6',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd799439024', name: 'Fuel', icon: 'bi-fuel-pump', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439023' },
    //                 { id: '507f1f77bcf86cd799439025', name: 'Public Transport', icon: 'bi-bus-front', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439023' },
    //                 { id: '507f1f77bcf86cd799439026', name: 'Taxi/Ride Share', icon: 'bi-taxi-front', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439023' },
    //                 { id: '507f1f77bcf86cd799439027', name: 'Parking', icon: 'bi-p-square', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439023' },
    //                 { id: '507f1f77bcf86cd799439028', name: 'Vehicle Maintenance', icon: 'bi-wrench', color: '#3b82f6', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439023' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439029', // was 'exp-3'
    //             name: 'Shopping',
    //             icon: 'bi-bag-heart',
    //             color: '#ec4899',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd79943902a', name: 'Clothing', icon: 'bi-bag', color: '#ec4899', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439029' },
    //                 { id: '507f1f77bcf86cd79943902b', name: 'Electronics', icon: 'bi-laptop', color: '#ec4899', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439029' },
    //                 { id: '507f1f77bcf86cd79943902c', name: 'Household Items', icon: 'bi-house', color: '#ec4899', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439029' },
    //                 { id: '507f1f77bcf86cd79943902d', name: 'Personal Care', icon: 'bi-heart-pulse', color: '#ec4899', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439029' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd79943902e', // was 'exp-4'
    //             name: 'Bills & Utilities',
    //             icon: 'bi-receipt',
    //             color: '#f97316',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd79943902f', name: 'Electricity', icon: 'bi-lightning', color: '#f97316', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943902e' },
    //                 { id: '507f1f77bcf86cd799439030', name: 'Water', icon: 'bi-droplet', color: '#f97316', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943902e' },
    //                 { id: '507f1f77bcf86cd799439031', name: 'Internet', icon: 'bi-wifi', color: '#f97316', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943902e' },
    //                 { id: '507f1f77bcf86cd799439032', name: 'Mobile', icon: 'bi-phone', color: '#f97316', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943902e' },
    //                 { id: '507f1f77bcf86cd799439033', name: 'Gas', icon: 'bi-fire', color: '#f97316', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943902e' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439034', // was 'exp-5'
    //             name: 'Entertainment',
    //             icon: 'bi-film',
    //             color: '#a855f7',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd799439035', name: 'Movies', icon: 'bi-camera-reels', color: '#a855f7', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439034' },
    //                 { id: '507f1f77bcf86cd799439036', name: 'Streaming Services', icon: 'bi-play-circle', color: '#a855f7', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439034' },
    //                 { id: '507f1f77bcf86cd799439037', name: 'Gaming', icon: 'bi-controller', color: '#a855f7', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439034' },
    //                 { id: '507f1f77bcf86cd799439038', name: 'Sports', icon: 'bi-trophy', color: '#a855f7', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439034' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439039', // was 'exp-6'
    //             name: 'Healthcare',
    //             icon: 'bi-heart-pulse-fill',
    //             color: '#dc2626',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd79943903a', name: 'Doctor Visits', icon: 'bi-hospital', color: '#dc2626', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439039' },
    //                 { id: '507f1f77bcf86cd79943903b', name: 'Medicines', icon: 'bi-capsule', color: '#dc2626', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439039' },
    //                 { id: '507f1f77bcf86cd79943903c', name: 'Lab Tests', icon: 'bi-clipboard2-pulse', color: '#dc2626', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439039' },
    //                 { id: '507f1f77bcf86cd79943903d', name: 'Insurance', icon: 'bi-shield-plus', color: '#dc2626', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439039' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd79943903e', // was 'exp-7'
    //             name: 'Education',
    //             icon: 'bi-book',
    //             color: '#0ea5e9',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd79943903f', name: 'Tuition Fees', icon: 'bi-mortarboard', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943903e' },
    //                 { id: '507f1f77bcf86cd799439040', name: 'Books', icon: 'bi-journal', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943903e' },
    //                 { id: '507f1f77bcf86cd799439041', name: 'Online Courses', icon: 'bi-laptop', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943903e' },
    //                 { id: '507f1f77bcf86cd799439042', name: 'Stationery', icon: 'bi-pencil', color: '#0ea5e9', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd79943903e' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439043', // was 'exp-8'
    //             name: 'Housing',
    //             icon: 'bi-house-door',
    //             color: '#84cc16',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd799439044', name: 'Rent', icon: 'bi-key', color: '#84cc16', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439043' },
    //                 { id: '507f1f77bcf86cd799439045', name: 'Mortgage', icon: 'bi-bank2', color: '#84cc16', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439043' },
    //                 { id: '507f1f77bcf86cd799439046', name: 'Maintenance', icon: 'bi-tools', color: '#84cc16', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439043' },
    //                 { id: '507f1f77bcf86cd799439047', name: 'Property Tax', icon: 'bi-file-text', color: '#84cc16', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439043' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd799439048', // was 'exp-9'
    //             name: 'Travel',
    //             icon: 'bi-airplane',
    //             color: '#06b6d4',
    //             type: TransactionType.EXPENSE,
    //             subcategories: [
    //                 { id: '507f1f77bcf86cd799439049', name: 'Flights', icon: 'bi-airplane-engines', color: '#06b6d4', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439048' },
    //                 { id: '507f1f77bcf86cd79943904a', name: 'Hotels', icon: 'bi-building', color: '#06b6d4', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439048' },
    //                 { id: '507f1f77bcf86cd79943904b', name: 'Vacation', icon: 'bi-palm-tree', color: '#06b6d4', type: TransactionType.EXPENSE, parentId: '507f1f77bcf86cd799439048' }
    //             ]
    //         },
    //         {
    //             id: '507f1f77bcf86cd79943904c', // was 'exp-10'
    //             name: 'Other Expenses',
    //             icon: 'bi-three-dots',
    //             color: '#6b7280',
    //             type: TransactionType.EXPENSE
    //         }
    //     ];
    // }
    private getMockAccounts(): Account[] {
        return [
            {
                id: '65a7b1c2d3e4f5a6b7c8d9e0', // was 'acc-1'
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
                id: '65a7b1c2d3e4f5a6b7c8d9e1', // was 'acc-2'
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
                id: '65a7b1c2d3e4f5a6b7c8d9e2', // was 'acc-3'
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
                id: '65a7b1c2d3e4f5a6b7c8d9e3', // was 'acc-4'
                name: 'Cash Wallet',
                type: 'CASH',
                balance: 5000,
                currency: 'INR',
                icon: 'bi-wallet2',
                isActive: true
            },
            {
                id: '65a7b1c2d3e4f5a6b7c8d9e4', // was 'acc-5'
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
            { id: '65a7b1c2d3e4f5a6b7c8d9e5', name: 'Google Pay', icon: 'bi-google' }, // was 'upi-1'
            { id: '65a7b1c2d3e4f5a6b7c8d9e6', name: 'PhonePe', icon: 'bi-phone' }, // was 'upi-2'
            { id: '65a7b1c2d3e4f5a6b7c8d9e7', name: 'Paytm', icon: 'bi-wallet2' }, // was 'upi-3'
            { id: '65a7b1c2d3e4f5a6b7c8d9e8', name: 'Amazon Pay', icon: 'bi-amazon' }, // was 'upi-4'
            { id: '65a7b1c2d3e4f5a6b7c8d9e9', name: 'BHIM', icon: 'bi-bank' }, // was 'upi-5'
            { id: '65a7b1c2d3e4f5a6b7c8d9ea', name: 'WhatsApp Pay', icon: 'bi-whatsapp' }, // was 'upi-6'
            { id: '65a7b1c2d3e4f5a6b7c8d9eb', name: 'Other', icon: 'bi-three-dots' } // was 'upi-7'
        ];
    }
    private getMockContacts(): Contact[] {
        return [
            { id: '65a7b1c2d3e4f5a6b7c8d9ec', name: 'John Doe', phone: '+91 98765 43210', email: 'john@example.com', upiId: 'john@paytm' }, // was 'cnt-1'
            { id: '65a7b1c2d3e4f5a6b7c8d9ed', name: 'Jane Smith', phone: '+91 98765 43211', email: 'jane@example.com', upiId: 'jane@gpay' }, // was 'cnt-2'
            { id: '65a7b1c2d3e4f5a6b7c8d9ee', name: 'Bob Johnson', phone: '+91 98765 43212', email: 'bob@example.com' }, // was 'cnt-3'
            { id: '65a7b1c2d3e4f5a6b7c8d9ef', name: 'Alice Brown', phone: '+91 98765 43213', email: 'alice@example.com', upiId: 'alice@phonepe' } // was 'cnt-4'
        ];
    }

}
