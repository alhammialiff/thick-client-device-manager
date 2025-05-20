import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassphraseDialogComponent } from './passphrase-dialog.component';

describe('PassphraseDialogComponent', () => {
  let component: PassphraseDialogComponent;
  let fixture: ComponentFixture<PassphraseDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PassphraseDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassphraseDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
