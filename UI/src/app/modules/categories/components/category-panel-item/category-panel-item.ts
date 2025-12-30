import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryViewModel } from '../../../categories/models/categories-list.models';

@Component({
    selector: 'app-category-panel-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-panel-item.html',
    styleUrls: ['./category-panel-item.scss']
})
export class CategoryPanelItem {
    @Input() category!: CategoryViewModel;
    @Input() isSelected = false;
    @Input() showCheckbox = false;

    @Output() select = new EventEmitter<void>();
    @Output() view = new EventEmitter<void>();
    @Output() edit = new EventEmitter<void>();
    @Output() quickEdit = new EventEmitter<void>();
    @Output() duplicate = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();

    isHovered = signal(false);
    isExpanded = signal(false);
    showActions = signal(false);

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

    toggleExpand(event: Event): void {
        event.stopPropagation();
        this.isExpanded.update(v => !v);
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
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
