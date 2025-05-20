import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StorageSettingsComponent } from './storage-settings.component';

describe('StorageComponent', () => {
  let component: StorageSettingsComponent;
  let fixture: ComponentFixture<StorageSettingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StorageSettingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StorageSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
