import { AbstractControl, ValidationErrors, ValidatorFn, FormArray } from '@angular/forms';
import { Category, Subcategory } from '../models/category.models';

export class CategoryValidators {
    /**
     * Validate category name is unique (no duplicates)
     */
    static uniqueCategoryName(existingCategories: Category[]): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }

            const categoryName = control.value.trim().toLowerCase();
            const isDuplicate = existingCategories.some(
                cat => cat.name.trim().toLowerCase() === categoryName
            );

            return isDuplicate ? { duplicateCategoryName: { value: control.value } } : null;
        };
    }

    /**
     * Validate subcategory name is unique within the same parent category
     */
    static uniqueSubcategoryName(subcategories: Subcategory[]): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }

            const subcategoryName = control.value.trim().toLowerCase();
            const isDuplicate = subcategories.some(
                sub => sub.name.trim().toLowerCase() === subcategoryName
            );

            return isDuplicate ? { duplicateSubcategoryName: { value: control.value } } : null;
        };
    }

    /**
     * Validate at least one transaction type is selected
     */
    static atLeastOneTransactionType(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!Array.isArray(value) || value.length === 0) {
                return { atLeastOneTransactionType: true };
            }

            return null;
        };
    }

    /**
     * Validate icon is selected
     */
    static iconRequired(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!value || !value.type || !value.value) {
                return { iconRequired: true };
            }

            return null;
        };
    }

    /**
     * Validate color format (hex)
     */
    static validHexColor(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }

            const hexColorPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

            return hexColorPattern.test(control.value)
                ? null
                : { invalidHexColor: { value: control.value } };
        };
    }

    /**
     * Validate budget limit is positive
     */
    static positiveBudget(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value && control.value !== 0) {
                return null;
            }

            return control.value > 0
                ? null
                : { positiveBudget: { value: control.value } };
        };
    }

    /**
     * Validate subcategories array
     */
    static validSubcategories(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const formArray = control as FormArray;

            if (!formArray || formArray.length === 0) {
                return null; // Subcategories are optional
            }

            // Check for duplicate subcategory names
            const names = formArray.controls.map(c =>
                c.get('name')?.value?.trim().toLowerCase()
            ).filter(Boolean);

            const duplicates = names.filter((name, index) => names.indexOf(name) !== index);

            if (duplicates.length > 0) {
                return { duplicateSubcategories: { duplicates } };
            }

            return null;
        };
    }

    /**
     * Validate linked accounts
     */
    static validLinkedAccounts(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;

            if (!value || !Array.isArray(value)) {
                return null;
            }

            // Check if array has unique values
            const uniqueValues = new Set(value);

            if (uniqueValues.size !== value.length) {
                return { duplicateLinkedAccounts: true };
            }

            return null;
        };
    }

    /**
     * Custom async validator for checking category name via API (optional)
     */
    static asyncUniqueCategoryName(categoryService: any): ValidatorFn {
        return (control: AbstractControl): Promise<ValidationErrors | null> => {
            if (!control.value) {
                return Promise.resolve(null);
            }

            return categoryService.checkCategoryNameExists(control.value)
                .toPromise()
                .then((exists: boolean) => {
                    return exists ? { categoryNameExists: { value: control.value } } : null;
                })
                .catch(() => null);
        };
    }

    /**
     * Validate category name format (alphanumeric with spaces and special chars)
     */
    static validCategoryName(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }

            const name = control.value.trim();

            // Must have at least one alphanumeric character
            if (!/[a-zA-Z0-9]/.test(name)) {
                return { invalidCategoryName: { value: control.value } };
            }

            // Check for excessive special characters
            const specialCharCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
            if (specialCharCount > name.length / 2) {
                return { tooManySpecialChars: { value: control.value } };
            }

            return null;
        };
    }

    /**
     * Validate minimum and maximum length
     */
    static lengthRange(min: number, max: number): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }

            const length = control.value.trim().length;

            if (length < min) {
                return { minLength: { min, actual: length } };
            }

            if (length > max) {
                return { maxLength: { max, actual: length } };
            }

            return null;
        };
    }

    /**
     * Validate tax category when tax deductible is enabled
     */
    static taxCategoryRequired(isTaxDeductibleControl: AbstractControl): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const isTaxDeductible = isTaxDeductibleControl.value;

            if (isTaxDeductible && !control.value) {
                return { taxCategoryRequired: true };
            }

            return null;
        };
    }
}
