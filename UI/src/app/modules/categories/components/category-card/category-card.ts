import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryViewModel } from '../../models/categories-list.models';

@Component({
    selector: 'app-category-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-card.html',
    styleUrls: ['./category-card.scss']
})
export class CategoryCard {
    @Input() category!: CategoryViewModel;
    @Input() isSelected = false;
    @Input() isCompact = false;
    @Input() showCheckbox = false;

    @Output() select = new EventEmitter<void>();
    @Output() view = new EventEmitter<void>();
    @Output() edit = new EventEmitter<void>();
    @Output() quickEdit = new EventEmitter<void>();
    @Output() duplicate = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();

    isHovered = signal(false);
    showActions = signal(false);

    // Computed values
    displayTransactionTypes = computed(() => {
        const types = this.category?.transactionTypes || [];
        if (this.isCompact) {
            return types.slice(0, 2);
        }
        return types.slice(0, 3);
    });

    hasMoreTypes = computed(() => {
        const types = this.category?.transactionTypes || [];
        return this.isCompact ? types.length > 2 : types.length > 3;
    });

    remainingTypesCount = computed(() => {
        const types = this.category?.transactionTypes || [];
        return this.isCompact ? types.length - 2 : types.length - 3;
    });

    onMouseEnter(): void {
        this.isHovered.set(true);
    }

    onMouseLeave(): void {
        this.isHovered.set(false);
        this.showActions.set(false);
    }

    onSelect(event: Event): void {
        event.stopPropagation();
        this.select.emit();
    }

    onView(): void {
        this.view.emit();
    }

    onEdit(event: Event): void {
        event.stopPropagation();
        this.edit.emit();
    }

    onQuickEdit(event: Event): void {
        event.stopPropagation();
        this.quickEdit.emit();
    }

    onDuplicate(event: Event): void {
        event.stopPropagation();
        this.duplicate.emit();
    }

    onDelete(event: Event): void {
        event.stopPropagation();
        this.delete.emit();
    }

    toggleActions(event: Event): void {
        event.stopPropagation();
        this.showActions.update(v => !v);
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

    getTransactionTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            'INCOME': 'bi-arrow-down-circle',
            'EXPENSE': 'bi-arrow-up-circle',
            'TRANSFER': 'bi-arrow-left-right',
            'DEBT_GIVEN': 'bi-hand-thumbs-up',
            'DEBT_RECEIVED': 'bi-hand-thumbs-down',
            'DEBT_REPAYMENT': 'bi-cash-coin',
            'DEBT_COLLECTION': 'bi-wallet2'
        };
        return icons[type] || 'bi-circle';
    }

    formatCurrency(amount: number | null | undefined): string {
        if (!amount) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    }

    getStatusBadgeClass(): string {
        return this.category?.isActive ? 'badge-success' : 'badge-secondary';
    }

    getStatusText(): string {
        return this.category?.isActive ? 'Active' : 'Inactive';
    }
}
