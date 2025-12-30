import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategoryViewModel } from '../../../categories/models/categories-list.models';
import { TransactionType } from '../../../expense-tracker/models/expense-tracker.models';
@Component({
  selector: 'app-category-quick-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-quick-edit-modal.html',
  styleUrls: ['./category-quick-edit-modal.scss']
})
export class CategoryQuickEditModal {
  isOpen = signal(false);
  category = signal<CategoryViewModel | null>(null);
  isSaving = signal(false);

  @Output() save = new EventEmitter<Partial<CategoryViewModel>>();

  // Editable fields
  editedName = signal('');
  editedDescription = signal('');
  editedIsActive = signal(true);
  editedBudgetLimit = signal<number | null>(null);
  editedIsTaxDeductible = signal(false);
  editedTransactionTypes = signal<TransactionType[]>([]);

  // Transaction type options
  TransactionType = TransactionType;
  allTransactionTypes = Object.values(TransactionType);

  open(category: CategoryViewModel): void {
    this.category.set(category);
    this.editedName.set(category.name);
    this.editedDescription.set(category.description ?? ''); // ✅ Use ?? instead of ||
    this.editedIsActive.set(category.isActive);
    this.editedBudgetLimit.set(category.budgetLimit ?? null); // ✅ Handle undefined
    this.editedIsTaxDeductible.set(category.isTaxDeductible);
    this.editedTransactionTypes.set([...category.transactionTypes]);
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden';
}

  close(): void {
    this.isOpen.set(false);
    this.category.set(null);
    this.isSaving.set(false);
    document.body.style.overflow = '';
  }

  toggleTransactionType(type: TransactionType): void {
    this.editedTransactionTypes.update(types => {
      const index = types.indexOf(type);
      if (index >= 0) {
        return types.filter(t => t !== type);
      } else {
        return [...types, type];
      }
    });
  }

  isTransactionTypeSelected(type: TransactionType): boolean {
    return this.editedTransactionTypes().includes(type);
  }

  onSave(): void {
    if (!this.validate()) {
      return;
    }

    this.isSaving.set(true);

    // ✅ Fixed all type mismatches
    const updates: Partial<CategoryViewModel> = {
      name: this.editedName(),
      description: this.editedDescription() || undefined, // ✅ Changed to undefined
      isActive: this.editedIsActive(),
      budgetLimit: this.editedBudgetLimit() ?? undefined, // ✅ Changed to undefined
      isTaxDeductible: this.editedIsTaxDeductible(),
      transactionTypes: this.editedTransactionTypes()
    };

    // Simulate API call
    setTimeout(() => {
      this.save.emit(updates);
      this.isSaving.set(false);
      this.close();
    }, 500);
  }

  validate(): boolean {
    if (!this.editedName().trim()) {
      alert('Category name is required');
      return false;
    }

    if (this.editedTransactionTypes().length === 0) {
      alert('At least one transaction type is required');
      return false;
    }

    return true;
  }

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
}
