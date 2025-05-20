import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrialExpiredPageComponent } from './trial-expired-page.component';

describe('TrialExpiredPageComponent', () => {
  let component: TrialExpiredPageComponent;
  let fixture: ComponentFixture<TrialExpiredPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TrialExpiredPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrialExpiredPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
