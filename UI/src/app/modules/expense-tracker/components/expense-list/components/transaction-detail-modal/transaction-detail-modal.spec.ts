import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransactionDetailModal } from './transaction-detail-modal';

describe('TransactionDetailModal', () => {
  let component: TransactionDetailModal;
  let fixture: ComponentFixture<TransactionDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TransactionDetailModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransactionDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
