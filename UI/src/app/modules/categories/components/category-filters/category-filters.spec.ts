import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryFilters } from './category-filters';

describe('CategoryFilters', () => {
  let component: CategoryFilters;
  let fixture: ComponentFixture<CategoryFilters>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CategoryFilters]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryFilters);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
