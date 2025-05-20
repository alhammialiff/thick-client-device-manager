import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopUpDeviceRegistrationDialogComponent } from './pop-up-device-registration-dialog.component';

describe('PopUpDeviceRegistrationDialogComponent', () => {
  let component: PopUpDeviceRegistrationDialogComponent;
  let fixture: ComponentFixture<PopUpDeviceRegistrationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PopUpDeviceRegistrationDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopUpDeviceRegistrationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
