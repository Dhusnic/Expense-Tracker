import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ExpenseTrackerRoutingModule } from './expense-tracker-routing-module';
import { ExpenseList } from './components/expense-list/expense-list';
import { ExpenseForm } from './components/expense-form/expense-form';
import { ExpenseFilters } from './components/expense-list/components/expense-filters/expense-filters';
import { ExpenseSummary } from './components/expense-list/components/expense-summary/expense-summary';
import { TransactionDetailModal } from './components/expense-list/components/transaction-detail-modal/transaction-detail-modal';


@NgModule({
  declarations: [
    ExpenseFilters,
    ExpenseSummary,
    TransactionDetailModal,
  ],
  imports: [
    CommonModule,
    ExpenseTrackerRoutingModule,
    ExpenseForm,
    ExpenseList,
  ]
})
export class ExpenseTrackerModule { }
