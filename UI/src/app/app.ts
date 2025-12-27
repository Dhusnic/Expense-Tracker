import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';
import { Navbar } from './../app/core/components/nav-bar/nav-bar';
import { SidebarComponent } from '../app/core/components/side-bar/side-bar';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, SidebarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(
    private apiService: ApiService
  ) { }

  ngOnInit(): void {
    // Initialize authentication state
    this.apiService.restoreAuthState();
  }
  onSidebarToggle(expanded: boolean): void {
    console.log('Sidebar toggled:', expanded);
  }

  protected readonly title = signal('UI');
}
