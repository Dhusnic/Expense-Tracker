import { TransactionType } from '../../expense-tracker/models/expense-tracker.models'

/**
 * Icon Type Enum
 */
export enum IconType {
    BOOTSTRAP_ICON = 'BOOTSTRAP_ICON',
    EMOJI = 'EMOJI',
    CUSTOM_IMAGE = 'CUSTOM_IMAGE'
}

/**
 * Category Icon Interface
 */
export interface CategoryIcon {
    type: IconType;
    value: string; // Bootstrap icon class (bi-*) / Emoji character / Image URL
    color?: string; // Color for icon
    backgroundColor?: string; // Background color for icon container
}

/**
 * Subcategory Interface
 */
export interface Subcategory {
    id?: string;
    name: string;
    icon: CategoryIcon;
    description?: string;
    sortOrder: number;
    isActive: boolean;
    budgetLimit?: number;
    isTaxDeductible: boolean;
    taxCategory?: string;
    defaultAccountId?: string;
    linkedAccountIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Category Interface
 */
export interface Category {
    id?: string;
    category_id?: string;
    name: string;
    icon: CategoryIcon;
    description?: string;
    transactionTypes: TransactionType[]; // Can be one or multiple types
    subcategories: Subcategory[];
    sortOrder: number;
    isActive: boolean;
    budgetLimit?: number;
    isTaxDeductible: boolean;
    taxCategory?: string;
    isDefault: boolean;
    defaultAccountId?: string;
    linkedAccountIds: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Category Form Data (for submission)
 */
export interface CategoryFormData {
    category_id: string|undefined;
    name: string;
    icon: CategoryIcon;
    description?: string;
    transactionTypes: TransactionType[];
    subcategories: Subcategory[];
    sortOrder: number;
    isActive: boolean;
    budgetLimit?: number;
    isTaxDeductible: boolean;
    taxCategory?: string;
    isDefault: boolean;
    defaultAccountId?: string;
    linkedAccountIds: string[];
}

/**
 * API Response for Category
 */
export interface CategoryApiResponse {
    success: boolean;
    message: string;
    data?: Category[];
    errors?: string[];
}

/**
 * Bootstrap Icon Item
 */
export interface BootstrapIcon {
    name: string;
    class: string;
    category: string;
    tags: string[];
}

/**
 * Emoji Item
 */
export interface EmojiItem {
    emoji: string;
    name: string;
    category: string;
    keywords: string[];
}

/**
 * Custom Image Upload Response
 */
export interface ImageUploadResponse {
    success: boolean;
    message: string;
    data?: {
        url: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    };
}

/**
 * Subcategory Drag Drop Item
 */
export interface SubcategoryDragItem {
    subcategory: Subcategory;
    index: number;
}
