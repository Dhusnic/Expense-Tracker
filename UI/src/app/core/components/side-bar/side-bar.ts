import { Component, OnInit, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';


export interface BadgeConfig {
  text: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}
export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: string;
  route?: string;
  badge?:BadgeConfig;
  children?: SidebarMenuItem[];
  divider?: boolean;
  action?: () => void;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './side-bar.html',
  styleUrl: './side-bar.scss'
})
export class SidebarComponent implements OnInit {
  // Output for parent component if needed
  sidebarToggled = output<boolean>();

  // State
  isExpanded = signal<boolean>(true);
  activeMenuId = signal<string | null>(null);
  expandedSubmenus = signal<Set<string>>(new Set());
  isHovering = signal<boolean>(false);

  // Computed
  sidebarWidth = computed(() => this.isExpanded() ? '280px' : '70px');

  // CONFIGURATION - All config inside component
  readonly config = {
    logo: {
      icon: 'bi-hexagon-fill',
      companyName: 'Enterprise Portal',
      version: '2.0.1'
    },
    menuItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'bi-speedometer2',
        route: '/dashboard',
        // badge: { text: 'NEW', variant: 'primary' as const }
      },
      {
        id: 'divider1',
        label: 'Management',
        icon: '',
        divider: true  // This one has divider: true
      },
      {
        id: 'expense_tracker',
        label: 'Expense Tracker',
        icon: 'bi bi-calculator',
        route: '/expense_tracker',
        // badge: { text: 'NEW', variant: 'primary' as const }
      },
      {
        id: 'acccounts',
        label: 'Accounts',
        icon: 'bi bi-bank',
        route: '/accounts',
        children: [
          {
            id: 'savings_account',
            label: 'Savings Account',
            icon: 'bi bi-piggy-bank-fill',
            route: '/accounts/savings'
          },
          {
            id: 'salary_account',
            label: 'Salary Account',
            icon: 'bi bi-cash-coin',
            route: '/accounts/salary'
          },
          {
            id: 'investment_account',
            label: 'Investment Account',
            icon: 'bi bi-graph-up-arrow',
            route: '/accounts/investment',
          }
        ]
      },
      {
        id: 'categories',
        label: 'Categories',
        icon: 'bi-tags-fill',
        route: '/categories',
        // badge: { text: '8', variant: 'success' as const }
      },
      {
        id: 'Budgets',
        label: 'Budgets',
        icon: 'bi-wallet2',
        route: '/budgets',
        // badge: { text: '24', variant: 'warning' as const }
      },
      // {
      //   id: 'divider1',
      //   label: 'Management',
      //   icon: '',
      //   divider: true
      // },
      // {
      //   id: 'team',
      //   label: 'Team',
      //   icon: 'bi-people-fill',
      //   children: [
      //     {
      //       id: 'members',
      //       label: 'Members',
      //       icon: 'bi-person',
      //       route: '/team/members'
      //     },
      //     {
      //       id: 'departments',
      //       label: 'Departments',
      //       icon: 'bi-diagram-3',
      //       route: '/team/departments'
      //     },
      //     {
      //       id: 'roles',
      //       label: 'Roles & Permissions',
      //       icon: 'bi-shield-check',
      //       route: '/team/roles'
      //     }
      //   ]
      // },
      // {
      //   id: 'clients',
      //   label: 'Clients',
      //   icon: 'bi-briefcase',
      //   route: '/clients',
      //   badge: { text: '45', variant: 'info' as const }
      // },
      // {
      //   id: 'calendar',
      //   label: 'Calendar',
      //   icon: 'bi-calendar-event',
      //   route: '/calendar'
      // },
      {
        id: 'messages',
        label: 'Messages',
        icon: 'bi-chat-dots',
        route: '/messages',
        badge: { text: '5', variant: 'danger' as const }
      },
      // {
      //   id: 'divider2',
      //   label: 'System',
      //   icon: '',
      //   divider: true
      // },
      // {
      //   id: 'settings',
      //   label: 'Settings',
      //   icon: 'bi-gear-fill',
      //   children: [
      //     {
      //       id: 'general',
      //       label: 'General',
      //       icon: 'bi-sliders',
      //       route: '/settings/general'
      //     },
      //     {
      //       id: 'security',
      //       label: 'Security',
      //       icon: 'bi-shield-lock',
      //       route: '/settings/security'
      //     },
      //     {
      //       id: 'integrations',
      //       label: 'Integrations',
      //       icon: 'bi-plug',
      //       route: '/settings/integrations'
      //     },
      //     {
      //       id: 'billing',
      //       label: 'Billing',
      //       icon: 'bi-credit-card',
      //       route: '/settings/billing'
      //     }
      //   ]
      // },
      // {
      //   id: 'notifications',
      //   label: 'Notifications',
      //   icon: 'bi-bell',
      //   route: '/notifications',
      //   badge: { text: '3', variant: 'danger' as const }
      // }
    ],
    footerItems: [
      // {
      //   id: 'help',
      //   label: 'Help & Support',
      //   icon: 'bi-question-circle',
      //   route: '/help'
      // },
      // {
      //   id: 'profile',
      //   label: 'My Profile',
      //   icon: 'bi-person-circle',
      //   route: '/profile'
      // },
      {
        id: 'logout',
        label: 'Logout',
        icon: 'bi-box-arrow-right',
        action: () => this.handleLogout()
      }
    ],
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.setActiveMenuFromRoute();
    
    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.setActiveMenuFromRoute();
      });
  }

  /**
   * Toggle sidebar
   */
  toggleSidebar(): void {
    this.isExpanded.update(expanded => !expanded);
    this.sidebarToggled.emit(this.isExpanded());
    
    if (!this.isExpanded()) {
      this.expandedSubmenus.set(new Set());
    }
  }

  /**
   * Handle menu item click
   */
  onMenuItemClick(item: SidebarMenuItem, event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    if (item.children && item.children.length > 0) {
      this.toggleSubmenu(item.id);
      return;
    }

    if (item.action) {
      item.action();
      return;
    }

    if (item.route) {
      this.router.navigate([item.route]);
      this.activeMenuId.set(item.id);
    }
  }

  /**
   * Toggle submenu
   */
  toggleSubmenu(menuId: string): void {
    this.expandedSubmenus.update(expanded => {
      const newSet = new Set(expanded);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });

    if (!this.isExpanded()) {
      this.isExpanded.set(true);
      this.sidebarToggled.emit(true);
    }
  }

  /**
   * Check if submenu is expanded
   */
  isSubmenuExpanded(menuId: string): boolean {
    return this.expandedSubmenus().has(menuId);
  }

  /**
   * Check if menu item is active
   */
  isMenuItemActive(item: SidebarMenuItem): boolean {
    if (item.route) {
      return this.router.url.startsWith(item.route);
    }
    return this.activeMenuId() === item.id;
  }

  /**
   * Set active menu from route
   */
  private setActiveMenuFromRoute(): void {
    const currentUrl = this.router.url;
    const findActiveMenu = (items: SidebarMenuItem[]): string | null => {
      for (const item of items) {
        if (item.route && currentUrl.startsWith(item.route)) {
          return item.id;
        }
        if (item.children) {
          const childActive = findActiveMenu(item.children);
          if (childActive) {
            this.expandedSubmenus.update(set => new Set(set).add(item.id));
            return childActive;
          }
        }
      }
      return null;
    };

    const activeId = findActiveMenu(this.config.menuItems);
    if (activeId) {
      this.activeMenuId.set(activeId);
    }
  }

  /**
   * Get badge class
   */
  getBadgeClass(variant: string): string {
    return `badge-${variant}`;
  }

  /**
   * Mouse events
   */
  onMouseEnter(): void {
    this.isHovering.set(true);
  }

  onMouseLeave(): void {
    this.isHovering.set(false);
  }

  /**
   * Track by function
   */
  trackByMenuItem(index: number, item: SidebarMenuItem): string {
    return item.id;
  }

  /**
   * Handle logout
   */
  private handleLogout(): void {
    console.log('Logging out...');
    // Add your logout logic here
    // this.authService.logout();
    // this.router.navigate(['/login']);
  }
}
