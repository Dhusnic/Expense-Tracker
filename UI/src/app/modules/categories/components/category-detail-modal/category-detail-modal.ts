import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryViewModel } from '../../../categories/models/categories-list.models';

@Component({
    selector: 'app-category-detail-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-detail-modal.html',
    styleUrls: ['./category-detail-modal.scss']
})
export class CategoryDetailModal {
    isOpen = signal(false);
    category = signal<CategoryViewModel | null>(null);
    activeTab = signal<'details' | 'subcategories' | 'settings'>('details');

    open(category: CategoryViewModel): void {
        this.category.set(category);
        this.isOpen.set(true);
        this.activeTab.set('details');
        document.body.style.overflow = 'hidden';
    }

    close(): void {
        this.isOpen.set(false);
        this.category.set(null);
        document.body.style.overflow = '';
    }

    setActiveTab(tab: 'details' | 'subcategories' | 'settings'): void {
        this.activeTab.set(tab);
    }

    getTransactionTypeColor(type: string): string {
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

    formatCurrency(amount: number | null | undefined): string {
        if (!amount) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    formatDate(date: Date | string | undefined): string {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
