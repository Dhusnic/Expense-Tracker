import { Category } from '../models/category.models';
import { TransactionType } from '../../../modules/expense-tracker/models/expense-tracker.models';

/**
 * View mode types
 */
export enum ViewMode {
    CARD = 'CARD',
    LIST = 'LIST',
    COMPACT = 'COMPACT',
    PANEL = 'PANEL'
}

/**
 * Sort field options
 */
export enum SortField {
    NAME = 'NAME',
    CREATED_DATE = 'CREATED_DATE',
    UPDATED_DATE = 'UPDATED_DATE',
    TRANSACTION_TYPE = 'TRANSACTION_TYPE',
    BUDGET_AMOUNT = 'BUDGET_AMOUNT',
    SUBCATEGORY_COUNT = 'SUBCATEGORY_COUNT',
    SORT_ORDER = 'SORT_ORDER'
}

/**
 * Sort direction
 */
export enum SortDirection {
    ASC = 'ASC',
    DESC = 'DESC'
}

/**
 * Data loading strategy based on count
 */
export enum DataStrategy {
    STANDARD = 'STANDARD',        // < 50 items: Normal rendering
    PAGINATED = 'PAGINATED',      // 50-500: Pagination
    VIRTUAL_SCROLL = 'VIRTUAL_SCROLL', // 500-5000: Virtual scroll
    LAZY_LOAD = 'LAZY_LOAD'       // 5000+: Infinite scroll + lazy load
}

/**
 * Filter configuration
 */
export interface CategoryFilter {
    searchQuery: string;
    transactionTypes: TransactionType[];
    isActive: boolean | null;
    hasBudgetLimit: boolean | null;
    isTaxDeductible: boolean | null;
    hasSubcategories: boolean | null;
    isDefault: boolean | null;
    createdDateFrom: Date | null;
    createdDateTo: Date | null;
    colors: string[];
    minBudget: number | null;
    maxBudget: number | null;
}

/**
 * Sort configuration
 */
export interface SortConfig {
    field: SortField;
    direction: SortDirection;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
}

/**
 * View configuration
 */
export interface ViewConfig {
    mode: ViewMode;
    itemsPerRow: number;
    showIcons: boolean;
    showColors: boolean;
    showSubcategories: boolean;
    showBudget: boolean;
}

/**
 * Bulk action types
 */
export enum BulkAction {
    DELETE = 'DELETE',
    ACTIVATE = 'ACTIVATE',
    DEACTIVATE = 'DEACTIVATE',
    EXPORT = 'EXPORT',
    CHANGE_TRANSACTION_TYPE = 'CHANGE_TRANSACTION_TYPE'
}

/**
 * Auto-refresh configuration
 */
export interface AutoRefreshConfig {
    enabled: boolean;
    intervalSeconds: number;
}

/**
 * List state (for save/restore)
 */
export interface CategoriesListState {
    viewConfig: ViewConfig;
    filter: CategoryFilter;
    sort: SortConfig;
    pagination: PaginationConfig;
    selectedIds: string[];
    dataStrategy: DataStrategy;
}

/**
 * Category with computed properties
 */
export interface CategoryViewModel extends Category {
    category_id?: string;
    // Computed properties
    subcategoryCount: number;
    primaryTransactionType: TransactionType;
    budgetProgress?: number;
    isOverBudget?: boolean;
    colorRgba: string;
    
    // UI state
    isSelected: boolean;
    isHovered: boolean;
    isExpanded: boolean;
}

export interface CategoriesListResponse {
    data: Category[];
    length: number;
}
/**
 * Loading state
 */
export interface LoadingState {
    isLoading: boolean;
    isRefreshing: boolean;
    isSaving: boolean;
    loadingMessage: string;
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
    icon: string;
    title: string;
    description: string;
    actionLabel: string;
    actionRoute: string;
}
