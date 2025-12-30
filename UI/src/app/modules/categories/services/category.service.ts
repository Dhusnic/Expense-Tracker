import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import {
    Category,
    CategoryFormData,
    CategoryApiResponse,
    ImageUploadResponse,
    BootstrapIcon,
    EmojiItem,
    IconType
} from '../models/category.models';
import  {environment} from '../../../../environments/environment';
import { TransactionType } from '../../expense-tracker/models/expense-tracker.models';
@Injectable({
    providedIn: 'root'
})
export class CategoryService {
    private readonly API_BASE_URL = environment.apiBaseUrl + '/categories';

    constructor(private http: HttpClient) { }

    /**
     * Save category (Create or Update)
     */
    saveCategory(category: CategoryFormData): Observable<CategoryApiResponse> {
        return this.http.post<CategoryApiResponse>(`${this.API_BASE_URL}/save`, category);
    }

    /**
     * Get all categories
     */
    getCategories(): Observable<CategoryApiResponse> {
        return this.http.get<CategoryApiResponse>(`${this.API_BASE_URL}/get_list`);
    }

    /**
     * Get category by ID
     */
    getCategoryById(id: string): Observable<CategoryApiResponse> {
        return this.http.get<CategoryApiResponse>(`${this.API_BASE_URL}/${id}`);
    }

    /**
     * Delete category
     */
    deleteCategory(id: string): Observable<CategoryApiResponse> {
        return this.http.delete<CategoryApiResponse>(`${this.API_BASE_URL}/${id}`);
    }

    /**
     * Check if category name exists
     */
    checkCategoryNameExists(name: string): Observable<boolean> {
        return this.http.get<{ exists: boolean }>(`${this.API_BASE_URL}/check-name`, {
            params: { name }
        }).pipe(map(response => response.exists));
    }

    /**
     * Upload custom icon image
     */
    uploadCategoryIcon(file: File): Observable<ImageUploadResponse> {
        const formData = new FormData();
        formData.append('file', file);

        return this.http.post<ImageUploadResponse>(`${this.API_BASE_URL}/upload-icon`, formData);
    }

    /**
     * Get all Bootstrap icons (for icon picker)
     */
    getBootstrapIcons(): Observable<BootstrapIcon[]> {
        // This can be a static JSON file or API call
        return this.http.get<BootstrapIcon[]>('/assets/data/bootstrap-icons.json');
    }

    /**
     * Get all emojis (for emoji picker)
     */
    getEmojis(): Observable<EmojiItem[]> {
        // This can be a static JSON file or API call
        return this.http.get<EmojiItem[]>('/assets/data/emojis.json');
    }

    /**
     * Get default categories (pre-populated)
     */
    getDefaultCategories(): Category[] {
        return [
            // Income Categories
            {
                name: 'Salary',
                icon: { type: IconType.BOOTSTRAP_ICON, value: 'bi-cash-coin', color: '#10b981' },
                description: 'Monthly salary income',
                transactionTypes: [TransactionType.INCOME],
                subcategories: [],
                sortOrder: 1,
                isActive: true,
                isTaxDeductible: false,
                isDefault: true,
                linkedAccountIds: []
            },
            {
                name: 'Freelance',
                icon: { type: IconType.BOOTSTRAP_ICON, value: 'bi-laptop', color: '#3b82f6' },
                description: 'Freelance project income',
                transactionTypes: [TransactionType.INCOME],
                subcategories: [],
                sortOrder: 2,
                isActive: true,
                isTaxDeductible: false,
                isDefault: true,
                linkedAccountIds: []
            },
            {
                name: 'Investment',
                icon: { type: IconType.BOOTSTRAP_ICON, value: 'bi-graph-up-arrow', color: '#8b5cf6' },
                description: 'Investment returns and dividends',
                transactionTypes: [TransactionType.INCOME],
                subcategories: [],
                sortOrder: 3,
                isActive: true,
                isTaxDeductible: false,
                isDefault: true,
                linkedAccountIds: []
            },

            // Expense Categories
            {
                name: 'Food & Dining',
                icon: { type: IconType.EMOJI, value: '🍽️', color: '#ef4444' },
                description: 'Food, groceries, and dining expenses',
                transactionTypes: [TransactionType.EXPENSE],
                subcategories: [
                    {
                        name: 'Groceries',
                        icon: { type: IconType.EMOJI, value: '🛒', color: '#ef4444' },
                        sortOrder: 1,
                        isActive: true,
                        isTaxDeductible: false,
                        linkedAccountIds: []
                    },
                    {
                        name: 'Restaurants',
                        icon: { type: IconType.EMOJI, value: '🍕', color: '#ef4444' },
                        sortOrder: 2,
                        isActive: true,
                        isTaxDeductible: false,
                        linkedAccountIds: []
                    }
                ],
                sortOrder: 1,
                isActive: true,
                isTaxDeductible: false,
                isDefault: true,
                linkedAccountIds: []
            },
            {
                name: 'Transportation',
                icon: { type: IconType.EMOJI, value: '🚗', color: '#f59e0b' },
                description: 'Transport and vehicle expenses',
                transactionTypes: [TransactionType.EXPENSE],
                subcategories: [
                    {
                        name: 'Fuel',
                        icon: { type: IconType.BOOTSTRAP_ICON, value: 'bi-fuel-pump', color: '#f59e0b' },
                        sortOrder: 1,
                        isActive: true,
                        isTaxDeductible: true,
                        linkedAccountIds: []
                    },
                    {
                        name: 'Public Transport',
                        icon: { type: IconType.BOOTSTRAP_ICON, value: 'bi-bus-front', color: '#f59e0b' },
                        sortOrder: 2,
                        isActive: true,
                        isTaxDeductible: false,
                        linkedAccountIds: []
                    }
                ],
                sortOrder: 2,
                isActive: true,
                isTaxDeductible: false,
                isDefault: true,
                linkedAccountIds: []
            },

            // Transfer Categories
            {
                name: 'Savings Transfer',
                icon: { type: IconType.BOOTSTRAP_ICON, value: 'bi-piggy-bank', color: '#06b6d4' },
                description: 'Transfer to savings account',
                transactionTypes: [TransactionType.TRANSFER],
                subcategories: [],
                sortOrder: 1,
                isActive: true,
                isTaxDeductible: false,
                isDefault: true,
                linkedAccountIds: []
            },

            // Debt Categories
            {
                name: 'Personal Loan',
                icon: { type: IconType.BOOTSTRAP_ICON, value: 'bi-currency-exchange', color: '#ec4899' },
                description: 'Personal loans given or received',
                transactionTypes: [TransactionType.DEBT_GIVEN, TransactionType.DEBT_RECEIVED],
                subcategories: [],
                sortOrder: 1,
                isActive: true,
                isTaxDeductible: false,
                isDefault: true,
                linkedAccountIds: []
            }
        ];
    }
}
