import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryDetailModal } from './category-detail-modal';

describe('CategoryDetailModal', () => {
  let component: CategoryDetailModal;
  let fixture: ComponentFixture<CategoryDetailModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CategoryDetailModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryDetailModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
