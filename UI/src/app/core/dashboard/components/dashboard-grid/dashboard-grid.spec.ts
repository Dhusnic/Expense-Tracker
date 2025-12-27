import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardGrid } from './dashboard-grid';

describe('DashboardGrid', () => {
  let component: DashboardGrid;
  let fixture: ComponentFixture<DashboardGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
