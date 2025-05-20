import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayHololensAppRowComponent } from './play-hololens-app-row.component';

describe('VideoStreamerComponent', () => {
  let component: PlayHololensAppRowComponent;
  let fixture: ComponentFixture<PlayHololensAppRowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlayHololensAppRowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlayHololensAppRowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
