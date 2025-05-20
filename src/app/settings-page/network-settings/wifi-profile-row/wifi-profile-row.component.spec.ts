import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WifiProfileRowComponent } from './wifi-profile-row.component';

describe('WifiProfileRowComponent', () => {
  let component: WifiProfileRowComponent;
  let fixture: ComponentFixture<WifiProfileRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WifiProfileRowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WifiProfileRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
