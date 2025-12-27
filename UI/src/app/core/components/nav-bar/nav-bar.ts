import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
interface UserProfile {
  sub: string;
  email: string;
  username: string;
  phoneNumber: string;
  emailVerified: boolean;
  phoneNumberVerified: boolean;
}

interface DropdownMenuItem {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  divider?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'error';
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.scss'  // Note: styleUrl (singular) for Angular 21
})
export class Navbar implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  userProfile = signal<UserProfile | null>(null);
  currentTheme = signal<'light' | 'dark'>('light');
  searchQuery = signal<string>('');
  notificationCount = signal<number>(0);
  isUserDropdownOpen = signal<boolean>(false);
  isNotificationDropdownOpen = signal<boolean>(false);
  private profileReloadInterval$ = new Subject<void>();
  userDropdownMenu: DropdownMenuItem[] = [];
  notifications = signal<Notification[]>([]);

  constructor(private router: Router) {
    this.initializeDropdownMenu();
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadThemePreference();
    this.loadNotifications();
    this.setupClickOutsideHandler();
    this.startProfileAutoReload();
  }

  private startProfileAutoReload(): void {
    // Reload every 30 seconds (30000 milliseconds)
    interval(30000)
      .pipe(
        takeUntil(this.destroy$),
        takeUntil(this.profileReloadInterval$)
      )
      .subscribe(() => {
        console.log('Auto-reloading user profile...');
        this.loadUserProfile();
      });
  }


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile(): void {
    try {
      const idToken = sessionStorage.getItem('idToken');
      
      if (!idToken) {
        console.warn('No idToken found in sessionStorage');
        return;
      }

      const decodedToken = this.decodeJWT(idToken);
      
      if (decodedToken) {
        this.userProfile.set({
          sub: decodedToken.sub,
          email: decodedToken.email,
          username: decodedToken['cognito:username'],
          phoneNumber: decodedToken.phone_number,
          emailVerified: decodedToken.email_verified,
          phoneNumberVerified: decodedToken.phone_number_verified
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

  private decodeJWT(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  }

  private initializeDropdownMenu(): void {
    this.userDropdownMenu = [
      {
        id: 'settings',
        label: 'Settings',
        icon: 'bi-gear',
        action: () => this.navigateToSettings()
      },
      {
        id: 'logout',
        label: 'Logout',
        icon: 'bi-box-arrow-right',
        action: () => this.logout(),
        divider: true
      }
    ];
  }

  private loadThemePreference(): void {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    
    if (savedTheme) {
      this.currentTheme.set(savedTheme);
      this.applyTheme(savedTheme);
    } else {
      this.currentTheme.set('light');
      this.applyTheme('light');
    }
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.currentTheme.set(newTheme);
    this.applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-bs-theme', theme);
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);
  }

  onSearch(): void {
    const query = this.searchQuery();
    
    if (query && query.trim().length > 0) {
      this.router.navigate(['/search'], { 
        queryParams: { q: query.trim() } 
      });
      this.searchQuery.set('');
    }
  }

  onSearchKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.onSearch();
    }
  }

  toggleUserDropdown(event: Event): void {
    event.stopPropagation();
    this.isUserDropdownOpen.update(state => !state);
    this.isNotificationDropdownOpen.set(false);
  }

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.isNotificationDropdownOpen.update(state => !state);
    this.isUserDropdownOpen.set(false);
    
    if (this.isNotificationDropdownOpen()) {
      this.markNotificationsAsRead();
    }
  }

  private navigateToSettings(): void {
    this.router.navigate(['/settings']);
    this.isUserDropdownOpen.set(false);
  }

  private logout(): void {
    this.isUserDropdownOpen.set(false);
    sessionStorage.clear();
    localStorage.removeItem('theme');
    this.router.navigate(['/login']);
  }

  getUserInitials(): string {
    const profile = this.userProfile();
    if (!profile) return 'U';
    
    const username = profile.username || profile.email;
    if (!username) return 'U';
    
    return username.charAt(0).toUpperCase();
  }

  getUserDisplayName(): string {
    const profile = this.userProfile();
    if (!profile) return 'User';
    
    return profile.username || profile.email.split('@')[0];
  }

  private loadNotifications(): void {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        title: 'System Update',
        message: 'New features are now available',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        read: false,
        type: 'info'
      },
      {
        id: '2',
        title: 'Security Alert',
        message: 'New login detected from unknown device',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        read: false,
        type: 'warning'
      }
    ];
    
    this.notifications.set(mockNotifications);
    this.updateNotificationCount();
  }

  private updateNotificationCount(): void {
    const unreadCount = this.notifications().filter(n => !n.read).length;
    this.notificationCount.set(unreadCount);
  }

  private markNotificationsAsRead(): void {
    this.notifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
    this.notificationCount.set(0);
  }

  onNotificationClick(notification: Notification): void {
    console.log('Notification clicked:', notification);
    this.isNotificationDropdownOpen.set(false);
  }

  getNotificationIcon(type: string): string {
    const iconMap: Record<string, string> = {
      info: 'bi-info-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      success: 'bi-check-circle-fill',
      error: 'bi-x-circle-fill'
    };
    return iconMap[type] || 'bi-bell-fill';
  }

  getNotificationTypeClass(type: string): string {
    return `notification-${type}`;
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }

  private setupClickOutsideHandler(): void {
    document.addEventListener('click', () => {
      this.isUserDropdownOpen.set(false);
      this.isNotificationDropdownOpen.set(false);
    });
  }

  executeAction(item: DropdownMenuItem, event: Event): void {
    event.stopPropagation();
    item.action();
  }
}
