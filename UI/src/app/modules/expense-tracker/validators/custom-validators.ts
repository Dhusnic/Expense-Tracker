import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class CustomValidators {
    /**
     * Validates that amount is greater than zero
     */
    static positiveAmount(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value;
            if (value === null || value === undefined || value === '') {
                return null;
            }
            return value > 0 ? null : { positiveAmount: { value } };
        };
    }

    /**
     * Validates that date is not in the future beyond a certain limit
     */
    static maxFutureDate(days: number): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }
            const inputDate = new Date(control.value);
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + days);

            return inputDate <= maxDate ? null : { maxFutureDate: { maxDate, actualDate: inputDate } };
        };
    }

    /**
     * Validates UPI ID format
     */
    static upiId(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }
            const upiPattern = /^[\w.-]+@[\w.-]+$/;
            return upiPattern.test(control.value) ? null : { upiId: { value: control.value } };
        };
    }

    /**
     * Validates phone number
     */
    static phoneNumber(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }
            const phonePattern = /^[+]?[\d\s()-]{10,}$/;
            return phonePattern.test(control.value) ? null : { phoneNumber: { value: control.value } };
        };
    }

    /**
     * Validates that end date is after start date
     */
    static endDateAfterStartDate(startDateField: string): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value || !control.parent) {
                return null;
            }
            const startDate = control.parent.get(startDateField)?.value;
            if (!startDate) {
                return null;
            }
            const start = new Date(startDate);
            const end = new Date(control.value);

            return end > start ? null : { endDateAfterStartDate: { startDate: start, endDate: end } };
        };
    }

    /**
     * Validates that split amounts sum up to total amount
     */
    static splitAmountTotal(totalAmountField: string): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value || !Array.isArray(control.value) || !control.parent) {
                return null;
            }
            const totalAmount = control.parent.get(totalAmountField)?.value;
            if (!totalAmount) {
                return null;
            }

            const splitSum = control.value.reduce((sum, split) => sum + (split.amount || 0), 0);
            const diff = Math.abs(totalAmount - splitSum);

            return diff < 0.01 ? null : { splitAmountTotal: { expected: totalAmount, actual: splitSum } };
        };
    }

    /**
     * Conditional required validator
     */
    static conditionalRequired(predicate: (control: AbstractControl) => boolean): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!predicate(control)) {
                return null;
            }
            return control.value ? null : { required: true };
        };
    }

    /**
     * Validates file size
     */
    static maxFileSize(maxSizeInMB: number): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }
            const file = control.value as File;
            const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

            return file.size <= maxSizeInBytes ? null : { maxFileSize: { maxSize: maxSizeInMB, actualSize: file.size } };
        };
    }

    /**
     * Validates file type
     */
    static allowedFileTypes(allowedTypes: string[]): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            if (!control.value) {
                return null;
            }
            const file = control.value as File;
            const fileType = file.type;

            return allowedTypes.includes(fileType) ? null : { allowedFileTypes: { allowed: allowedTypes, actual: fileType } };
        };
    }
}
