import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthRoutingModule } from './auth-routing-module';
import { Login } from './components/login/login';

// import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';


@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    FormsModule,
    AuthRoutingModule,
    Login,
    // BrowserModule,
    ReactiveFormsModule,
    HttpClientModule,
  ]
})
export class AuthModule {}
