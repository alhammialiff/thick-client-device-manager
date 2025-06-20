import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OverviewPageComponent } from './overview-page.component';

describe('OverviewPageComponent', () => {
  let component: OverviewPageComponent;
  let fixture: ComponentFixture<OverviewPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OverviewPageComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OverviewPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should mount', () => {
    // expect(component).toBeTruthy();
    cy.mount(OverviewPageComponent);
  });
});
