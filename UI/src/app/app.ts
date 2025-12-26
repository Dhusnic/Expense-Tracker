import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
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

  protected readonly title = signal('UI');
}
