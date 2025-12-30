import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { CategoryService } from '../../services/category.service';
import { ExpenseTrackerService } from '../../../expense-tracker/services/expense-tracker.service';
import { CategoryValidators } from '../../validators/category.validators';
import {
  Category,
  CategoryFormData,
  CategoryIcon,
  Subcategory,
  IconType,
  BootstrapIcon,
  EmojiItem
} from '../../models/category.models';
import { TransactionType } from '../../../expense-tracker/models/expense-tracker.models';

@Component({
  selector: 'app-categories-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DragDropModule],
  templateUrl: './categories-form.html',
  styleUrl: './categories-form.scss'
})
export class CategoriesForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  expandedSubcategories = signal<Set<number>>(new Set<number>());
  // Form
  categoryForm!: FormGroup;

  // Enums for template
  TransactionType = TransactionType;
  IconType = IconType;

  // UI State
  isSubmitting = signal<boolean>(false);
  showIconPicker = signal<boolean>(false);
  showEmojiPicker = signal<boolean>(false);
  showImageUpload = signal<boolean>(false);
  currentIconTarget = signal<'category' | 'subcategory'>('category');
  currentSubcategoryIndex = signal<number>(-1);

  // Selected Icon Preview
  selectedCategoryIcon = signal<CategoryIcon | null>(null);
 
  category_id: string|undefined = undefined;

  // Transaction Types
  transactionTypes = [
    { value: TransactionType.INCOME, label: 'Income', icon: 'bi-arrow-down-circle', color: '#10b981' },
    { value: TransactionType.EXPENSE, label: 'Expense', icon: 'bi-arrow-up-circle', color: '#ef4444' },
    { value: TransactionType.TRANSFER, label: 'Transfer', icon: 'bi-arrow-left-right', color: '#3b82f6' },
    { value: TransactionType.DEBT_GIVEN, label: 'Debt Given', icon: 'bi-hand-thumbs-up', color: '#f59e0b' },
    { value: TransactionType.DEBT_RECEIVED, label: 'Debt Received', icon: 'bi-hand-thumbs-down', color: '#06b6d4' },
    { value: TransactionType.DEBT_REPAYMENT, label: 'Debt Repayment', icon: 'bi-cash-coin', color: '#8b5cf6' },
    { value: TransactionType.DEBT_COLLECTION, label: 'Debt Collection', icon: 'bi-wallet2', color: '#ec4899' }
  ];

  // All Transaction Types Selected by Default
  allTypesSelected = computed(() => {
    const selectedTypes = this.categoryForm?.get('transactionTypes')?.value || [];
    return selectedTypes.length === this.transactionTypes.length;
  });

  // Accounts (from expense tracker service)
  accounts = computed(() => this.expenseTrackerService.accounts());

  // Bootstrap Icons & Emojis (loaded from service)
  bootstrapIcons = signal<BootstrapIcon[]>([]);
  emojis = signal<EmojiItem[]>([]);

  // Search/Filter for icons and emojis
  iconSearchQuery = signal<string>('');
  emojiSearchQuery = signal<string>('');

  // Filtered icons and emojis
  filteredBootstrapIcons = computed(() => {
    const query = this.iconSearchQuery().toLowerCase();
    if (!query) return this.bootstrapIcons();

    return this.bootstrapIcons().filter(icon =>
      icon.name.toLowerCase().includes(query) ||
      icon.tags.some(tag => tag.toLowerCase().includes(query))
    );
  });

  filteredEmojis = computed(() => {
    const query = this.emojiSearchQuery().toLowerCase();
    if (!query) return this.emojis();

    return this.emojis().filter(emoji =>
      emoji.name.toLowerCase().includes(query) ||
      emoji.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  // Existing categories (for duplicate validation)
  existingCategories = signal<Category[]>([]);

  // Tax categories
  taxCategories = [
    { value: '80C', label: '80C - Investments & Insurance' },
    { value: '80D', label: '80D - Health Insurance' },
    { value: '24B', label: '24B - Home Loan Interest' },
    { value: '80G', label: '80G - Donations' },
    { value: '80E', label: '80E - Education Loan' },
    { value: 'OTHER', label: 'Other' }
  ];

  // Color presets
  colorPresets = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#22c55e', '#eab308', '#0ea5e9'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private categoryService: CategoryService,
    private expenseTrackerService: ExpenseTrackerService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadExistingCategories();
    this.loadBootstrapIcons();
    this.loadEmojis();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize the category form
   */
  private initializeForm(): void {
    this.categoryForm = this.fb.group({
      // Basic Information
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],

      // Icon
      icon: this.fb.group({
        type: [IconType.BOOTSTRAP_ICON, [Validators.required]],
        value: ['', [Validators.required]],
        color: ['#3b82f6'],
        backgroundColor: ['#eff6ff']
      }),

      // Transaction Types (All selected by default)
      transactionTypes: [
        [
          TransactionType.INCOME,
          TransactionType.EXPENSE,
          TransactionType.TRANSFER,
          TransactionType.DEBT_GIVEN,
          TransactionType.DEBT_RECEIVED,
          TransactionType.DEBT_REPAYMENT,
          TransactionType.DEBT_COLLECTION
        ],
        [Validators.required, CategoryValidators.atLeastOneTransactionType()]
      ],

      // Subcategories
      subcategories: this.fb.array([]),

      // Settings
      sortOrder: [0, [Validators.min(0)]],
      isActive: [true],
      isDefault: [false],

      // Budget & Tax
      budgetLimit: [null, [CategoryValidators.positiveBudget()]],
      isTaxDeductible: [false],
      taxCategory: [''],

      // Account Linking
      defaultAccountId: [''],
      linkedAccountIds: [[], [CategoryValidators.validLinkedAccounts()]]
    });

    // Update selected icon preview
    this.updateCategoryIconPreview();
  }

  /**
   * Setup form value change listeners
   */
  private setupFormListeners(): void {
    // Listen to icon changes
    this.categoryForm.get('icon')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.updateCategoryIconPreview();
      });

    // Listen to tax deductible changes
    this.categoryForm.get('isTaxDeductible')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(isTaxDeductible => {
        const taxCategoryControl = this.categoryForm.get('taxCategory');
        if (isTaxDeductible) {
          taxCategoryControl?.setValidators([Validators.required]);
        } else {
          taxCategoryControl?.clearValidators();
          taxCategoryControl?.setValue('');
        }
        taxCategoryControl?.updateValueAndValidity();
      });
  }

  /**
   * Get subcategories form array
   */
  get subcategoriesArray(): FormArray {
    return this.categoryForm.get('subcategories') as FormArray;
  }

  /**
   * Add new subcategory
   */
  // addSubcategory(): void {
  //   const subcategoryGroup = this.fb.group({
  //     name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  //     icon: this.fb.group({
  //       type: [IconType.BOOTSTRAP_ICON, [Validators.required]],
  //       value: ['', [Validators.required]],
  //       color: ['#3b82f6'],
  //       backgroundColor: ['#eff6ff']
  //     }),
  //     description: ['', [Validators.maxLength(500)]],
  //     sortOrder: [this.subcategoriesArray.length],
  //     isActive: [true],
  //     budgetLimit: [null, [CategoryValidators.positiveBudget()]],
  //     isTaxDeductible: [false],
  //     taxCategory: [''],
  //     defaultAccountId: [''],
  //     linkedAccountIds: [[], [CategoryValidators.validLinkedAccounts()]]
  //   });

  //   this.subcategoriesArray.push(subcategoryGroup);
  // }


  /**
 * Add new subcategory
 */
  addSubcategory(): void {
    const subcategoryGroup = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      icon: this.fb.group({
        type: [IconType.BOOTSTRAP_ICON, [Validators.required]],
        value: ['bi-circle', [Validators.required]], // ✅ ADD DEFAULT VALUE
        color: ['#3b82f6'],
        backgroundColor: ['#eff6ff']
      }),
      description: ['', [Validators.maxLength(500)]],
      sortOrder: [this.subcategoriesArray.length],
      isActive: [true],
      budgetLimit: [null, [CategoryValidators.positiveBudget()]],
      isTaxDeductible: [false],
      taxCategory: [''],
      defaultAccountId: [''],
      linkedAccountIds: [[], [CategoryValidators.validLinkedAccounts()]]
    });

    this.subcategoriesArray.push(subcategoryGroup);

    // Debug the newly added subcategory
    console.log('✅ Subcategory added:', subcategoryGroup.value);
  }


  /**
   * Remove subcategory
   */
  removeSubcategory(index: number): void {
    if (confirm('Are you sure you want to remove this subcategory?')) {
      this.subcategoriesArray.removeAt(index);
      this.reorderSubcategories();
    }
  }

  /**
   * Drag and drop subcategory reorder
   */
  dropSubcategory(event: CdkDragDrop<FormGroup[]>): void {
    const formArray = this.subcategoriesArray;
    const item = formArray.at(event.previousIndex);
    formArray.removeAt(event.previousIndex);
    formArray.insert(event.currentIndex, item);
    this.reorderSubcategories();
  }

  /**
   * Reorder subcategories after drag/drop or removal
   */
  private reorderSubcategories(): void {
    this.subcategoriesArray.controls.forEach((control, index) => {
      control.get('sortOrder')?.setValue(index);
    });
  }

  /**
   * Open icon picker modal
   */
  openIconPicker(target: 'category' | 'subcategory', subcategoryIndex: number = -1): void {
    this.currentIconTarget.set(target);
    this.currentSubcategoryIndex.set(subcategoryIndex);
    this.showIconPicker.set(true);
    this.iconSearchQuery.set('');
  }

  /**
   * Close icon picker modal
   */
  closeIconPicker(): void {
    this.showIconPicker.set(false);
  }

  /**
   * Select bootstrap icon
   */
  selectBootstrapIcon(icon: BootstrapIcon): void {
    const iconValue: CategoryIcon = {
      type: IconType.BOOTSTRAP_ICON,
      value: icon.class,
      color: this.getRandomColor(),
      backgroundColor: this.getLightColor(this.getRandomColor())
    };

    this.applySelectedIcon(iconValue);
    this.closeIconPicker();
  }

  /**
   * Open emoji picker modal
   */
  openEmojiPicker(target: 'category' | 'subcategory', subcategoryIndex: number = -1): void {
    this.currentIconTarget.set(target);
    this.currentSubcategoryIndex.set(subcategoryIndex);
    this.showEmojiPicker.set(true);
    this.emojiSearchQuery.set('');
  }

  /**
   * Close emoji picker modal
   */
  closeEmojiPicker(): void {
    this.showEmojiPicker.set(false);
  }

  /**
   * Select emoji
   */
  selectEmoji(emoji: EmojiItem): void {
    const iconValue: CategoryIcon = {
      type: IconType.EMOJI,
      value: emoji.emoji,
      color: this.getRandomColor(),
      backgroundColor: this.getLightColor(this.getRandomColor())
    };

    this.applySelectedIcon(iconValue);
    this.closeEmojiPicker();
  }

  /**
   * Open image upload modal
   */
  openImageUpload(target: 'category' | 'subcategory', subcategoryIndex: number = -1): void {
    this.currentIconTarget.set(target);
    this.currentSubcategoryIndex.set(subcategoryIndex);
    this.showImageUpload.set(true);
  }

  /**
   * Close image upload modal
   */
  closeImageUpload(): void {
    this.showImageUpload.set(false);
  }

  /**
   * Handle image file selection
   */
  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showErrorMessage('Please select a valid image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.showErrorMessage('Image size should not exceed 2MB');
      return;
    }

    // Upload image
    this.isSubmitting.set(true);
    this.categoryService.uploadCategoryIcon(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const iconValue: CategoryIcon = {
              type: IconType.CUSTOM_IMAGE,
              value: response.data.url,
              color: '#ffffff',
              backgroundColor: '#f3f4f6'
            };

            this.applySelectedIcon(iconValue);
            this.closeImageUpload();
            this.showSuccessMessage('Image uploaded successfully');
          } else {
            this.showErrorMessage(response.message || 'Failed to upload image');
          }
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.showErrorMessage('Error uploading image');
          this.isSubmitting.set(false);
        }
      });
  }

  /**
   * Apply selected icon to form
   */
  private applySelectedIcon(iconValue: CategoryIcon): void {
    if (this.currentIconTarget() === 'category') {
      this.categoryForm.get('icon')?.patchValue(iconValue);
    } else {
      const index = this.currentSubcategoryIndex();
      if (index >= 0) {
        this.subcategoriesArray.at(index).get('icon')?.patchValue(iconValue);
      }
    }
  }

  /**
   * Update category icon preview
   */
  private updateCategoryIconPreview(): void {
    const iconValue = this.categoryForm.get('icon')?.value;
    this.selectedCategoryIcon.set(iconValue);
  }

  /**
   * Get subcategory icon
   */
  getSubcategoryIcon(index: number): CategoryIcon | null {
    return this.subcategoriesArray.at(index).get('icon')?.value;
  }

  /**
   * Toggle select all transaction types
   */
  toggleSelectAllTypes(): void {
    const selectedTypes = this.categoryForm.get('transactionTypes')?.value || [];

    if (selectedTypes.length === this.transactionTypes.length) {
      // Deselect all
      this.categoryForm.get('transactionTypes')?.setValue([]);
    } else {
      // Select all
      const allTypes = this.transactionTypes.map(t => t.value);
      this.categoryForm.get('transactionTypes')?.setValue(allTypes);
    }
  }

  /**
   * Toggle individual transaction type
   */
  toggleTransactionType(type: TransactionType): void {
    const selectedTypes = this.categoryForm.get('transactionTypes')?.value || [];
    const index = selectedTypes.indexOf(type);

    if (index >= 0) {
      selectedTypes.splice(index, 1);
    } else {
      selectedTypes.push(type);
    }

    this.categoryForm.get('transactionTypes')?.setValue([...selectedTypes]);
  }

  /**
   * Check if transaction type is selected
   */
  isTransactionTypeSelected(type: TransactionType): boolean {
    const selectedTypes = this.categoryForm.get('transactionTypes')?.value || [];
    return selectedTypes.includes(type);
  }

  /**
   * Toggle linked account
   */
  toggleLinkedAccount(accountId: string): void {
    const linkedAccounts = this.categoryForm.get('linkedAccountIds')?.value || [];
    const index = linkedAccounts.indexOf(accountId);

    if (index >= 0) {
      linkedAccounts.splice(index, 1);
    } else {
      linkedAccounts.push(accountId);
    }

    this.categoryForm.get('linkedAccountIds')?.setValue([...linkedAccounts]);
  }

  /**
   * Check if account is linked
   */
  isAccountLinked(accountId: string): boolean {
    const linkedAccounts = this.categoryForm.get('linkedAccountIds')?.value || [];
    return linkedAccounts.includes(accountId);
  }

  /**
   * Select color for category icon
   */
  selectColor(color: string): void {
    this.categoryForm.get('icon.color')?.setValue(color);
    this.categoryForm.get('icon.backgroundColor')?.setValue(this.getLightColor(color));
  }

  /**
   * Select color for subcategory icon
   */
  selectSubcategoryColor(index: number, color: string): void {
    this.subcategoriesArray.at(index).get('icon.color')?.setValue(color);
    this.subcategoriesArray.at(index).get('icon.backgroundColor')?.setValue(this.getLightColor(color));
  }

  /**
   * Get light version of color for background
   */
  private getLightColor(hexColor: string): string {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Make it lighter (add alpha or lighten)
    return `rgba(${r}, ${g}, ${b}, 0.15)`;
  }

  /**
   * Get random color from presets
   */
  private getRandomColor(): string {
    return this.colorPresets[Math.floor(Math.random() * this.colorPresets.length)];
  }

  /**
   * Load existing categories for validation
   */
  private loadExistingCategories(): void {
    this.categoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.existingCategories.set(Array.isArray(response.data) ? response.data : []);
          }
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        }
      });
  }

  /**
   * Load Bootstrap icons
   */
  private loadBootstrapIcons(): void {
    this.categoryService.getBootstrapIcons()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (icons) => {
          this.bootstrapIcons.set(icons);
        },
        error: (error) => {
          console.error('Error loading bootstrap icons:', error);
          // Fallback to default icons
          this.bootstrapIcons.set(this.getDefaultBootstrapIcons());
        }
      });
  }

  /**
   * Load Emojis
   */
  private loadEmojis(): void {
    this.categoryService.getEmojis()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (emojis) => {
          this.emojis.set(emojis);
        },
        error: (error) => {
          console.error('Error loading emojis:', error);
          // Fallback to default emojis
          this.emojis.set(this.getDefaultEmojis());
        }
      });
  }

  /**
   * Submit form
   */
  // onSubmit(): void {
  //   if (this.categoryForm.invalid) {
  //     this.markFormGroupTouched(this.categoryForm);
  //     this.showErrorMessage('Please fill in all required fields correctly');
  //     return;
  //   }

  //   // Check for duplicate category name
  //   const categoryName = this.categoryForm.get('name')?.value?.trim();
  //   const isDuplicate = this.existingCategories().some(
  //     cat => cat.name.trim().toLowerCase() === categoryName.toLowerCase()
  //   );

  //   if (isDuplicate) {
  //     this.showErrorMessage('A category with this name already exists');
  //     this.categoryForm.get('name')?.setErrors({ duplicate: true });
  //     return;
  //   }

  //   // Check for duplicate subcategory names
  //   const subcategoryNames = this.subcategoriesArray.controls.map(
  //     control => control.get('name')?.value?.trim().toLowerCase()
  //   );
  //   const duplicateSubcategories = subcategoryNames.filter(
  //     (name, index) => subcategoryNames.indexOf(name) !== index
  //   );

  //   if (duplicateSubcategories.length > 0) {
  //     this.showErrorMessage('Duplicate subcategory names found');
  //     return;
  //   }

  //   this.isSubmitting.set(true);

  //   const formData: CategoryFormData = this.buildCategoryFormData();

  //   this.categoryService.saveCategory(formData)
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (response) => {
  //         if (response.success) {
  //           this.showSuccessMessage('Category created successfully');
  //           this.router.navigate(['/expense-tracker/categories']);
  //         } else {
  //           this.showErrorMessage(response.message || 'Failed to create category');
  //         }
  //         this.isSubmitting.set(false);
  //       },
  //       error: (error) => {
  //         this.showErrorMessage('An error occurred while creating category');
  //         this.isSubmitting.set(false);
  //       }
  //     });
  // }

  /**
 * Submit form
 */
  onSubmit(): void {
    // Debug validation
    this.debugFormValidation();

    if (this.categoryForm.invalid) {
      this.markFormGroupTouched(this.categoryForm);

      // Get detailed error messages
      const allErrors = this.getAllFormErrors(this.categoryForm);
      const errorMessages = this.getValidationErrorMessages(allErrors);

      // Show detailed error message
      const errorSummary = errorMessages.length > 0
        ? `Please fix the following errors:\n\n${errorMessages.join('\n')}`
        : 'Please fill in all required fields correctly';

      this.showErrorMessage(errorSummary);

      // Also log to console for development
      console.error('❌ Form Validation Failed');
      console.table(errorMessages);

      return;
    }

    // Check for duplicate category name
    const categoryName = this.categoryForm.get('name')?.value?.trim();
    const isDuplicate = this.existingCategories().some(
      cat => cat.name.trim().toLowerCase() === categoryName.toLowerCase()
    );

    if (isDuplicate) {
      this.showErrorMessage('A category with this name already exists');
      this.categoryForm.get('name')?.setErrors({ duplicate: true });
      return;
    }

    // Check for duplicate subcategory names
    const subcategoryNames = this.subcategoriesArray.controls.map(
      control => control.get('name')?.value?.trim().toLowerCase()
    );
    const duplicateSubcategories = subcategoryNames.filter(
      (name, index) => subcategoryNames.indexOf(name) !== index
    );

    if (duplicateSubcategories.length > 0) {
      this.showErrorMessage('Duplicate subcategory names found');
      return;
    }

    this.isSubmitting.set(true);

    const formData: CategoryFormData = this.buildCategoryFormData();
    debugger;
    this.categoryService.saveCategory(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.showSuccessMessage('Category created successfully');
            this.router.navigate(['/api/categories']);
          } else {
            this.showErrorMessage(response.message || 'Failed to create category');
          }
          this.isSubmitting.set(false);
        },
        error: (error) => {
          this.showErrorMessage('An error occurred while creating category');
          this.isSubmitting.set(false);
        }
      });
  }

  /**
   * Build category form data for submission
   */
  private buildCategoryFormData(): CategoryFormData {
    const formValue = this.categoryForm.value;

    return {
      category_id: this.category_id,
      name: formValue.name?.trim(),
      icon: formValue.icon,
      description: formValue.description?.trim(),
      transactionTypes: formValue.transactionTypes,
      subcategories: formValue.subcategories.map((sub: any) => ({
        name: sub.name?.trim(),
        icon: sub.icon,
        description: sub.description?.trim(),
        sortOrder: sub.sortOrder,
        isActive: sub.isActive,
        budgetLimit: sub.budgetLimit,
        isTaxDeductible: sub.isTaxDeductible,
        taxCategory: sub.taxCategory,
        defaultAccountId: sub.defaultAccountId,
        linkedAccountIds: sub.linkedAccountIds
      })),
      sortOrder: formValue.sortOrder,
      isActive: formValue.isActive,
      budgetLimit: formValue.budgetLimit,
      isTaxDeductible: formValue.isTaxDeductible,
      taxCategory: formValue.taxCategory,
      isDefault: formValue.isDefault,
      defaultAccountId: formValue.defaultAccountId,
      linkedAccountIds: formValue.linkedAccountIds
    };
  }

  /**
   * Mark all form controls as touched
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          }
        });
      }
    });
  }

  /**
   * Reset form
   */
  resetForm(): void {
    if (confirm('Are you sure you want to reset the form? All unsaved changes will be lost.')) {
      this.categoryForm.reset();
      this.subcategoriesArray.clear();
      this.initializeForm();
    }
  }

  /**
   * Cancel and navigate back
   */
  onCancel(): void {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      this.router.navigate(['/expense-tracker/categories']);
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(message: string): void {
    // TODO: Implement toast notification
    console.log('Success:', message);
    alert(message);
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    // TODO: Implement toast notification
    console.error('Error:', message);
    alert(message);
  }

  /**
   * Get default Bootstrap icons (fallback)
   */
  private getDefaultBootstrapIcons(): BootstrapIcon[] {
    return [
      { name: 'Wallet', class: 'bi-wallet2', category: 'Finance', tags: ['money', 'payment'] },
      { name: 'Cash', class: 'bi-cash-coin', category: 'Finance', tags: ['money', 'currency'] },
      { name: 'Cart', class: 'bi-cart', category: 'Shopping', tags: ['buy', 'shop'] },
      { name: 'Food', class: 'bi-cup-straw', category: 'Food', tags: ['drink', 'beverage'] },
      { name: 'Car', class: 'bi-car-front', category: 'Transport', tags: ['vehicle', 'drive'] },
      { name: 'House', class: 'bi-house-door', category: 'Home', tags: ['building', 'property'] }
    ];
  }

  /**
   * Get default emojis (fallback)
   */
  private getDefaultEmojis(): EmojiItem[] {
    return [
      { emoji: '💰', name: 'Money Bag', category: 'Finance', keywords: ['money', 'cash', 'wealth'] },
      { emoji: '🍕', name: 'Pizza', category: 'Food', keywords: ['food', 'eat', 'meal'] },
      { emoji: '🚗', name: 'Car', category: 'Transport', keywords: ['vehicle', 'drive', 'transport'] },
      { emoji: '🏠', name: 'House', category: 'Home', keywords: ['home', 'building', 'property'] },
      { emoji: '🎬', name: 'Movie', category: 'Entertainment', keywords: ['cinema', 'film', 'entertainment'] },
      { emoji: '💊', name: 'Medicine', category: 'Health', keywords: ['health', 'medical', 'drug'] }
    ];
  }

  /**
 * Get all form validation errors recursively
 */
  private getAllFormErrors(form: FormGroup | FormArray): any {
    let errors: any = {};

    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);

      if (control instanceof FormGroup || control instanceof FormArray) {
        // Recursive call for nested forms
        const nestedErrors = this.getAllFormErrors(control);
        if (Object.keys(nestedErrors).length > 0) {
          errors[key] = nestedErrors;
        }
      } else {
        // Get errors for FormControl
        if (control?.errors) {
          errors[key] = control.errors;
        }
      }
    });

    return errors;
  }

  /**
   * Get detailed validation error messages
   */
  private getValidationErrorMessages(errors: any, path: string = ''): string[] {
    const messages: string[] = [];

    Object.keys(errors).forEach(key => {
      const error = errors[key];
      const fullPath = path ? `${path}.${key}` : key;

      if (error && typeof error === 'object' && !Array.isArray(error)) {
        // Check if it's an actual error object or nested form errors
        if (error.required !== undefined ||
          error.minlength !== undefined ||
          error.maxlength !== undefined ||
          error.min !== undefined ||
          error.max !== undefined ||
          error.email !== undefined ||
          error.pattern !== undefined ||
          error.duplicate !== undefined ||
          error.positiveBudget !== undefined ||
          error.atLeastOneTransactionType !== undefined ||
          error.validLinkedAccounts !== undefined) {

          // It's an actual error object
          messages.push(this.formatValidationError(fullPath, error));
        } else {
          // It's nested form errors, recurse
          messages.push(...this.getValidationErrorMessages(error, fullPath));
        }
      }
    });

    return messages;
  }

  /**
   * Format validation error into readable message
   */
  private formatValidationError(fieldPath: string, errors: any): string {
    const fieldName = this.formatFieldName(fieldPath);

    if (errors.required) {
      return `❌ ${fieldName} is required`;
    }

    if (errors.minlength) {
      return `❌ ${fieldName} must be at least ${errors.minlength.requiredLength} characters (current: ${errors.minlength.actualLength})`;
    }

    if (errors.maxlength) {
      return `❌ ${fieldName} must be at most ${errors.maxlength.requiredLength} characters (current: ${errors.maxlength.actualLength})`;
    }

    if (errors.min) {
      return `❌ ${fieldName} must be at least ${errors.min.min} (current: ${errors.min.actual})`;
    }

    if (errors.max) {
      return `❌ ${fieldName} must be at most ${errors.max.max} (current: ${errors.max.actual})`;
    }

    if (errors.email) {
      return `❌ ${fieldName} must be a valid email address`;
    }

    if (errors.pattern) {
      return `❌ ${fieldName} has invalid format`;
    }

    if (errors.duplicate) {
      return `❌ ${fieldName} already exists`;
    }

    if (errors.positiveBudget) {
      return `❌ ${fieldName} must be a positive number`;
    }

    if (errors.atLeastOneTransactionType) {
      return `❌ At least one transaction type must be selected`;
    }

    if (errors.validLinkedAccounts) {
      return `❌ ${fieldName} contains invalid account IDs`;
    }

    // Generic error message for unknown validators
    return `❌ ${fieldName} is invalid: ${JSON.stringify(errors)}`;
  }

  /**
   * Format field path into readable field name
   */
  private formatFieldName(path: string): string {
    // Convert camelCase to Title Case and handle array indices
    const parts = path.split('.');

    return parts.map((part, index) => {
      // Handle array indices like "subcategories.0.name"
      if (!isNaN(Number(part))) {
        return `[${Number(part) + 1}]`; // Convert 0-based to 1-based for display
      }

      // Convert camelCase to Title Case
      const formatted = part
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
        .trim();

      // Special case mappings
      const specialCases: { [key: string]: string } = {
        'transactionTypes': 'Transaction Types',
        'subcategories': 'Subcategory',
        'isActive': 'Active Status',
        'isTaxDeductible': 'Tax Deductible',
        'taxCategory': 'Tax Category',
        'budgetLimit': 'Budget Limit',
        'defaultAccountId': 'Default Account',
        'linkedAccountIds': 'Linked Accounts',
        'sortOrder': 'Sort Order',
        'isDefault': 'Default Category',
        'backgroundColor': 'Background Color'
      };

      return specialCases[part] || formatted;
    }).join(' → ');
  }

  /**
   * Debug form validation and show detailed errors
   */
  private debugFormValidation(): void {
    console.group('🔍 Form Validation Debug');

    // Check form validity
    console.log('Form Valid:', this.categoryForm.valid);
    console.log('Form Invalid:', this.categoryForm.invalid);
    console.log('Form Touched:', this.categoryForm.touched);
    console.log('Form Dirty:', this.categoryForm.dirty);

    // Get all errors
    const allErrors = this.getAllFormErrors(this.categoryForm);
    console.log('All Form Errors:', allErrors);

    // Get error messages
    const errorMessages = this.getValidationErrorMessages(allErrors);

    if (errorMessages.length > 0) {
      console.log('📋 Validation Errors:');
      errorMessages.forEach(msg => console.log(msg));
    } else {
      console.log('✅ No validation errors found');
    }

    // Log individual control states
    console.group('📝 Control States');
    this.logControlState('name', this.categoryForm.get('name'));
    this.logControlState('description', this.categoryForm.get('description'));
    this.logControlState('icon', this.categoryForm.get('icon'));
    this.logControlState('transactionTypes', this.categoryForm.get('transactionTypes'));
    this.logControlState('sortOrder', this.categoryForm.get('sortOrder'));
    this.logControlState('budgetLimit', this.categoryForm.get('budgetLimit'));
    this.logControlState('isTaxDeductible', this.categoryForm.get('isTaxDeductible'));
    this.logControlState('taxCategory', this.categoryForm.get('taxCategory'));

    // Log subcategories
    if (this.subcategoriesArray.length > 0) {
      console.group('📦 Subcategories');
      this.subcategoriesArray.controls.forEach((control, index) => {
        console.log(`Subcategory ${index + 1}:`, {
          valid: control.valid,
          invalid: control.invalid,
          errors: this.getAllFormErrors(control as FormGroup)
        });
      });
      console.groupEnd();
    }

    console.groupEnd();
    console.groupEnd();
  }

  /**
   * Log individual control state
   */
  private logControlState(name: string, control: any): void {
    if (control) {
      console.log(`${name}:`, {
        value: control.value,
        valid: control.valid,
        invalid: control.invalid,
        touched: control.touched,
        dirty: control.dirty,
        errors: control.errors
      });
    }
  }

  toggleSubcategoryAccordion(index: number): void {
    const expanded = new Set(this.expandedSubcategories());

    if (expanded.has(index)) {
      expanded.delete(index);
    } else {
      expanded.add(index);
    }

    this.expandedSubcategories.set(expanded);
  }

  /**
   * Check if subcategory accordion is expanded
   */
  isSubcategoryExpanded(index: number): boolean {
    return this.expandedSubcategories().has(index);
  }

  /**
 * Get subcategory FormGroup (with proper type casting)
 */
  getSubcategoryFormGroup(index: number): FormGroup {
    return this.subcategoriesArray.at(index) as FormGroup;
  }

  
}
