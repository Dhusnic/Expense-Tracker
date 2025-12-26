import { Injectable } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private api: ApiService) {}

  login(payload: { email: string; password: string }) {
    return this.api.post('/auth/login', payload);
  }

  logout() {
    return this.api.post('/auth/logout', {});
  }

  register(payload: { }) {
    return this.api.post('/auth/register', payload);
  }

  getProfile() {
    return this.api.get('/auth/profile');
  }
}
