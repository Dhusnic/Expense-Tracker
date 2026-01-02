import { Component, OnInit, OnDestroy, ViewChild, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, interval, Subscription, debounceTime, distinctUntilChanged, switchMap, takeUntil, tap, catchError, of } from 'rxjs';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { CategoryService } from '../../services/category.service';
import { Category } from '../../models/category.models';
import { TransactionType } from '../../../expense-tracker/models/expense-tracker.models';
import {
  ViewMode,
  SortField,
  SortDirection,
  DataStrategy,
  CategoryFilter,
  SortConfig,
  PaginationConfig,
  ViewConfig,
  BulkAction,
  AutoRefreshConfig,
  CategoriesListState,
  CategoryViewModel,
  LoadingState,
  EmptyStateConfig
} from '../../models/categories-list.models';

import { CategoryCard } from '../category-card/category-card';
import { CategoryListItem } from '../category-list-item/category-list-item';
import { CategoryPanelItem } from '../category-panel-item/category-panel-item';
import { CategoryFilters } from '../category-filters/category-filters';
import { CategoryDetailModal } from '../category-detail-modal/category-detail-modal';
import { CategoryQuickEditModal } from '../category-quick-edit-modal/category-quick-edit-modal';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ca } from 'intl-tel-input/i18n';
@Component({
  selector: 'app-categories-list',
  standalone: true,
  animations: [
    // Fade In
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
      ])
    ]),

    // Slide Down
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ]),

    // Slide In/Out (for toast)
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ]),

    // Stagger List
    trigger('staggerList', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger(50, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ScrollingModule,
    DragDropModule,
    CategoryCard,
    CategoryListItem,
    CategoryPanelItem,
    CategoryFilters,
    CategoryDetailModal,
    CategoryQuickEditModal
  ],
  templateUrl: './categories-list.html',
  styleUrls: ['./categories-list.scss']
})
export class CategoriesList implements OnInit, OnDestroy {
  // ViewChild references
  @ViewChild(CdkVirtualScrollViewport) virtualScroll?: CdkVirtualScrollViewport;
  @ViewChild(CategoryDetailModal) detailModal?: CategoryDetailModal;
  @ViewChild(CategoryQuickEditModal) quickEditModal?: CategoryQuickEditModal;
  // Signals for reactive state
  categories = signal<CategoryViewModel[]>([]);
  filteredCategories = signal<CategoryViewModel[]>([]);
  displayedCategories = signal<CategoryViewModel[]>([]);
  selectedCategories = signal<CategoryViewModel[]>([]);
  /**
   * Math for template
   */
  Math = Math;
  loadingState = signal<LoadingState>({
    isLoading: false,
    isRefreshing: false,
    isSaving: false,
    loadingMessage: ''
  });

  // View configuration
  viewConfig = signal<ViewConfig>({
    mode: ViewMode.CARD,
    itemsPerRow: 4,
    showIcons: true,
    showColors: true,
    showSubcategories: true,
    showBudget: true
  });

