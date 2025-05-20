import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GridStreamRowComponent } from './grid-stream-row.component';

describe('GridStreamRowComponent', () => {
  let component: GridStreamRowComponent;
  let fixture: ComponentFixture<GridStreamRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GridStreamRowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GridStreamRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
