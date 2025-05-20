import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UninstallVersionSelectionDialogComponent } from './uninstall-version-selection-dialog.component';

describe('UninstallVersionSelectionDialogComponent', () => {
  let component: UninstallVersionSelectionDialogComponent;
  let fixture: ComponentFixture<UninstallVersionSelectionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UninstallVersionSelectionDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UninstallVersionSelectionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
