import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timer } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

export interface LoginResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;  // Temporary storage in localStorage for now
  expires_in: number;      // in seconds
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  /** access_token in memory */
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  public accessToken$ = this.accessTokenSubject.asObservable();

  /** Optional timer for auto logout */
  private logoutTimer: any;

  constructor(private http: HttpClient, private router: Router) { }

  /** ------------------ Authentication ------------------ */

  login(payload: { email: string; password: string }): Observable<LoginResponse | null> {
    // Already authenticated → skip API call
    if (this.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
      return new Observable(observer => {
        observer.next(null);
        observer.complete();
      });
    }

    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap(res => {
        // Store tokens
        this.accessTokenSubject.next(res.access_token);
        sessionStorage.setItem('idToken', res.id_token);

        // Temporary: store refresh token in localStorage
        if (res.refresh_token) localStorage.setItem('refresh_token', res.refresh_token);
        debugger;
        this.router.navigate(['/dashboard']);
        // Store expiration timestamp
        const expiresAt = Date.now() + res.expires_in * 1000;
        sessionStorage.setItem('accessTokenExpiresAt', expiresAt.toString());

        // Enterprise features
        this.startAutoLogout(res.expires_in);
        this.startPreemptiveRefresh(res.expires_in - 60);

        
      }),
      catchError(err => throwError(() => err))
    );
  }

  restoreAuthState(): void {
    const expiresAt = Number(sessionStorage.getItem('accessTokenExpiresAt') || 0);

    if (Date.now() >= expiresAt) {
      this.logout();
      return;
    }

    // Silent refresh using localStorage refresh token (temporary)
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.logout();
      return;
    }

    this.http.post<{ access_token: string; expires_in: number }>(
      `${this.baseUrl}/auth/refresh`,
      { refresh_token: refreshToken },
      { withCredentials: true }
    ).subscribe({
      next: res => {
        this.accessTokenSubject.next(res.access_token);
        const newExpiresAt = Date.now() + res.expires_in * 1000;
        sessionStorage.setItem('accessTokenExpiresAt', newExpiresAt.toString());
        this.startAutoLogout(res.expires_in);
        this.startPreemptiveRefresh(res.expires_in - 60);
      },
      error: () => this.logout()
    });
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const expiresAt = Number(sessionStorage.getItem('accessTokenExpiresAt') || 0);
    return !!token && Date.now() < expiresAt;
  }

  logout(): void {
    const refreshToken = localStorage.getItem('refresh_token');

    this.clearTokens();

    this.http.post(`${this.baseUrl}/auth/logout`, {
      refresh_token: refreshToken
    }).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }


  private clearTokens(): void {
    this.accessTokenSubject.next(null);
    sessionStorage.removeItem('idToken');
    sessionStorage.removeItem('accessTokenExpiresAt');
    localStorage.removeItem('refresh_token'); // TEMP
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
  }

  /** Get access_token from memory */
  getAccessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  /** ------------------ Generic API Methods ------------------ */

  private createHeaders(): HttpHeaders {
    const token = this.getAccessToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  get<T>(url: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${url}`, { headers: this.createHeaders() })
      .pipe(catchError(err => this.handle401(err, () => this.get<T>(url))));
  }

  post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${url}`, body, { headers: this.createHeaders() })
      .pipe(catchError(err => this.handle401(err, () => this.post<T>(url, body))));
  }

  put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${url}`, body, { headers: this.createHeaders() })
      .pipe(catchError(err => this.handle401(err, () => this.put<T>(url, body))));
  }

  delete<T>(url: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${url}`, { headers: this.createHeaders() })
      .pipe(catchError(err => this.handle401(err, () => this.delete<T>(url))));
  }

  /** ------------------ Token Refresh Logic ------------------ */

  private handle401<T>(error: any, retryFn: () => Observable<T>): Observable<T> {
    if (error.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        this.logout();
        return throwError(() => error);
      }

      return this.http.post<{ access_token: string; expires_in: number }>(
        `${this.baseUrl}/auth/refresh`,
        { refresh_token: refreshToken },
        { withCredentials: true }
      ).pipe(
        switchMap(res => {
          this.accessTokenSubject.next(res.access_token);

          const expiresAt = Date.now() + res.expires_in * 1000;
          sessionStorage.setItem('accessTokenExpiresAt', expiresAt.toString());

          this.startAutoLogout(res.expires_in);
          return retryFn();
        }),
        catchError(err => {
          this.logout();
          return throwError(() => err);
        })
      );
    }
    return throwError(() => error);
  }

  /** ------------------ Optional: Auto Logout ------------------ */

  private startAutoLogout(expiresInSeconds: number): void {
    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    this.logoutTimer = setTimeout(() => this.logout(), expiresInSeconds * 1000);
  }

  /** ------------------ Optional: Preemptive Refresh ------------------ */

  private startPreemptiveRefresh(beforeSeconds: number): void {
    if (beforeSeconds <= 0) return;

    const expiresAt = Number(sessionStorage.getItem('accessTokenExpiresAt'));
    const refreshTime = expiresAt - beforeSeconds * 1000 - Date.now();
    if (refreshTime <= 0) return;

    timer(refreshTime).subscribe(() => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        this.logout();
        return;
      }

      this.http.post<{ access_token: string; expires_in: number }>(
        `${this.baseUrl}/auth/refresh`,
        { refresh_token: refreshToken },
        { withCredentials: true }
      ).subscribe({
        next: res => {
          this.accessTokenSubject.next(res.access_token);
          const newExpiresAt = Date.now() + res.expires_in * 1000;
          sessionStorage.setItem('accessTokenExpiresAt', newExpiresAt.toString());
          this.startAutoLogout(res.expires_in);
          this.startPreemptiveRefresh(res.expires_in - 60);
        },
        error: () => this.logout()
      });
    });
  }
}
