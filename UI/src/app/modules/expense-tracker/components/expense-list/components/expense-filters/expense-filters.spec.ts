import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseFilters } from './expense-filters';

describe('ExpenseFilters', () => {
  let component: ExpenseFilters;
  let fixture: ComponentFixture<ExpenseFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ExpenseFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
