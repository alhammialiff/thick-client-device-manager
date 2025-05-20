import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvailableNetworksRowComponent } from './available-networks-row.component';

describe('AvailableNetworksRowComponent', () => {
  let component: AvailableNetworksRowComponent;
  let fixture: ComponentFixture<AvailableNetworksRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AvailableNetworksRowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvailableNetworksRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
