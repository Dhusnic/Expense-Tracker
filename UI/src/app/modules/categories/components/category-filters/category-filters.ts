import { Component, Input, Output, EventEmitter, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryFilter } from '../../models/categories-list.models';
import { TransactionType } from '../../../expense-tracker/models/expense-tracker.models';

@Component({
    selector: 'app-category-filters',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './category-filters.html',
    styleUrls: ['./category-filters.scss']
})
export class CategoryFilters implements OnInit {
    @Input() filter!: CategoryFilter;
    @Output() filterChange = new EventEmitter<CategoryFilter>();
    @Output() close = new EventEmitter<void>();

    // Local filter state
    localFilter = signal<CategoryFilter>({
        searchQuery: '',
        transactionTypes: [],
        isActive: null,
        hasBudgetLimit: null,
        isTaxDeductible: null,
        hasSubcategories: null,
        isDefault: null,
        createdDateFrom: null,
        createdDateTo: null,
        colors: [],
        minBudget: null,
        maxBudget: null
    });

    // Transaction types
    TransactionType = TransactionType;
    allTransactionTypes = Object.values(TransactionType);

    // Common color presets
    colorPresets = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
        '#f43f5e', '#64748b', '#6b7280', '#1f2937'
    ];

    // Computed
    activeFilterCount = computed(() => {
        const f = this.localFilter();
        let count = 0;
        if (f.transactionTypes.length > 0) count++;
        if (f.isActive !== null) count++;
        if (f.hasBudgetLimit !== null) count++;
        if (f.isTaxDeductible !== null) count++;
        if (f.hasSubcategories !== null) count++;
        if (f.isDefault !== null) count++;
        if (f.createdDateFrom !== null) count++;
        if (f.createdDateTo !== null) count++;
        if (f.colors.length > 0) count++;
        if (f.minBudget !== null || f.maxBudget !== null) count++;
        return count;
    });

    ngOnInit(): void {
        // Initialize with passed filter
        if (this.filter) {
            this.localFilter.set({ ...this.filter });
        }
    }

    // Transaction type toggle
    toggleTransactionType(type: TransactionType): void {
        this.localFilter.update(f => {
            const types = [...f.transactionTypes];
            const index = types.indexOf(type);
            if (index >= 0) {
                types.splice(index, 1);
            } else {
                types.push(type);
            }
            return { ...f, transactionTypes: types };
        });
    }

    isTransactionTypeSelected(type: TransactionType): boolean {
        return this.localFilter().transactionTypes.includes(type);
    }

    // Color toggle
    toggleColor(color: string): void {
        this.localFilter.update(f => {
            const colors = [...f.colors];
            const index = colors.indexOf(color);
            if (index >= 0) {
                colors.splice(index, 1);
            } else {
                colors.push(color);
            }
            return { ...f, colors };
        });
    }

    isColorSelected(color: string): boolean {
        return this.localFilter().colors.includes(color);
    }

    // Status toggles
    setActiveStatus(status: boolean | null): void {
        this.localFilter.update(f => ({ ...f, isActive: status }));
    }

    setBudgetFilter(has: boolean | null): void {
        this.localFilter.update(f => ({ ...f, hasBudgetLimit: has }));
    }

    setTaxFilter(tax: boolean | null): void {
        this.localFilter.update(f => ({ ...f, isTaxDeductible: tax }));
    }

    setSubcategoriesFilter(has: boolean | null): void {
        this.localFilter.update(f => ({ ...f, hasSubcategories: has }));
    }

    setDefaultFilter(isDefault: boolean | null): void {
        this.localFilter.update(f => ({ ...f, isDefault }));
    }

    // Date filters
    onDateFromChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.localFilter.update(f => ({
            ...f,
            createdDateFrom: value ? new Date(value) : null
        }));
    }

    onDateToChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.localFilter.update(f => ({
            ...f,
            createdDateTo: value ? new Date(value) : null
        }));
    }

    // Budget range
    onMinBudgetChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.localFilter.update(f => ({
            ...f,
            minBudget: value ? parseFloat(value) : null
        }));
    }

    onMaxBudgetChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.localFilter.update(f => ({
            ...f,
            maxBudget: value ? parseFloat(value) : null
        }));
    }

    // Apply filters
    applyFilters(): void {
        this.filterChange.emit(this.localFilter());
    }

    // Reset filters
    resetFilters(): void {
        this.localFilter.set({
            searchQuery: '',
            transactionTypes: [],
            isActive: null,
            hasBudgetLimit: null,
            isTaxDeductible: null,
            hasSubcategories: null,
            isDefault: null,
            createdDateFrom: null,
            createdDateTo: null,
            colors: [],
            minBudget: null,
            maxBudget: null
        });
        this.filterChange.emit(this.localFilter());
    }

    // Close panel
    closePanel(): void {
        this.close.emit();
    }

    // Get transaction type color
    getTransactionTypeColor(type: TransactionType): string {
        const colors: Record<string, string> = {
            'INCOME': '#10b981',
            'EXPENSE': '#ef4444',
            'TRANSFER': '#3b82f6',
            'DEBT_GIVEN': '#f59e0b',
            'DEBT_RECEIVED': '#8b5cf6',
            'DEBT_REPAYMENT': '#06b6d4',
            'DEBT_COLLECTION': '#ec4899'
        };
        return colors[type] || '#6b7280';
    }

    // Format date for input
    formatDateForInput(date: Date | null): string {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    }

    
}
