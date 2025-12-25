// login.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], // Add these imports
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
  constructor(
    private fb: FormBuilder,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false]
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.signupForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      companyName: ['', Validators.required],
      companyDomain: ['', Validators.required],
      jobTitle: ['', Validators.required],
      teamSize: ['', Validators.required],
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

  loadGoogleScript(): void {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      this.initializeGoogleSignIn();
    };
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
    if (this.loginForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const { email, password, rememberMe } = this.loginForm.value;

      // Your authentication API call here
      setTimeout(() => {
        if (rememberMe) {
          localStorage.setItem('savedEmail', email);
        } else {
          localStorage.removeItem('savedEmail');
        }

        this.isLoading = false;
        // this.router.navigate(['/dashboard']);
      }, 1500);
    } else {
      this.markFormGroupTouched(this.loginForm);
    }
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

  signInWithGoogle(): void {}

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
    } else {
      this.markFormGroupTouched(this.signupForm);
    }
  }

}

// Add type declaration for Google
declare const google: any;
