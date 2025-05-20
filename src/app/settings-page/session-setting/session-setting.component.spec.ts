import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SessionSettingComponent } from './session-setting.component';

describe('SessionSettingComponent', () => {
  let component: SessionSettingComponent;
  let fixture: ComponentFixture<SessionSettingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SessionSettingComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SessionSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
