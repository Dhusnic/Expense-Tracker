import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ExpenseTrackerService } from '../../services/expense-tracker.service';
import {
  TransactionFormData,
  TransactionType,
  PaymentMethod,
  RecurrenceFrequency
} from '../../models/expense-tracker.models';
import { CustomValidators } from '../../validators/custom-validators';
import { interval } from 'rxjs';
interface WizardStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  completed: boolean;
  valid: boolean;
}

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.scss'
})
export class ExpenseForm implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  transaction_id = undefined;
  is_duplicated:boolean = false;
  // Form Groups
  transactionForm!: FormGroup;

  // Wizard State
  currentStep = signal<number>(1);
  totalSteps = 4;

  steps: WizardStep[] = [
    { id: 1, title: 'Transaction Type', subtitle: 'Choose transaction type', icon: 'bi-arrow-left-right', completed: false, valid: false },
    { id: 2, title: 'Basic Information', subtitle: 'Enter transaction details', icon: 'bi-info-circle', completed: false, valid: false },
    { id: 3, title: 'Payment Details', subtitle: 'Payment method & accounts', icon: 'bi-credit-card', completed: false, valid: false },
    { id: 4, title: 'Review & Submit', subtitle: 'Review your transaction', icon: 'bi-check-circle', completed: false, valid: false }
  ];

  // UI State
  isSubmitting = signal<boolean>(false);
  showCalculator = signal<boolean>(false);
  showSplitTransaction = signal<boolean>(false);
  showRecurringOptions = signal<boolean>(false);

  // Enums for template
  TransactionType = TransactionType;
  PaymentMethod = PaymentMethod;
  RecurrenceFrequency = RecurrenceFrequency;

  // Data from service
  categories = computed(() => this.expenseService.categories());
  accounts = computed(() => this.expenseService.accounts());
  upiProviders = computed(() => this.expenseService.upiProviders());
  contacts = computed(() => this.expenseService.contacts());

  // Filtered categories based on transaction type
  filteredCategories = computed(() => {
    const type = this.transactionForm?.get('step1.transactionType')?.value;
    if (!type) return [];
    return this.categories().filter(cat => cat.type === type);
  });

  // Subcategories based on selected category
  subcategories = computed(() => {
    const categoryId = this.transactionForm?.get('step2.categoryId')?.value;
    if (!categoryId) return [];
    const category = this.categories().find(cat => cat.id === categoryId);
    return category?.subcategories || [];
  });

  // Progress percentage
  progressPercentage = computed(() => {
    return ((this.currentStep() - 1) / (this.totalSteps - 1)) * 100;
  });

  // Current step validity
  currentStepValid = computed(() => {
    // Add safety check
    if (!this.transactionForm) {
      return false;
    }
    return this.isStepValid(this.currentStep());
  });

  constructor(
    public fb: FormBuilder,
    public router: Router,
    public expenseService: ExpenseTrackerService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormListeners();
    this.route.queryParams.subscribe(params => {
      // debugger;
      this.transaction_id = params['transaction_id'];

      if (this.transaction_id) {
        // Load the transaction to duplicate
        this.loadTransactionForEditing(this.transaction_id);
      }
      if(params['duplicate'] === 'true' || params['duplicate'] === true){
        this.is_duplicated = true;
      }
    });
    setTimeout(() => {
      this.transactionForm.updateValueAndValidity();
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load transaction for duplication
   */
  private loadTransactionForEditing(transactionId: string): void {
    this.expenseService.getTransaction(transactionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (transaction) => {
          this.populateForm(transaction);
          // Show a message that this is a duplicate
          console.log('Duplicating transaction:', transaction.description);
        },
        error: (error) => {
          console.error('Error loading transaction:', error);
          // Handle error - maybe redirect back
          this.router.navigate(['/expense_tracker/list']);
        }
      });
  }

  /**
   * Populate form with transaction data
   */
  private populateForm(transaction: any): void {
    // Convert date to YYYY-MM-DD format for input[type="date"]
    transaction=transaction.data;
    const transactionDate = transaction.transactionDate
      ? new Date(transaction.transactionDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const dueDate = transaction.dueDate
      ? new Date(transaction.dueDate).toISOString().split('T')[0]
      : null;

    // Step 1: Transaction Type
    this.transactionForm.get('step1')?.patchValue({
      transactionType: transaction.transactionType
    });

    // Trigger category loading based on transaction type
    this.onTransactionTypeChange(transaction.transactionType);

    // Step 2: Basic Information
    this.transactionForm.get('step2')?.patchValue({
      amount: transaction.amount,
      currency: transaction.currency || 'INR',
      transactionDate: transactionDate,
      categoryId: transaction.categoryId,
      subcategoryId: transaction.subcategoryId || null,
      description: transaction.description + ' (Copy)', // Mark as copy
      notes: transaction.notes || '',
      tags: transaction.tags || [],
      contactId: transaction.contactId || null,
      dueDate: dueDate,
      isPaid: false // Reset for duplicate
    });

    // Load subcategories if category is selected
    if (transaction.categoryId) {
      this.onCategoryChange(transaction.categoryId);
    }

    // Step 3: Payment Details
    this.transactionForm.get('step3')?.patchValue({
      paymentMethod: transaction.paymentMethod,
      fromAccountId: transaction.fromAccountId || null,
      toAccountId: transaction.toAccountId || null,
      upiProviderId: transaction.upiProviderId || null,
      upiTransactionId: '', // Clear for duplicate
      cardLastFourDigits: '', // Clear for security
      chequeNumber: '', // Clear for duplicate
      referenceNumber: '', // Clear for duplicate
      transferFee: transaction.transferFee || 0,
      createLinkedTransactions: transaction.createLinkedTransactions !== false,
      isRecurring: transaction.isRecurring || false,
      isTaxDeductible: transaction.isTaxDeductible || false,
      taxCategory: transaction.taxCategory || '',
      attachments: [], // Don't copy attachments
      splitTransactions: transaction.splitTransactions || []
    });

    // Handle recurring config if exists
    if (transaction.isRecurring && transaction.recurringConfig) {
      const config = transaction.recurringConfig;
      this.transactionForm.get('step3')?.patchValue({
        recurringFrequency: config.frequency || RecurrenceFrequency.NONE,
        recurringStartDate: config.startDate
          ? new Date(config.startDate).toISOString().split('T')[0]
          : null,
        recurringEndDate: config.endDate
          ? new Date(config.endDate).toISOString().split('T')[0]
          : null,
        recurringOccurrences: config.occurrences || null
      });
    }

    // Move to appropriate step (optional)
    this.currentStep.set(1); // Start at step 2 since type is already set
  }

  /**
 * Handle category change
 */
  private onCategoryChange(categoryId: string): void {
    // Reset subcategory when category changes
    const subcategoryControl = this.transactionForm.get('step2.subcategoryId');
    if (subcategoryControl && subcategoryControl.value) {
      // Only reset if there's already a value
      const selectedCategory = this.categories().find(cat => cat.id === categoryId);
      const hasSubcategory = selectedCategory?.subcategories?.find(
        sub => sub.id === subcategoryControl.value
      );

      // Reset if current subcategory doesn't belong to new category
      if (!hasSubcategory) {
        subcategoryControl.setValue(null);
      }
    }
  }


  // /**
  //  * Handle transaction type change
  //  */
  // private onTransactionTypeChange(type: TransactionType): void {
  //   // Your existing logic to load categories based on type
  //   this.loadCategoriesByType(type);
  // }

  // /**
  //  * Handle category change
  //  */
  // private onCategoryChange(categoryId: string): void {
  //   // Your existing logic to load subcategories
  //   this.loadSubcategories(categoryId);
  // }

  /**
   * Initialize the form with all steps
   */
  private initializeForm(): void {
    this.transactionForm = this.fb.group({
      // Step 1: Transaction Type
      step1: this.fb.group({
        transactionType: [null, [Validators.required]]
      }),

      // Step 2: Basic Information
      step2: this.fb.group({
        amount: [null, [Validators.required, CustomValidators.positiveAmount()]],
        currency: ['INR', [Validators.required]],
        transactionDate: [new Date().toISOString().split('T')[0], [Validators.required]],
        categoryId: [null, [Validators.required]],
        subcategoryId: [null],
        description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
        notes: ['', [Validators.maxLength(500)]],
        tags: [[]],

        // Debt specific fields
        contactId: [null],
        dueDate: [null],
        isPaid: [false]
      }),

      // Step 3: Payment Details
      step3: this.fb.group({
        paymentMethod: [null, [Validators.required]],
        fromAccountId: [null],
        toAccountId: [null],
        upiProviderId: [null],
        upiTransactionId: [''],
        cardLastFourDigits: ['', [Validators.pattern(/^\d{4}$/)]],
        chequeNumber: [''],
        referenceNumber: [''],

        // Transfer specific
        transferFee: [0, [Validators.min(0)]],
        createLinkedTransactions: [true],

        // Advanced features
        isRecurring: [false],
        recurringFrequency: [RecurrenceFrequency.NONE],
        recurringStartDate: [null],
        recurringEndDate: [null],
        recurringOccurrences: [null, [Validators.min(1)]],

        isTaxDeductible: [false],
        taxCategory: [''],

        attachments: [[]],
        splitTransactions: [[]]
      })
    });
  }

  /**
   * Setup form value change listeners
   */
  private setupFormListeners(): void {
    // Listen to transaction type changes
    this.transactionForm.get('step1.transactionType')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(type => {
        this.onTransactionTypeChange(type);
      });

    // Listen to payment method changes
    this.transactionForm.get('step3.paymentMethod')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(method => {
        this.onPaymentMethodChange(method);
      });

    // Listen to recurring changes
    this.transactionForm.get('step3.isRecurring')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(isRecurring => {
        this.showRecurringOptions.set(isRecurring);
        this.updateRecurringValidators(isRecurring);
      });

    // Listen to category changes to reset subcategory
    this.transactionForm.get('step2.categoryId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.transactionForm.get('step2.subcategoryId')?.setValue(null);
      });
  }

  /**
   * Handle transaction type change
   */
  private onTransactionTypeChange(type: TransactionType): void {
    const step2 = this.transactionForm.get('step2') as FormGroup;
    const step3 = this.transactionForm.get('step3') as FormGroup;

    // Reset category
    step2.get('categoryId')?.setValue(null);
    step2.get('subcategoryId')?.setValue(null);

    // Update validators based on transaction type
    if (type === TransactionType.TRANSFER) {
      // step3.get('fromAccountId')?.setValidators([Validators.required]);
      step3.get('toAccountId')?.setValidators([Validators.required]);
      step2.get('categoryId')?.clearValidators();
    } else if ([TransactionType.DEBT_GIVEN, TransactionType.DEBT_RECEIVED,
    TransactionType.DEBT_REPAYMENT, TransactionType.DEBT_COLLECTION].includes(type)) {
      step2.get('contactId')?.setValidators([Validators.required]);
      step2.get('dueDate')?.setValidators([Validators.required]);
      step3.get('fromAccountId')?.clearValidators();  // ← ADD THIS LINE
      step3.get('toAccountId')?.clearValidators();
    } else {
      step2.get('categoryId')?.setValidators([Validators.required]);
      // step3.get('fromAccountId')?.setValidators([Validators.required]);
      step3.get('toAccountId')?.clearValidators();
      step3.get('toAccountId')?.clearValidators();
      step2.get('contactId')?.clearValidators();
      step2.get('dueDate')?.clearValidators();
    }

    // Update validators
    step2.get('categoryId')?.updateValueAndValidity();
    step2.get('contactId')?.updateValueAndValidity();
    step2.get('dueDate')?.updateValueAndValidity();
    step3.get('fromAccountId')?.updateValueAndValidity();
    step3.get('toAccountId')?.updateValueAndValidity();
  }

  /**
   * Handle payment method change
   */
  private onPaymentMethodChange(method: PaymentMethod): void {
    const step3 = this.transactionForm.get('step3') as FormGroup;

    // Clear all payment-specific validators first
    step3.get('fromAccountId')?.clearValidators();
    step3.get('toAccountId')?.clearValidators();
    step3.get('upiProviderId')?.clearValidators();
    step3.get('cardLastFourDigits')?.clearValidators();
    step3.get('chequeNumber')?.clearValidators();

    // Only add validators if a payment method is actually selected
    if (!method) {
      // No payment method selected yet, don't require anything
      step3.get('fromAccountId')?.updateValueAndValidity();
      step3.get('toAccountId')?.updateValueAndValidity();
      step3.get('upiProviderId')?.updateValueAndValidity();
      step3.get('cardLastFourDigits')?.updateValueAndValidity();
      step3.get('chequeNumber')?.updateValueAndValidity();
      return;
    }

    // Add validators based on payment method
    switch (method) {
      case PaymentMethod.CASH:
      case PaymentMethod.BANK_TRANSFER:
        // step3.get('fromAccountId')?.setValidators([Validators.required]);
        break;

      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        // step3.get('fromAccountId')?.setValidators([Validators.required]);
        step3.get('cardLastFourDigits')?.setValidators([
          Validators.required,
          Validators.pattern(/^\d{4}$/)
        ]);
        break;

      case PaymentMethod.UPI:
        // step3.get('fromAccountId')?.setValidators([Validators.required]);
        step3.get('upiProviderId')?.setValidators([Validators.required]);
        break;

      case PaymentMethod.CHEQUE:
        // step3.get('fromAccountId')?.setValidators([Validators.required]);
        step3.get('chequeNumber')?.setValidators([Validators.required]);
        break;
    }

    // Update validity
    step3.get('fromAccountId')?.updateValueAndValidity();
    step3.get('toAccountId')?.updateValueAndValidity();
    step3.get('upiProviderId')?.updateValueAndValidity();
    step3.get('cardLastFourDigits')?.updateValueAndValidity();
    step3.get('chequeNumber')?.updateValueAndValidity();
  }


  /**
   * Update recurring validators
   */
  private updateRecurringValidators(isRecurring: boolean): void {
    const step3 = this.transactionForm.get('step3') as FormGroup;

    if (isRecurring) {
      step3.get('recurringFrequency')?.setValidators([Validators.required]);
      step3.get('recurringStartDate')?.setValidators([Validators.required]);
    } else {
      step3.get('recurringFrequency')?.clearValidators();
      step3.get('recurringStartDate')?.clearValidators();
      step3.get('recurringEndDate')?.clearValidators();
      step3.get('recurringOccurrences')?.clearValidators();
    }

    step3.get('recurringFrequency')?.updateValueAndValidity();
    step3.get('recurringStartDate')?.updateValueAndValidity();
    step3.get('recurringEndDate')?.updateValueAndValidity();
    step3.get('recurringOccurrences')?.updateValueAndValidity();
  }

  /**
   * Navigate to next step
   */
  nextStep(): void {
    const currentStepNumber = this.currentStep();

    // Validate current step
    if (!this.isStepValid(currentStepNumber)) {
      // Mark all fields in current step as touched to show validation errors
      const stepGroup = this.transactionForm.get(`step${currentStepNumber}`);
      if (stepGroup) {
        this.markFormGroupTouched(stepGroup as FormGroup);
      }
      return;
    }

    if (currentStepNumber < this.totalSteps) {
      this.steps[currentStepNumber - 1].completed = true;
      this.steps[currentStepNumber - 1].valid = true;
      this.currentStep.update(step => step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Recursively mark all controls in a form group as touched
   */
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }


  /**
   * Navigate to previous step
   */
  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Go to specific step
   */
  goToStep(stepNumber: number): void {
    // Can only go to completed steps or the next step
    if (stepNumber <= 1) {
      this.currentStep.set(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check if all previous steps are completed
    const allPreviousStepsCompleted = this.steps
      .slice(0, stepNumber - 1)
      .every(step => step.completed);

    if (allPreviousStepsCompleted || stepNumber <= this.currentStep()) {
      this.currentStep.set(stepNumber);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Check if step is valid
   */
  isStepValid(stepNumber: number): boolean {
    if (!this.transactionForm) {
      console.log('Form not initialized');
      return false;
    }

    const stepGroup = this.transactionForm.get(`step${stepNumber}`);

    if (!stepGroup) {
      console.log(`Step ${stepNumber} group not found`);
      return false;
    }

    // DEBUG: Log validation details
    if (stepNumber === 3 && !stepGroup.valid) {
      console.log('=== Step 3 Validation Debug ===');
      console.log('Step 3 Valid:', stepGroup.valid);
      console.log('Step 3 Status:', stepGroup.status);

      Object.keys((stepGroup as FormGroup).controls).forEach(key => {
        const control = stepGroup.get(key);

        if (control?.invalid) {
          console.log(`❌ ${key}:`, {
            value: control.value,
            errors: control.errors,
            touched: control.touched,
            dirty: control.dirty,
            validators: this.getValidatorNames(control),
            hasValidator: control.validator ? 'YES' : 'NO'
          });
        } else {
          // Also log valid fields to see the difference
          if (control?.validator) {
            console.log(`✅ ${key}:`, {
              value: control.value,
              validators: this.getValidatorNames(control)
            });
            return;
          }
        }
      });
    }

    return stepGroup.valid;
  }

  /**
   * Get validator names from a control
   */
  private getValidatorNames(control: AbstractControl): string[] {
    if (!control.validator) {
      return ['No validators'];
    }

    // Get validator result by passing empty value
    const validatorResult = control.validator(control);

    if (!validatorResult) {
      return ['Valid (no errors)'];
    }

    // Return the error keys which indicate which validators failed
    return Object.keys(validatorResult);
  }



  /**
   * Format amount with commas
   */
  formatAmount(event: any): void {
    let value = event.target.value.replace(/,/g, '');
    if (!isNaN(value) && value !== '') {
      const formatted = parseFloat(value).toLocaleString('en-IN', {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
      });
      this.transactionForm.get('step2.amount')?.setValue(parseFloat(value), { emitEvent: false });
      event.target.value = formatted;
    }
  }

  /**
   * Toggle calculator
   */
  toggleCalculator(): void {
    this.showCalculator.update(show => !show);
  }

  /**
   * Calculator button click
   */
  onCalculatorInput(value: string): void {
    const currentAmount = this.transactionForm.get('step2.amount')?.value || 0;

    if (value === 'C') {
      this.transactionForm.get('step2.amount')?.setValue(0);
    } else if (value === '=') {
      // Calculation logic can be added here
      this.showCalculator.set(false);
    } else if (['+', '-', '*', '/'].includes(value)) {
      // Store operation for calculation
    } else {
      const newAmount = parseFloat(currentAmount.toString() + value);
      this.transactionForm.get('step2.amount')?.setValue(newAmount);
    }
  }

  /**
   * Handle file upload
   */
  onFileSelect(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file: any) => {
        this.expenseService.uploadAttachment(file)
          .pipe(takeUntil(this.destroy$))
          .subscribe(response => {
            if (response.success && response.data) {
              const currentAttachments = this.transactionForm.get('step3.attachments')?.value || [];
              this.transactionForm.get('step3.attachments')?.setValue([...currentAttachments, response.data]);
            }
          });
      });
    }
  }

  /**
   * Remove attachment
   */
  removeAttachment(index: number): void {
    const attachments = this.transactionForm.get('step3.attachments')?.value || [];
    attachments.splice(index, 1);
    this.transactionForm.get('step3.attachments')?.setValue([...attachments]);
  }

  /**
   * Add split transaction
   */
  addSplitTransaction(): void {
    const splits = this.transactionForm.get('step3.splitTransactions')?.value || [];
    splits.push({
      contactId: null,
      amount: 0,
      percentage: 0,
      settled: false
    });
    this.transactionForm.get('step3.splitTransactions')?.setValue([...splits]);
  }

  /**
   * Remove split transaction
   */
  removeSplitTransaction(index: number): void {
    const splits = this.transactionForm.get('step3.splitTransactions')?.value || [];
    splits.splice(index, 1);
    this.transactionForm.get('step3.splitTransactions')?.setValue([...splits]);
  }

  /**
   * Add tag
   */
  addTag(tagInput: HTMLInputElement): void {
    const tag = tagInput.value.trim();
    if (tag) {
      const tags = this.transactionForm.get('step2.tags')?.value || [];
      if (!tags.includes(tag)) {
        this.transactionForm.get('step2.tags')?.setValue([...tags, tag]);
      }
      tagInput.value = '';
    }
  }

  /**
   * Remove tag
   */
  removeTag(tag: string): void {
    const tags = this.transactionForm.get('step2.tags')?.value || [];
    const filtered = tags.filter((t: string) => t !== tag);
    this.transactionForm.get('step2.tags')?.setValue(filtered);
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.transactionForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      const formData = this.buildTransactionData();
      // debugger;
      this.expenseService.saveTransaction(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.showSuccessMessage();
              this.router.navigate(['/expense_tracker']);
            } else {
              this.showErrorMessage(response.message || 'Failed to save transaction');
            }
            this.isSubmitting.set(false);
          },
          error: (error) => {
            this.showErrorMessage('An error occurred while saving the transaction');
            this.isSubmitting.set(false);
          }
        });
    }
  }

  /**
   * Build transaction data from form
   */
  private buildTransactionData(): TransactionFormData {
    const step1 = this.transactionForm.get('step1')?.value;
    const step2 = this.transactionForm.get('step2')?.value;
    const step3 = this.transactionForm.get('step3')?.value;

    return {
      transactionId: this.transaction_id,
      transactionType: step1.transactionType,
      amount: step2.amount,
      currency: step2.currency,
      transactionDate: new Date(step2.transactionDate),
      categoryId: step2.categoryId,
      subcategoryId: step2.subcategoryId,
      description: step2.description,
      notes: step2.notes,
      tags: step2.tags,
      contactId: step2.contactId,
      dueDate: step2.dueDate ? new Date(step2.dueDate) : undefined,
      isPaid: step2.isPaid,
      paymentMethod: step3.paymentMethod,
      fromAccountId: step3.fromAccountId,
      toAccountId: step3.toAccountId,
      upiProviderId: step3.upiProviderId,
      upiTransactionId: step3.upiTransactionId,
      cardLastFourDigits: step3.cardLastFourDigits,
      chequeNumber: step3.chequeNumber,
      referenceNumber: step3.referenceNumber,
      transferFee: step3.transferFee,
      createLinkedTransactions: step3.createLinkedTransactions,
      isRecurring: step3.isRecurring,
      recurringConfig: step3.isRecurring ? {
        frequency: step3.recurringFrequency,
        startDate: new Date(step3.recurringStartDate),
        endDate: step3.recurringEndDate ? new Date(step3.recurringEndDate) : undefined,
        occurrences: step3.recurringOccurrences
      } : undefined,
      isTaxDeductible: step3.isTaxDeductible,
      taxCategory: step3.taxCategory,
      attachments: step3.attachments,
      splitTransactions: step3.splitTransactions,
      is_duplicated : this.is_duplicated
    };
  }

  /**
   * Cancel and go back
   */
  onCancel(): void {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
      this.router.navigate(['/expense_tracker']);
    }
  }

  /**
   * Show success message
   */
  private showSuccessMessage(): void {
    // Implement your toast/notification service here
    console.log('Transaction saved successfully!');
  }

  /**
   * Show error message
   */
  private showErrorMessage(message: string): void {
    // Implement your toast/notification service here
    console.error(message);
  }

  /**
   * Get transaction type icon
   */
  getTransactionTypeIcon(type: TransactionType): string {
    const iconMap: Record<TransactionType, string> = {
      [TransactionType.INCOME]: 'bi-arrow-down-circle text-success',
      [TransactionType.EXPENSE]: 'bi-arrow-up-circle text-danger',
      [TransactionType.TRANSFER]: 'bi-arrow-left-right text-primary',
      [TransactionType.DEBT_GIVEN]: 'bi-hand-thumbs-up text-warning',
      [TransactionType.DEBT_RECEIVED]: 'bi-hand-thumbs-down text-info',
      [TransactionType.DEBT_REPAYMENT]: 'bi-cash-coin text-success',
      [TransactionType.DEBT_COLLECTION]: 'bi-wallet2 text-primary'
    };
    return iconMap[type] || 'bi-question-circle';
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
   * Get category by ID
   */
  getCategoryById(id: string) {
    return this.categories().find(cat => cat.id === id);
  }

  /**
   * Get account by ID
   */
  getAccountById(id: string) {
    return this.accounts().find(acc => acc.id === id);
  }

  /**
   * Get contact by ID
   */
  getContactById(id: string) {
    return this.contacts().find(contact => contact.id === id);
  }

  /**
   * Get UPI provider by ID
   */
  getUpiProviderById(id: string) {
    return this.upiProviders().find(provider => provider.id === id);
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

  getCurrentDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  submitTransaction(): void {
    this.onSubmit();
  }
}