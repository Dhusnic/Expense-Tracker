import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import { ExpenseListService } from '../../services/expense-list.service';
import { ExpenseTrackerService } from '../../services/expense-tracker.service';
import {
  ExpenseListItem,
  FilterOptions,
  SortOptions,
  PaginationConfig,
  GroupByOption,
  ViewMode,
  BulkAction
} from '../../models/expense-list.models';
import { PaymentMethod, TransactionType } from '../../models/expense-tracker.models';

@Component({
  selector: 'app-expense-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.scss'
})
export class ExpenseList implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private autoRefreshInterval$ = new Subject<void>();

  // Enums for template
  TransactionType = TransactionType;

  // UI State
  loading = signal<boolean>(false);
  showFilters = signal<boolean>(false);
  showSummary = signal<boolean>(true);
  autoRefreshEnabled = signal<boolean>(true);
  autoRefreshCountdown = signal<number>(30);

  // Data
  transactions = signal<ExpenseListItem[]>([]);
  selectedTransactions = signal<Set<string>>(new Set());

  // View Configuration
  currentViewMode = signal<ViewMode['value']>('table');
  viewModes: ViewMode[] = [
    { value: 'table', label: 'Table View', icon: 'bi-table' },
    { value: 'card', label: 'Card View', icon: 'bi-grid-3x3' },
    { value: 'compact', label: 'Compact View', icon: 'bi-list-ul' },
    { value: 'timeline', label: 'Timeline View', icon: 'bi-clock-history' }
  ];

  // Grouping
  currentGroupBy = signal<GroupByOption['value']>('date');
  groupByOptions: GroupByOption[] = [
    { value: 'none', label: 'No Grouping' },
    { value: 'date', label: 'Group by Date' },
    { value: 'month', label: 'Group by Month' },
    { value: 'category', label: 'Group by Category' },
    { value: 'account', label: 'Group by Account' },
    { value: 'type', label: 'Group by Type' }
  ];

  // Filters
  filters = signal<Partial<FilterOptions>>({
    dateRange: {
      startDate: null,
      endDate: null,
      preset: 'thisMonth'
    },
    transactionTypes: [],
    categoryIds: [],
    accountIds: [],
    paymentMethods: [],
    amountRange: { min: null, max: null },
    tags: [],
    status: [],
    searchQuery: ''
  });

  // Sorting
  sortOptions = signal<SortOptions>({
    field: 'date',
    direction: 'desc'
  });

  // Pagination
  pagination = signal<PaginationConfig>({
    currentPage: 0,
    pageSize: 25,
    totalItems: 0,
    totalPages: 0
  });

  pageSizeOptions = [10, 25, 50, 100];

  // Summary
  summary = signal({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    pendingAmount: 0,
    recurringAmount: 0
  });

  // Bulk Actions
  bulkActions: BulkAction[] = [
    { type: 'export', label: 'Export Selected', icon: 'bi-download', confirmRequired: false },
    { type: 'markPaid', label: 'Mark as Paid', icon: 'bi-check-circle', confirmRequired: false },
    { type: 'markUnpaid', label: 'Mark as Unpaid', icon: 'bi-x-circle', confirmRequired: false },
    { type: 'delete', label: 'Delete Selected', icon: 'bi-trash', confirmRequired: true }
  ];

  // Computed
  hasSelectedTransactions = computed(() => this.selectedTransactions().size > 0);
  allSelected = computed(() =>
    this.transactions().length > 0 &&
    this.selectedTransactions().size === this.transactions().length
  );

  groupedTransactions = computed(() => {
    return this.groupTransactions(this.transactions(), this.currentGroupBy());
  });

  displayedPageNumbers = computed(() => {
    return this.calculatePageNumbers(
      this.pagination().currentPage,
      this.pagination().totalPages
    );
  });

  // Categories and Accounts for filters
  categories = computed(() => this.expenseTrackerService.categories());
  accounts = computed(() => this.expenseTrackerService.accounts());

  //Math
  Math = Math;
  constructor(
    private expenseListService: ExpenseListService,
    private expenseTrackerService: ExpenseTrackerService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadTransactions();
    this.setupAutoRefresh();
    this.applyDatePreset('thisMonth');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
  }

  /**
   * Load transactions from service
   */
  loadTransactions(): void {
    this.loading.set(true);

    this.expenseListService.getTransactions(
      this.filters(),
      this.sortOptions(),
      this.pagination()
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.transactions.set(response.transactions);
          this.pagination.set(response.pagination);
          this.summary.set(response.summary);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Error loading transactions:', error);
          this.loading.set(false);
          this.showErrorMessage('Failed to load transactions');
        }
      });
  }

  /**
   * Setup auto-refresh
   */
  private setupAutoRefresh(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$), takeUntil(this.autoRefreshInterval$))
      .subscribe(() => {
        if (!this.autoRefreshEnabled()) return;

        const countdown = this.autoRefreshCountdown();

        if (countdown <= 1) {
          this.loadTransactions();
          this.autoRefreshCountdown.set(30);
        } else {
          this.autoRefreshCountdown.set(countdown - 1);
        }
      });
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefreshEnabled.update(enabled => !enabled);

    if (this.autoRefreshEnabled()) {
      this.autoRefreshCountdown.set(30);
    }
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    this.autoRefreshInterval$.next();
  }

  /**
   * Manual refresh
   */
  refreshData(): void {
    this.autoRefreshCountdown.set(30);
    this.loadTransactions();
  }

  /**
   * Search transactions
   */
  onSearch(query: string): void {
    this.filters.update(f => ({ ...f, searchQuery: query }));
    this.pagination.update(p => ({ ...p, currentPage: 0 }));
    this.loadTransactions();
  }

  /**
   * Apply date preset
   */
  // applyDatePreset(preset: string): void {
  //   const now = new Date();
  //   let startDate: Date | null = null;
  //   let endDate: Date | null = null;

  //   switch (preset) {
  //     case 'today':
  //       startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  //       endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  //       break;
  //     case 'yesterday':
  //       startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  //       endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
  //       break;
  //     case 'thisWeek':
  //       const firstDayOfWeek = now.getDate() - now.getDay();
  //       startDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
  //       endDate = now;
  //       break;
  //     case 'lastWeek':
  //       const lastWeekStart = now.getDate() - now.getDay() - 7;
  //       const lastWeekEnd = lastWeekStart + 6;
  //       startDate = new Date(now.getFullYear(), now.getMonth(), lastWeekStart);
  //       endDate = new Date(now.getFullYear(), now.getMonth(), lastWeekEnd, 23, 59, 59);
  //       break;
  //     case 'thisMonth':
  //       startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  //       endDate = now;
  //       break;
  //     case 'lastMonth':
  //       startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  //       endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  //       break;
  //     case 'thisYear':
  //       startDate = new Date(now.getFullYear(), 0, 1);
  //       endDate = now;
  //       break;
  //     case 'all':
  //       startDate = null;
  //       endDate = null;
  //       break;
  //   }

  //   this.filters.update(f => ({
  //     ...f,
  //     dateRange: { startDate, endDate, preset: preset as any }
  //   }));

  //   this.pagination.update(p => ({ ...p, currentPage: 0 }));
  //   this.loadTransactions();
  // }

  /**
   * Apply filters
   */
  applyFilters(filters: Partial<FilterOptions>): void {
    this.filters.set(filters);
    this.pagination.update(p => ({ ...p, currentPage: 0 }));
    this.loadTransactions();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters.set({
      dateRange: { startDate: null, endDate: null },
      transactionTypes: [],
      categoryIds: [],
      accountIds: [],
      paymentMethods: [],
      amountRange: { min: null, max: null },
      tags: [],
      status: [],
      searchQuery: ''
    });
    this.pagination.update(p => ({ ...p, currentPage: 0 }));
    this.loadTransactions();
  }

  /**
   * Sort by field
   */
  sortBy(field: SortOptions['field']): void {
    this.sortOptions.update(sort => {
      if (sort.field === field) {
        return { field, direction: sort.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'desc' };
    });
    this.loadTransactions();
  }

  /**
   * Change view mode
   */
  changeViewMode(mode: ViewMode['value']): void {
    this.currentViewMode.set(mode);
  }

  /**
   * Change group by
   */
  changeGroupBy(groupBy: GroupByOption['value']): void {
    this.currentGroupBy.set(groupBy);
  }

  /**
   * Toggle summary
   */
  toggleSummary(): void {
    this.showSummary.update(show => !show);
  }

  /**
   * Toggle filters panel
   */
  toggleFilters(): void {
    this.showFilters.update(show => !show);
  }

  /**
   * Pagination - Go to page
   */
  goToPage(page: number): void {
    if (page < 0 || page >= this.pagination().totalPages) return;
    this.pagination.update(p => ({ ...p, currentPage: page }));
    this.loadTransactions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Pagination - Previous page
   */
  previousPage(): void {
    const currentPage = this.pagination().currentPage;
    if (currentPage > 0) {
      this.goToPage(currentPage - 1);
    }
  }

  /**
   * Pagination - Next page
   */
  nextPage(): void {
    const { currentPage, totalPages } = this.pagination();
    if (currentPage < totalPages - 1) {
      this.goToPage(currentPage + 1);
    }
  }

  /**
   * Change page size
   */
  changePageSize(size: number): void {
    this.pagination.update(p => ({ ...p, pageSize: size, currentPage: 0 }));
    this.loadTransactions();
  }

  /**
   * Calculate page numbers for display
   */
  private calculatePageNumbers(currentPage: number, totalPages: number): number[] {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (
      let i = Math.max(0, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    let l: number | undefined;
    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots.filter(p => typeof p === 'number') as number[];
  }

  /**
   * Select/Deselect transaction
   */
  toggleSelectTransaction(id: string): void {
    this.selectedTransactions.update(selected => {
      const newSet = new Set(selected);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  /**
   * Select/Deselect all transactions
   */
  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedTransactions.set(new Set());
    } else {
      const allIds = this.transactions().map(t => t.id);
      this.selectedTransactions.set(new Set(allIds));
    }
  }

  /**
   * Check if transaction is selected
   */
  isSelected(id: string): boolean {
    return this.selectedTransactions().has(id);
  }

  /**
   * Execute bulk action
   */
  executeBulkAction(action: BulkAction): void {
    const selectedIds = Array.from(this.selectedTransactions());

    if (selectedIds.length === 0) {
      this.showErrorMessage('Please select transactions first');
      return;
    }

    if (action.confirmRequired) {
      if (!confirm(`Are you sure you want to ${action.label.toLowerCase()} ${selectedIds.length} transaction(s)?`)) {
        return;
      }
    }

    switch (action.type) {
      case 'delete':
        this.bulkDelete(selectedIds);
        break;
      case 'export':
        this.bulkExport(selectedIds);
        break;
      case 'markPaid':
        this.bulkMarkAsPaid(selectedIds);
        break;
      case 'markUnpaid':
        this.bulkMarkAsUnpaid(selectedIds);
        break;
    }
  }

  /**
   * Bulk delete
   */
  private bulkDelete(ids: string[]): void {
    this.loading.set(true);

    this.expenseListService.bulkDeleteTransactions(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccessMessage(`${ids.length} transaction(s) deleted successfully`);
          this.selectedTransactions.set(new Set());
          this.loadTransactions();
        },
        error: (error) => {
          this.loading.set(false);
          this.showErrorMessage('Failed to delete transactions');
        }
      });
  }

  /**
   * Bulk export
   */
  private bulkExport(ids: string[]): void {
    this.loading.set(true);

    this.expenseListService.exportTransactions('csv', ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadFile(blob, `transactions_${Date.now()}.csv`);
          this.showSuccessMessage('Transactions exported successfully');
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.showErrorMessage('Failed to export transactions');
        }
      });
  }

  /**
   * Bulk mark as paid
   */
  private bulkMarkAsPaid(ids: string[]): void {
    // TODO: Implement bulk status update
    this.showSuccessMessage(`${ids.length} transaction(s) marked as paid`);
    this.selectedTransactions.set(new Set());
    this.loadTransactions();
  }

  /**
   * Bulk mark as unpaid
   */
  private bulkMarkAsUnpaid(ids: string[]): void {
    // TODO: Implement bulk status update
    this.showSuccessMessage(`${ids.length} transaction(s) marked as unpaid`);
    this.selectedTransactions.set(new Set());
    this.loadTransactions();
  }

  /**
   * View transaction details
   */
  viewDetails(transaction: ExpenseListItem): void {
    // TODO: Open modal with transaction details
    console.log('View details:', transaction);
  }

  /**
   * Edit transaction
   */
  editTransaction(transaction: ExpenseListItem): void {
    this.router.navigate(['/expense-tracker/edit', transaction.id]);
  }

  /**
   * Delete transaction
   */
  deleteTransaction(transaction: ExpenseListItem): void {
    if (!confirm(`Are you sure you want to delete "${transaction.description}"?`)) {
      return;
    }

    this.loading.set(true);

    this.expenseListService.deleteTransaction(transaction.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccessMessage('Transaction deleted successfully');
          this.loadTransactions();
        },
        error: (error) => {
          this.loading.set(false);
          this.showErrorMessage('Failed to delete transaction');
        }
      });
  }

  /**
   * Duplicate transaction
   */
  duplicateTransaction(transaction: ExpenseListItem): void {
    this.router.navigate(['/expense-tracker/new'], {
      queryParams: { duplicate: transaction.id }
    });
  }

  /**
   * Toggle favorite
   */
  toggleFavorite(transaction: ExpenseListItem, event: Event): void {
    event.stopPropagation();

    this.expenseListService.toggleFavorite(transaction.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          transaction.isFavorite = !transaction.isFavorite;
          this.showSuccessMessage(
            transaction.isFavorite ? 'Added to favorites' : 'Removed from favorites'
          );
        },
        error: () => {
          this.showErrorMessage('Failed to update favorite status');
        }
      });
  }

  /**
   * Export all transactions
   */
  exportAll(format: 'csv' | 'excel' | 'pdf'): void {
    this.loading.set(true);

    this.expenseListService.exportTransactions(format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const extension = format === 'excel' ? 'xlsx' : format;
          this.downloadFile(blob, `transactions_all_${Date.now()}.${extension}`);
          this.showSuccessMessage('Transactions exported successfully');
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.showErrorMessage('Failed to export transactions');
        }
      });
  }

  /**
   * Download file
   */
  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Group transactions
   */
  private groupTransactions(
    transactions: ExpenseListItem[],
    groupBy: GroupByOption['value']
  ): Map<string, ExpenseListItem[]> {
    const groups = new Map<string, ExpenseListItem[]>();

    if (groupBy === 'none') {
      groups.set('all', transactions);
      return groups;
    }

    transactions.forEach(transaction => {
      let key: string;

      switch (groupBy) {
        case 'date':
          key = this.formatGroupDate(transaction.transactionDate);
          break;
        case 'month':
          key = this.formatMonthYear(transaction.transactionDate);
          break;
        case 'category':
          key = this.getCategoryName(transaction.categoryId);
          break;
        case 'account':
          key = this.getAccountName(transaction.fromAccountId || transaction.toAccountId || '');
          break;
        case 'type':
          key = this.getTransactionTypeLabel(transaction.transactionType);
          break;
        default:
          key = 'Other';
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(transaction);
    });

    return groups;
  }

  /**
   * Format group date
   */
  private formatGroupDate(date: Date): string {
    const now = new Date();
    const transactionDate = new Date(date);

    const isToday = transactionDate.toDateString() === now.toDateString();
    const isYesterday = transactionDate.toDateString() === new Date(now.getTime() - 86400000).toDateString();

    if (isToday) return 'Today';
    if (isYesterday) return 'Yesterday';

    const diffDays = Math.floor((now.getTime() - transactionDate.getTime()) / 86400000);
    if (diffDays < 7) return `${diffDays} days ago`;

    return transactionDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format month year
   */
  private formatMonthYear(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  }

  /**
   * Get category name
   */
  getCategoryName(categoryId: string): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  }

  /**
   * Get account name
   */
  getAccountName(accountId: string): string {
    const account = this.accounts().find(a => a.id === accountId);
    return account?.name || 'Unknown Account';
  }

  /**
   * Get transaction type label
   */
  getTransactionTypeLabel(type: TransactionType): string {
    const labelMap: Record<TransactionType, string> = {
      [TransactionType.INCOME]: 'Income',
      [TransactionType.EXPENSE]: 'Expense',
      [TransactionType.TRANSFER]: 'Transfer',
      [TransactionType.DEBT_GIVEN]: 'Debt Given',
      [TransactionType.DEBT_RECEIVED]: 'Debt Received',
      [TransactionType.DEBT_REPAYMENT]: 'Debt Repayment',
      [TransactionType.DEBT_COLLECTION]: 'Debt Collection'
    };
    return labelMap[type] || type;
  }

  /**
   * Get transaction type icon
   */
  getTransactionTypeIcon(type: TransactionType): string {
    const iconMap: Record<TransactionType, string> = {
      [TransactionType.INCOME]: 'bi-arrow-down-circle-fill text-success',
      [TransactionType.EXPENSE]: 'bi-arrow-up-circle-fill text-danger',
      [TransactionType.TRANSFER]: 'bi-arrow-left-right text-primary',
      [TransactionType.DEBT_GIVEN]: 'bi-hand-thumbs-up-fill text-warning',
      [TransactionType.DEBT_RECEIVED]: 'bi-hand-thumbs-down-fill text-info',
      [TransactionType.DEBT_REPAYMENT]: 'bi-cash-coin text-success',
      [TransactionType.DEBT_COLLECTION]: 'bi-wallet2 text-primary'
    };
    return iconMap[type] || 'bi-question-circle';
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    const classMap: Record<string, string> = {
      'PAID': 'badge-success',
      'PENDING': 'badge-warning',
      'OVERDUE': 'badge-danger',
      'RECURRING': 'badge-info'
    };
    return classMap[status] || 'badge-secondary';
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format time
   */
  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    // TODO: Implement toast notification
    console.log('Success:', message);
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    // TODO: Implement toast notification
    console.error('Error:', message);
  }

  /**
   * Navigate to create new transaction
   */
  createNewTransaction(): void {
    this.router.navigate(['/expense_tracker/add']);
  }

  /**
 * Handle filter change (checkboxes)
 */
  onFilterChange(filterType: string, value: any, checked: boolean): void {
    this.filters.update(f => {
      const currentValues = (f as any)[filterType] || [];

      if (checked) {
        return { ...f, [filterType]: [...currentValues, value] };
      } else {
        return { ...f, [filterType]: currentValues.filter((v: any) => v !== value) };
      }
    });
  }

  /**
   * Handle amount range change
   */
  onAmountRangeChange(type: 'min' | 'max', value: string): void {
    const numValue = value ? parseFloat(value) : null;

    this.filters.update(f => ({
      ...f,
      amountRange: {
        ...f.amountRange!,
        [type]: numValue
      }
    }));
  }

  /**
   * Handle date range change
   */
  onDateRangeChange(type: 'start' | 'end', value: string): void {
    const dateValue = value ? new Date(value) : null;

    this.filters.update(f => ({
      ...f,
      dateRange: {
        ...f.dateRange!,
        [type === 'start' ? 'startDate' : 'endDate']: dateValue
      }
    }));
  }

  // Add to ExpenseListComponent class

  /**
   * Get category icon
   */
  getCategoryIcon(categoryId: string): string {
    const category = this.categories().find(c => c.id === categoryId);
    return category?.icon || 'bi-tag';
  }

  /**
   * Get payment method icon
   */
  getPaymentMethodIcon(paymentMethod: string): string {
    const iconMap: Record<string, string> = {
      [PaymentMethod.CASH]: 'bi-cash',
      [PaymentMethod.CREDIT_CARD]: 'bi-credit-card',
      [PaymentMethod.DEBIT_CARD]: 'bi-credit-card-2-front',
      [PaymentMethod.UPI]: 'bi-phone',
      [PaymentMethod.NET_BANKING]: 'bi-bank',
      [PaymentMethod.BANK_TRANSFER]: 'bi-arrow-left-right',
      [PaymentMethod.CHEQUE]: 'bi-receipt',
      [PaymentMethod.WALLET]: 'bi-wallet2'
    };
    return iconMap[paymentMethod] || 'bi-currency-dollar';
  }

  /**
   * Get relative date (e.g., "2 days ago")
   */
  getRelativeDate(date: Date): string {
    const now = new Date();
    const transactionDate = new Date(date);
    const diffInMs = now.getTime() - transactionDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  }

  /**
   * Get transaction summary text
   */
  getTransactionSummary(transaction: ExpenseListItem): string {
    const parts = [];

    if (transaction.categoryId) {
      parts.push(this.getCategoryName(transaction.categoryId));
    }

    const accountId = transaction.fromAccountId || transaction.toAccountId;
    if (accountId) {
      parts.push(this.getAccountName(accountId));
    }

    if (transaction.paymentMethod) {
      parts.push(transaction.paymentMethod);
    }

    return parts.join(' • ');
  }

  /**
   * Check if transaction is overdue
   */
  isOverdue(transaction: ExpenseListItem): boolean {
    if (transaction.status !== 'PENDING') return false;
    if (!transaction.dueDate) return false;

    return new Date(transaction.dueDate) < new Date();
  }

  /**
   * Get days until due
   */
  getDaysUntilDue(transaction: ExpenseListItem): number {
    if (!transaction.dueDate) return 0;

    const now = new Date();
    const dueDate = new Date(transaction.dueDate);
    const diffInMs = dueDate.getTime() - now.getTime();
    return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Format number with Indian numbering system
   */
  formatIndianNumber(num: number): string {
    return new Intl.NumberFormat('en-IN').format(num);
  }

  /**
   * Get transaction color class
   */
  getTransactionColorClass(transaction: ExpenseListItem): string {
    switch (transaction.transactionType) {
      case TransactionType.INCOME:
        return 'text-success';
      case TransactionType.EXPENSE:
        return 'text-danger';
      case TransactionType.TRANSFER:
        return 'text-primary';
      case TransactionType.DEBT_GIVEN:
      case TransactionType.DEBT_COLLECTION:
        return 'text-warning';
      case TransactionType.DEBT_RECEIVED:
      case TransactionType.DEBT_REPAYMENT:
        return 'text-info';
      default:
        return 'text-secondary';
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      'PAID': 'bi-check-circle-fill',
      'PENDING': 'bi-clock-fill',
      'OVERDUE': 'bi-exclamation-circle-fill',
      'RECURRING': 'bi-arrow-repeat'
    };
    return iconMap[status] || 'bi-circle';
  }

  /**
   * Can edit transaction
   */
  canEditTransaction(transaction: ExpenseListItem): boolean {
    // Add your business logic here
    return !transaction.isReconciled || transaction.status === 'PENDING';
  }

  /**
   * Can delete transaction
   */
  canDeleteTransaction(transaction: ExpenseListItem): boolean {
    // Add your business logic here
    return !transaction.isReconciled;
  }

  /**
   * Get active filters count
   */
  getActiveFiltersCount(): number {
    let count = 0;
    const f = this.filters();

    if (f.searchQuery) count++;
    if (f.transactionTypes?.length) count++;
    if (f.categoryIds?.length) count++;
    if (f.accountIds?.length) count++;
    if (f.paymentMethods?.length) count++;
    if (f.status?.length) count++;
    if (f.tags?.length) count++;
    if (f.amountRange?.min !== null || f.amountRange?.max !== null) count++;
    if (f.dateRange?.startDate || f.dateRange?.endDate) count++;

    return count;
  }

  /**
   * Export visible transactions (current page)
   */
  exportCurrentPage(): void {
    const ids = this.transactions().map(t => t.id);
    this.bulkExport(ids);
  }

  /**
   * Print transaction list
   */
  printTransactions(): void {
    window.print();
  }

  /**
   * Share transaction
   */
  shareTransaction(transaction: ExpenseListItem): void {
    if (navigator.share) {
      navigator.share({
        title: transaction.description,
        text: `Transaction: ${this.formatCurrency(transaction.amount, transaction.currency)} - ${transaction.description}`,
        url: window.location.href
      }).catch(err => console.log('Error sharing:', err));
    } else {
      // Fallback: Copy to clipboard
      const text = `${transaction.description}\nAmount: ${this.formatCurrency(transaction.amount, transaction.currency)}\nDate: ${this.formatDate(transaction.transactionDate)}`;
      navigator.clipboard.writeText(text).then(() => {
        this.showSuccessMessage('Transaction details copied to clipboard');
      });
    }
  }

  // Add this computed property to ExpenseListComponent class
  currentGroupByLabel = computed(() => {
    const option = this.groupByOptions.find(g => g.value === this.currentGroupBy());
    return option?.label || 'No Grouping';
  });

  /**
 * Apply date preset
 */
  applyDatePreset(preset: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all' | 'custom'): void {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'thisWeek':
        const firstDayOfWeek = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), firstDayOfWeek);
        endDate = now;
        break;
      case 'lastWeek':
        const lastWeekStart = now.getDate() - now.getDay() - 7;
        const lastWeekEnd = lastWeekStart + 6;
        startDate = new Date(now.getFullYear(), now.getMonth(), lastWeekStart);
        endDate = new Date(now.getFullYear(), now.getMonth(), lastWeekEnd, 23, 59, 59);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'all':
        startDate = null;
        endDate = null;
        break;
      case 'custom':
        // Don't modify dates for custom preset
        return;
    }

    this.filters.update(f => ({
      ...f,
      dateRange: { startDate, endDate, preset: preset }
    }));

    this.pagination.update(p => ({ ...p, currentPage: 0 }));
    this.loadTransactions();
  }


}
