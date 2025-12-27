import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ExpenseList } from './components/expense-list/expense-list';
import {ExpenseForm} from './components/expense-form/expense-form';
const routes: Routes = [
  {
    path: '',
    component: ExpenseList
  },
  {
    path: 'add',
    component:  ExpenseForm
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ExpenseTrackerRoutingModule { }
