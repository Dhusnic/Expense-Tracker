import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoryPanelItem } from './category-panel-item';

describe('CategoryPanelItem', () => {
  let component: CategoryPanelItem;
  let fixture: ComponentFixture<CategoryPanelItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CategoryPanelItem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoryPanelItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
