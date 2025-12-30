import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CategoryViewModel } from '../../../categories/models/categories-list.models';

@Component({
    selector: 'app-category-list-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './category-list-item.html',
    styleUrls: ['./category-list-item.scss']
})
export class CategoryListItem {
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

    toggleActions(event: Event): void {
        event.stopPropagation();
        this.showActions.update(v => !v);
    }

    formatCurrency(amount: number | null | undefined): string {
        if (!amount) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
    }
}
