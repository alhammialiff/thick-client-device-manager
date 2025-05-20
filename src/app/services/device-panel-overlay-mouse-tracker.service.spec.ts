import { TestBed } from '@angular/core/testing';

import { DevicePanelOverlayMouseTrackerService } from './device-panel-overlay-mouse-tracker.service';

describe('DevicePanelOverlayMouseTrackerService', () => {
  let service: DevicePanelOverlayMouseTrackerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DevicePanelOverlayMouseTrackerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
