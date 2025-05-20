import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoWindowComponent } from './video-window.component';

describe('VideoWindowComponent', () => {
  let component: VideoWindowComponent;
  let fixture: ComponentFixture<VideoWindowComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VideoWindowComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
