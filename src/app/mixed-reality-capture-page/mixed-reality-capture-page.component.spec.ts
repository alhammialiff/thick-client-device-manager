import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MixedRealityCapturePageComponent } from './mixed-reality-capture-page.component';

describe('MixedRealityCapturePageComponent', () => {
  let component: MixedRealityCapturePageComponent;
  let fixture: ComponentFixture<MixedRealityCapturePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MixedRealityCapturePageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MixedRealityCapturePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
