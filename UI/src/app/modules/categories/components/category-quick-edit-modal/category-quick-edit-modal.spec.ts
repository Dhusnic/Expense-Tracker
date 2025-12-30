import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryQuickEditModal } from './category-quick-edit-modal';

describe('CategoryQuickEditModal', () => {
  let component: CategoryQuickEditModal;
  let fixture: ComponentFixture<CategoryQuickEditModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CategoryQuickEditModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryQuickEditModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
