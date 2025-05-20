import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopUpMessageDialogComponent } from './pop-up-message-dialog.component';

describe('PopUpMessageDialogComponent', () => {
  let component: PopUpMessageDialogComponent;
  let fixture: ComponentFixture<PopUpMessageDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PopUpMessageDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PopUpMessageDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