  // Filter configuration
  filter = signal<CategoryFilter>({
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

  // Sort configuration
  sort = signal<SortConfig>({
    field: SortField.SORT_ORDER,
    direction: SortDirection.ASC
  });

  // Pagination configuration
  pagination = signal<PaginationConfig>({
    currentPage: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 0
  });

  // Auto-refresh configuration
  autoRefresh = signal<AutoRefreshConfig>({
    enabled: false,
    intervalSeconds: 30
  });

  // Data strategy (computed based on total items)
  dataStrategy = computed<DataStrategy>(() => {
    const total = this.pagination().totalItems;
    if (total < 50) return DataStrategy.STANDARD;
    if (total < 500) return DataStrategy.PAGINATED;
    if (total < 5000) return DataStrategy.VIRTUAL_SCROLL;
    return DataStrategy.LAZY_LOAD;
  });

  // Computed values
  hasActiveFilters = computed(() => {
    const f = this.filter();
    return f.searchQuery !== '' ||
      f.transactionTypes.length > 0 ||
      f.isActive !== null ||
      f.hasBudgetLimit !== null ||
      f.isTaxDeductible !== null ||
      f.hasSubcategories !== null ||
      f.isDefault !== null ||
      f.createdDateFrom !== null ||
      f.createdDateTo !== null ||
      f.colors.length > 0 ||
      f.minBudget !== null ||
      f.maxBudget !== null;
  });

  hasSelectedItems = computed(() => this.selectedCategories().length > 0);

  isAllSelected = computed(() => {
    const displayed = this.displayedCategories();
    const selected = this.selectedCategories();
    return displayed.length > 0 && displayed.every(cat =>
      selected.some(sel => sel.id === cat.id)
    );
  });

  // Enums for template
  ViewMode = ViewMode;
  SortField = SortField;
  SortDirection = SortDirection;
  DataStrategy = DataStrategy;
  BulkAction = BulkAction;

  // UI state
  showFilterPanel = signal(false);
  showBulkActionsBar = computed(() => this.hasSelectedItems());
  isDraggingEnabled = signal(false);

  // Empty state
  emptyStateConfig = signal<EmptyStateConfig>({
    icon: 'bi-folder-x',
    title: 'No Categories Found',
    description: 'Get started by creating your first category to organize your transactions.',
    actionLabel: 'Create Category',
    actionRoute: '/categories/new'
  });

  // Subscriptions
  private destroy$ = new Subject<void>();
  private autoRefreshSubscription?: Subscription;
  private searchSubject = new Subject<string>();

  // Toast messages
  toastMessage = signal<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {
    // Setup search debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.filter.update(f => ({ ...f, searchQuery: query }));
      this.applyFiltersAndSort();
    });

    // Effect to update displayed categories when data changes
    effect(() => {
      const filtered = this.filteredCategories();
      const strategy = this.dataStrategy();
      const pag = this.pagination();

      let displayed: CategoryViewModel[];

      switch (strategy) {
        case DataStrategy.STANDARD:
          displayed = filtered;
          break;

        case DataStrategy.PAGINATED:
          const start = (pag.currentPage - 1) * pag.pageSize;
          const end = start + pag.pageSize;
          displayed = filtered.slice(start, end);
          break;

        case DataStrategy.VIRTUAL_SCROLL:
          // Virtual scroll handles slicing automatically
          displayed = filtered;
          break;

        case DataStrategy.LAZY_LOAD:
          // Show items up to current page * pageSize for infinite scroll
          displayed = filtered.slice(0, pag.currentPage * pag.pageSize);
          break;

        default:
          displayed = filtered;
      }

      this.displayedCategories.set(displayed);
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadStateFromLocalStorage();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoRefresh();
    this.saveStateToLocalStorage();
  }

  /**
   * Load categories from API
   */
  loadCategories(): void {
    this.loadingState.update(s => ({ ...s, isLoading: true, loadingMessage: 'Loading categories...' }));

    this.categoryService.getCategories().pipe(
      tap(response => {
        if (response.success && response.data) {
          const categories = this.mapToViewModels(response.data);
          this.categories.set(categories);

          // Update pagination
          this.pagination.update(p => ({
            ...p,
            totalItems: categories.length,
            totalPages: Math.ceil(categories.length / p.pageSize)
          }));

          this.applyFiltersAndSort();
          this.showToast('success', `Loaded ${categories.length} categories`);
        }
      }),
      catchError(error => {
        console.error('Error loading categories:', error);
        this.showToast('error', 'Failed to load categories');
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadingState.update(s => ({ ...s, isLoading: false, loadingMessage: '' }));
    });
  }

  /**
   * Refresh categories (with visual indicator)
   */
  refreshCategories(): void {
    this.loadingState.update(s => ({ ...s, isRefreshing: true }));

    this.categoryService.getCategories().pipe(
      tap(response => {
        if (response.success && response.data) {
          const categories = this.mapToViewModels(response.data);
          this.categories.set(categories);
          this.applyFiltersAndSort();
          this.showToast('info', 'Categories refreshed');
        }
      }),
      catchError(error => {
        console.error('Error refreshing categories:', error);
        this.showToast('error', 'Failed to refresh categories');
        return of(null);
      }),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadingState.update(s => ({ ...s, isRefreshing: false }));
    });
  }

  /**
   * Map categories to view models with computed properties
   */
  private mapToViewModels(categories: Category[]): CategoryViewModel[] {
    return categories.map(cat => ({
      ...cat,
      subcategoryCount: cat.subcategories?.length || 0,
      primaryTransactionType: cat.transactionTypes[0],
      colorRgba: this.hexToRgba(cat.icon.backgroundColor || '#000000', 0.15),
      isSelected: false,
      isHovered: false,
      isExpanded: false
    }));
  }

  /**
   * Apply filters and sorting
   */
  applyFiltersAndSort(): void {
    let result = [...this.categories()];

    // Apply filters
    const f = this.filter();

    // Search query
    if (f.searchQuery) {
      const query = f.searchQuery.toLowerCase();
      result = result.filter(cat =>
        cat.name.toLowerCase().includes(query) ||
        cat.description?.toLowerCase().includes(query) ||
        cat.subcategories.some(sub => sub.name.toLowerCase().includes(query))
      );
    }

    // Transaction types
    if (f.transactionTypes.length > 0) {
      result = result.filter(cat =>
        cat.transactionTypes.some(type => f.transactionTypes.includes(type))
      );
    }

    // Active status
    if (f.isActive !== null) {
      result = result.filter(cat => cat.isActive === f.isActive);
    }

    // Budget limit
    if (f.hasBudgetLimit !== null) {
      result = result.filter(cat =>
        f.hasBudgetLimit ? (cat.budgetLimit !== null && cat.budgetLimit || 0 > 0) : !cat.budgetLimit
      );
    }

    // Tax deductible
    if (f.isTaxDeductible !== null) {
      result = result.filter(cat => cat.isTaxDeductible === f.isTaxDeductible);
    }

    // Has subcategories
    if (f.hasSubcategories !== null) {
      result = result.filter(cat =>
        f.hasSubcategories ? cat.subcategoryCount > 0 : cat.subcategoryCount === 0
      );
    }

    // Is default
    if (f.isDefault !== null) {
      result = result.filter(cat => cat.isDefault === f.isDefault);
    }

    // Date range
    if (f.createdDateFrom) {
      result = result.filter(cat => new Date(cat.createdAt!) >= f.createdDateFrom!);
    }
    if (f.createdDateTo) {
      result = result.filter(cat => new Date(cat.createdAt!) <= f.createdDateTo!);
    }

    // Budget range
    if (f.minBudget !== null) {
      result = result.filter(cat => (cat.budgetLimit || 0) >= f.minBudget!);
    }
    if (f.maxBudget !== null) {
      result = result.filter(cat => (cat.budgetLimit || 0) <= f.maxBudget!);
    }

    // Colors
    if (f.colors.length > 0) {
      result = result.filter(cat => f.colors.includes(cat.icon.color || ''));
    }

    // Apply sorting
    const sortConfig = this.sort();
    result = this.sortCategories(result, sortConfig);

    this.filteredCategories.set(result);

    // Reset to first page when filters change
    this.pagination.update(p => ({ ...p, currentPage: 1 }));
  }

  /**
   * Sort categories
   */
  private sortCategories(categories: CategoryViewModel[], config: SortConfig): CategoryViewModel[] {
    return categories.sort((a, b) => {
      let comparison = 0;

      switch (config.field) {
        case SortField.NAME:
          comparison = a.name.localeCompare(b.name);
          break;
        case SortField.CREATED_DATE:
          comparison = new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime();
          break;
        case SortField.UPDATED_DATE:
          comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
          break;
        case SortField.TRANSACTION_TYPE:
          comparison = a.primaryTransactionType.localeCompare(b.primaryTransactionType);
          break;
        case SortField.BUDGET_AMOUNT:
          comparison = (a.budgetLimit || 0) - (b.budgetLimit || 0);
          break;
        case SortField.SUBCATEGORY_COUNT:
          comparison = a.subcategoryCount - b.subcategoryCount;
          break;
        case SortField.SORT_ORDER:
          comparison = a.sortOrder - b.sortOrder;
          break;
      }

      return config.direction === SortDirection.ASC ? comparison : -comparison;
    });
  }

  /**
   * Handle search input
   */
  onSearch(query: string): void {
    this.searchSubject.next(query);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.filter.update(f => ({ ...f, searchQuery: '' }));
    this.applyFiltersAndSort();
  }

  /**
   * Change view mode
   */
  changeViewMode(mode: ViewMode): void {
    this.viewConfig.update(v => ({ ...v, mode }));
  }

  /**
   * Change sort
   */
  changeSort(field: SortField): void {
    this.sort.update(s => ({
      field,
      direction: s.field === field && s.direction === SortDirection.ASC
        ? SortDirection.DESC
        : SortDirection.ASC
    }));
    this.applyFiltersAndSort();
  }

  /**
   * Apply filters from filter component
   */
  onFiltersChange(newFilter: CategoryFilter): void {
    this.filter.set(newFilter);
    this.applyFiltersAndSort();
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.filter.set({
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
    this.applyFiltersAndSort();
  }

  /**
   * Toggle filter panel
   */
  toggleFilterPanel(): void {
    this.showFilterPanel.update(v => !v);
  }

  /**
   * Change page
   */
  changePage(page: number): void {
    this.pagination.update(p => ({ ...p, currentPage: page }));
  }

  /**
   * Change page size
   */
  changePageSize(size: number): void {
    this.pagination.update(p => ({
      ...p,
      pageSize: size,
      currentPage: 1,
      totalPages: Math.ceil(p.totalItems / size)
    }));
  }

  /**
   * Toggle category selection
   */
  toggleSelection(category: CategoryViewModel): void {
    const selected = this.selectedCategories();
    const index = selected.findIndex(c => c.id === category.id);

    if (index >= 0) {
      this.selectedCategories.update(s => s.filter((_, i) => i !== index));
    } else {
      this.selectedCategories.update(s => [...s, category]);
    }
  }

  /**
   * Select all displayed categories
   */
  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedCategories.set([]);
    } else {
      this.selectedCategories.set([...this.displayedCategories()]);
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selectedCategories.set([]);
  }

  /**
   * Handle bulk action
   */
  handleBulkAction(action: BulkAction): void {
    const selected = this.selectedCategories();

    if (selected.length === 0) {
      this.showToast('info', 'No categories selected');
      return;
    }

    const confirmMessage = this.getBulkActionConfirmMessage(action, selected.length);

    if (!confirm(confirmMessage)) {
      return;
    }

    this.loadingState.update(s => ({ ...s, isSaving: true }));

    switch (action) {
      case BulkAction.DELETE:
        this.bulkDelete(selected);
        break;
      case BulkAction.ACTIVATE:
        this.bulkActivate(selected, true);
        break;
      case BulkAction.DEACTIVATE:
        this.bulkActivate(selected, false);
        break;
      case BulkAction.EXPORT:
        this.bulkExport(selected);
        break;
      case BulkAction.CHANGE_TRANSACTION_TYPE:
        // Open modal to select new transaction type
        this.openTransactionTypeChangeModal(selected);
        break;
    }
  }

  /**
   * Bulk delete
   */
  private bulkDelete(categories: CategoryViewModel[]): void {
    // Implement bulk delete logic
    const ids = categories.map(c => c.id!);

    // TODO: Call API
    setTimeout(() => {
      this.categories.update(cats => cats.filter(c => !ids.includes(c.id!)));
      this.clearSelection();
      this.applyFiltersAndSort();
      this.showToast('success', `Deleted ${categories.length} categories`);
      this.loadingState.update(s => ({ ...s, isSaving: false }));
    }, 1000);
  }

  /**
   * Bulk activate/deactivate
   */
  private bulkActivate(categories: CategoryViewModel[], activate: boolean): void {
    // Implement bulk activate logic
    const ids = categories.map(c => c.id!);

    // TODO: Call API
    setTimeout(() => {
      this.categories.update(cats => cats.map(c =>
        ids.includes(c.id!) ? { ...c, isActive: activate } : c
      ));
      this.clearSelection();
      this.applyFiltersAndSort();
      this.showToast('success', `${activate ? 'Activated' : 'Deactivated'} ${categories.length} categories`);
      this.loadingState.update(s => ({ ...s, isSaving: false }));
    }, 1000);
  }

  /**
   * Bulk export
   */
  private bulkExport(categories: CategoryViewModel[]): void {
    const data = JSON.stringify(categories, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `categories-export-${new Date().toISOString()}.json`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.showToast('success', `Exported ${categories.length} categories`);
    this.loadingState.update(s => ({ ...s, isSaving: false }));
  }

  /**
   * Open transaction type change modal
   */
  private openTransactionTypeChangeModal(categories: CategoryViewModel[]): void {
    // TODO: Implement modal
    this.loadingState.update(s => ({ ...s, isSaving: false }));
  }

  /**
   * Get bulk action confirmation message
   */
  private getBulkActionConfirmMessage(action: BulkAction, count: number): string {
    switch (action) {
      case BulkAction.DELETE:
        return `Are you sure you want to delete ${count} categories? This action cannot be undone.`;
      case BulkAction.ACTIVATE:
        return `Activate ${count} categories?`;
      case BulkAction.DEACTIVATE:
        return `Deactivate ${count} categories?`;
      case BulkAction.CHANGE_TRANSACTION_TYPE:
        return `Change transaction type for ${count} categories?`;
      default:
        return `Proceed with action for ${count} categories?`;
    }
  }

  /**
   * Handle drag and drop reorder
   */
  onDrop(event: CdkDragDrop<CategoryViewModel[]>): void {
    if (!this.isDraggingEnabled()) return;

    const items = [...this.displayedCategories()];
    moveItemInArray(items, event.previousIndex, event.currentIndex);

    // Update sort order
    items.forEach((item, index) => {
      item.sortOrder = index;
    });

    this.displayedCategories.set(items);
    this.showToast('success', 'Order updated');

    // TODO: Save order to API
  }

  /**
   * Toggle drag mode
   */
  toggleDragMode(): void {
    this.isDraggingEnabled.update(v => !v);
    if (this.isDraggingEnabled()) {
      this.showToast('info', 'Drag mode enabled - Drag to reorder');
    }
  }

  /**
   * Open category detail modal
   */
  openDetailModal(category: CategoryViewModel): void {
    this.detailModal?.open(category);
  }

  /**
   * Open quick edit modal
   */
  openQuickEditModal(category: CategoryViewModel): void {
    this.quickEditModal?.open(category);
  }

  /**
   * Navigate to create category
   */
  createCategory(): void {
    this.router.navigate(['/categories/add']);
  }

  /**
   * Navigate to edit category
   */
  editCategory(category: CategoryViewModel): void {
    debugger;
    this.router.navigate(['/categories/add'], { queryParams: { categoryId: category.categoryId } });
  }

  /**
   * Duplicate category
   */
  duplicateCategory(category: CategoryViewModel): void {
    this.router.navigate(['/categories/add'], { queryParams: { categoryId: category.categoryId, isDuplicated: true } });
  }


  /**
   * Delete category
   */
  deleteCategory(category: CategoryViewModel): void {
    if (!confirm(`Delete category "${category.name}"? This action cannot be undone.`)) return;
    this.categoryService.deleteCategory(category.id!).subscribe({
      next: () => {
        this.categories.update(cats => cats.filter(c => c.id !== category.id));
        this.applyFiltersAndSort();
        this.showToast('success', `Deleted "${category.name}"`);
      },
      error: () => {
        this.showToast('error', 'Failed to delete category');
      }
    });

    this.loadingState.update(s => ({ ...s, isSaving: true }));
    // TODO: Call API to delete
    setTimeout(() => {
      this.categories.update(cats => cats.filter(c => c.id !== category.id));
      this.applyFiltersAndSort();
      this.showToast('success', `Deleted "${category.name}"`);
      this.loadingState.update(s => ({ ...s, isSaving: false }));
    }, 1000);
  }

  /**
   * Toggle auto-refresh
   */
  toggleAutoRefresh(): void {
    this.autoRefresh.update(config => {
      const enabled = !config.enabled;

      if (enabled) {
        this.startAutoRefresh(config.intervalSeconds);
      } else {
        this.stopAutoRefresh();
      }

      return { ...config, enabled };
    });
  }

  /**
   * Start auto-refresh
   */
  private startAutoRefresh(intervalSeconds: number): void {
    this.stopAutoRefresh();

    this.autoRefreshSubscription = interval(intervalSeconds * 1000).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.refreshCategories();
    });

    this.showToast('info', `Auto-refresh enabled (every ${intervalSeconds}s)`);
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
  }

  /**
   * Save state to localStorage
   */
  private saveStateToLocalStorage(): void {
    const state: CategoriesListState = {
      viewConfig: this.viewConfig(),
      filter: this.filter(),
      sort: this.sort(),
      pagination: this.pagination(),
      selectedIds: this.selectedCategories().map(c => c.id!),
      dataStrategy: this.dataStrategy()
    };

    localStorage.setItem('categories-list-state', JSON.stringify(state));
  }

  /**
   * Load state from localStorage
   */
  private loadStateFromLocalStorage(): void {
    const saved = localStorage.getItem('categories-list-state');
    if (!saved) return;

    try {
      const state: CategoriesListState = JSON.parse(saved);

      this.viewConfig.set(state.viewConfig);
      this.filter.set(state.filter);
      this.sort.set(state.sort);
      // Don't restore pagination and selection
    } catch (error) {
      console.error('Error loading saved state:', error);
    }
  }

  /**
   * Show toast message
   */
  showToast(type: 'success' | 'error' | 'info', message: string): void {
    this.toastMessage.set({ type, message });
    setTimeout(() => this.toastMessage.set(null), 3000);
  }

  /**
   * Hex to RGBA converter
   */
  private hexToRgba(hex: string, alpha: number): string {
    // Handle rgba format
    if (hex.startsWith('rgba') || hex.startsWith('rgb')) {
      return hex;
    }

    // Convert hex to rgb
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Track by function for ngFor
   */
  trackByCategory(index: number, category: CategoryViewModel): string {
    return category.id || index.toString();
  }

  /**
* Get sort label for display
*/
  getSortLabel(field: SortField): string {
    switch (field) {
      case SortField.NAME: return 'Name';
      case SortField.CREATED_DATE: return 'Date Created';
      case SortField.UPDATED_DATE: return 'Date Updated';
      case SortField.TRANSACTION_TYPE: return 'Transaction Type';
      case SortField.BUDGET_AMOUNT: return 'Budget Amount';
      case SortField.SUBCATEGORY_COUNT: return 'Subcategory Count';
      case SortField.SORT_ORDER: return 'Custom Order';
      default: return '';
    }
  }

  /**
   * Get pagination pages to display
   */
  getPaginationPages(): number[] {
    const current = this.pagination().currentPage;
    const total = this.pagination().totalPages;
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Always show last page
      pages.push(total);
    }

    return pages;
  }

  /**
   * Get item size for virtual scroll
   */
  getItemSize(): number {
    switch (this.viewConfig().mode) {
      case ViewMode.CARD:
        return 350;
      case ViewMode.COMPACT:
        return 200;
      case ViewMode.LIST:
        return 100;
      case ViewMode.PANEL:
        return 400;
      default:
        return 350;
    }
  }

  /**
   * Handle infinite scroll
   */
  onScroll(event: any): void {
    const element = event.target;
    const atBottom = element.scrollHeight - element.scrollTop === element.clientHeight;

    if (atBottom && !this.loadingState().isRefreshing) {
      const pag = this.pagination();
      const hasMore = this.displayedCategories().length < this.filteredCategories().length;

      if (hasMore) {
        this.loadingState.update(s => ({ ...s, isRefreshing: true }));

        // Simulate loading delay
        setTimeout(() => {
          this.pagination.update(p => ({ ...p, currentPage: p.currentPage + 1 }));
          this.loadingState.update(s => ({ ...s, isRefreshing: false }));
        }, 500);
      }
    }
  }

  /**
   * Remove specific filters
   */
  removeTransactionTypeFilter(type: TransactionType): void {
    this.filter.update(f => ({
      ...f,
      transactionTypes: f.transactionTypes.filter(t => t !== type)
    }));
    this.applyFiltersAndSort();
  }

  removeStatusFilter(): void {
    this.filter.update(f => ({ ...f, isActive: null }));
    this.applyFiltersAndSort();
  }

  removeBudgetFilter(): void {
    this.filter.update(f => ({ ...f, hasBudgetLimit: null }));
    this.applyFiltersAndSort();
  }

  removeTaxFilter(): void {
    this.filter.update(f => ({ ...f, isTaxDeductible: null }));
    this.applyFiltersAndSort();
  }



}
