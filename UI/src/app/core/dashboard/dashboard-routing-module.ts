import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardGrid } from './components/dashboard-grid/dashboard-grid';
const routes: Routes = [  {
    path: '',
    component: DashboardGrid
  }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
