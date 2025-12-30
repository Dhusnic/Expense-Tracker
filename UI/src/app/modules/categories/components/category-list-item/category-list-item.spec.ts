import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryListItem } from './category-list-item';

describe('CategoryListItem', () => {
  let component: CategoryListItem;
  let fixture: ComponentFixture<CategoryListItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CategoryListItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryListItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
