import { Component, OnInit, AfterViewInit, Input, ViewChild, ElementRef } from '@angular/core';
import intlTelInput from 'intl-tel-input';
import 'intl-tel-input/build/css/intlTelInput.css';

type CountryCode =
  | 'in'
  | 'us'
  | 'gb'
  | 'af'
  | 'al'
  | 'dz'
  | 'as'
  | 'ad'
  | 'ao'
  | 'ai'
  | 'ag'
  // … include other country codes you need
  | '';

@Component({
  selector: 'app-phone-input',
  template: `
    <div class="mb-3">
      <label class="form-label fw-semibold">{{ label }}</label>
      <input #phoneInput type="tel" class="form-control form-control-lg" [placeholder]="placeholder" />
    </div>
  `,
  standalone: true,
})
export class PhoneInputComponent implements AfterViewInit {
  @Input() label: string = 'Phone Number';
  @Input() placeholder: string = '+91 9876543210';
  @Input() region: CountryCode = 'in'; // strictly typed
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;

  phoneInstance: any;

  ngAfterViewInit() {
    this.phoneInstance = intlTelInput(this.phoneInput.nativeElement, {
      initialCountry: this.region,
      separateDialCode: true,
      autoPlaceholder: 'polite',
      nationalMode: false,
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@25.0.3/build/js/utils.js'
    } as any); // cast as any to bypass TS issues
  }

  getPhoneNumber(): string {
    return this.phoneInstance?.getNumber() || '';
  }
}
