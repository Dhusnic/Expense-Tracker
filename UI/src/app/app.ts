import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';
import { Navbar } from './../app/core/components/nav-bar/nav-bar';
import { SidebarComponent } from '../app/core/components/side-bar/side-bar';
import { interval, Subscription } from 'rxjs';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  isLoggedIn: boolean = false;
  private authCheckSub!: Subscription;
  constructor(
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    // Initialize authentication state
    this.apiService.restoreAuthState();
    this.checkAuth();
    this.authCheckSub = interval(30000).subscribe(() => {
      this.checkAuth();
    });
  }

  checkAuth() {
    let id_tokken = localStorage.getItem('refresh_token');
    // change to sessionStorage if you are using that
    if (id_tokken!=null&& id_tokken!=undefined && id_tokken!="")
    {
      this.isLoggedIn = true;
    }
    else{
      this.isLoggedIn = false
    }
  }
  onSidebarToggle(expanded: boolean): void {
    console.log('Sidebar toggled:', expanded);
  }
  ngOnDestroy() {
    if (this.authCheckSub) {
      this.authCheckSub.unsubscribe();
    }
  }
  protected readonly title = signal('UI');
}
