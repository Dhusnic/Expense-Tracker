// login.component.ts
import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { Inject, PLATFORM_ID } from '@angular/core';
// import { NgxIntlTelInputModule } from 'ngx-intl-tel-input';
// import { SearchCountryField } from 'ngx-intl-tel-input';
import { PhoneInputComponent } from './../phone-input-component/phone-input-component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../../core/services/api.service';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent, MatDatepickerModule, MatNativeDateModule, MatFormFieldModule, MatInputModule], // Add these imports
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})


export class Login implements OnInit {
  loginForm: FormGroup;
  forgotPasswordForm: FormGroup;
  showPassword = false;
  isLoading = false;
  rememberMe = false;
  errorMessage = '';
  successMessage = '';
  showForgotPassword = false;
  authMode: any = 'login';
  signupForm!: FormGroup;
  maxDate = new Date(); // today
  minDate = new Date(1900, 0, 1);
  // SearchCountryField = SearchCountryField;
  @ViewChild('phoneComponent') phoneComponent!: PhoneInputComponent;
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.signupForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      // phoneCountryCode: ['+91', [Validators.required, Validators.pattern('^\\+\\d{1,4}$')]], // required, +1, +91 etc.
      // phoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{6,15}$')]], // required, 6-15 digits
      region: [''],
      birthdate: [
        null,
        [
          Validators.required,
          // this.minimumAgeValidator(18) // optional
        ]
      ],
      gender: ['', []],
      // companyName: ['', [Validators.required, Validators.maxLength(100)]],
      // companyDomain: ['', [Validators.required, Validators.pattern('^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
      // jobTitle: ['', [Validators.required, Validators.maxLength(50)]],
      // teamSize: ['', [Validators.required]],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }


  ngOnInit(): void {
    this.loadGoogleScript();


    // Check for saved credentials
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
      this.loginForm.patchValue({ email: savedEmail, rememberMe: true });
    }
  }

  ngAfterViewInit() {
    this.loadGoogleScript();
  }


  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  setAuthMode(mode: 'login' | 'signup' | 'forgot'): void {
    this.authMode = mode;
    this.errorMessage = '';
    this.successMessage = '';

    if (mode === 'forgot') {
      this.forgotPasswordForm.reset();
    }
  }

  get forgotEmail() {
    return this.forgotPasswordForm.get('email');
  }

  loadGoogleScript() {
    if (!isPlatformBrowser(this.platformId)) {
      return; // ✅ SSR safe
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }


  initializeGoogleSignIn(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
        callback: this.handleCredentialResponse.bind(this)
      });

      google.accounts.id.renderButton(
        document.getElementById('google-signin-button'),
        {
          theme: 'outline',
          size: 'large',
          width: 400,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        }
      );
    }
  }



  handleCredentialResponse(response: any): void {
    this.isLoading = true;
    const idToken = response.credential;

    console.log('Google ID Token:', idToken);

    // Send token to your backend
    this.sendTokenToBackend(idToken);
  }

  sendTokenToBackend(token: string): void {
    // Your API call here
    // Example:
    // this.http.post('YOUR_BACKEND_URL/auth/google', { token })
    //   .subscribe({
    //     next: (response) => {
    //       localStorage.setItem('authToken', response.token);
    //       this.router.navigate(['/dashboard']);
    //     },
    //     error: (error) => {
    //       this.errorMessage = 'Login failed. Please try again.';
    //       this.isLoading = false;
    //     }
    //   });

    setTimeout(() => {
      console.log('Token sent to backend:', token);
      this.isLoading = false;
      // this.router.navigate(['/dashboard']);
    }, 1000);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleForgotPassword(): void {
    this.setAuthMode('forgot');
  }


  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const { email, password, rememberMe } = this.loginForm.value;

    this.apiService.login({ email, password }).subscribe({
      next: () => {
        this.isLoading = false;

        // Optional: Remember email for login form convenience
        if (rememberMe) localStorage.setItem('savedEmail', email);
        else localStorage.removeItem('savedEmail');

        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.errorMessage = 'Invalid email or password.';
        this.isLoading = false;
      }
    });
  }


  onForgotPasswordSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const email = this.forgotPasswordForm.value.email;

      // Your forgot password API call here
      setTimeout(() => {
        this.successMessage = 'Password reset link has been sent to your email address.';
        this.isLoading = false;
        this.forgotPasswordForm.reset();
      }, 1500);
    } else {
      this.markFormGroupTouched(this.forgotPasswordForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  signInWithGoogle(): void { }

  loginWithGoogle(): void {
    this.loadGoogleScript();
  }

  onSignupSubmit(): void {
    if (this.signupForm.valid) {
      this.isLoading = true;

      const payload = this.signupForm.value;
      console.log('Enterprise signup payload:', payload);

      // API call here
      setTimeout(() => {
        this.isLoading = false;
        this.successMessage = 'Account created successfully. Please login.';
        this.setAuthMode('login');
      }, 1500);


      if (this.authMode == 'signup') {
        let payload = {
          username: this.signupForm.value.fullName,
          email: this.signupForm.value.email,
          password: this.signupForm.value.password,
          phone_number: this.phoneComponent.getPhoneNumber() || null,
          region: this.signupForm.value.region || null,
          birthdate: this.signupForm.value.birthdate || null,
          gender: this.signupForm.value.gender || null
        };
        console.log('Signup payload:', payload);
        this.authService.register(payload).subscribe({
          next: (response) => {
            this.isLoading = false;
            this.successMessage = 'Account created successfully. Please login.';
            this.setAuthMode('login');
          },
          error: (error) => {
            this.errorMessage = 'Signup failed. Please try again.';
            this.isLoading = false;
          }
        });
      }
    } else {
      this.markFormGroupTouched(this.signupForm);
    }
  }

}

// Add type declaration for Google
declare const google: any;
