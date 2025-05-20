import { TestBed } from '@angular/core/testing';

import { BrowserResolutionObserverService } from './browser-resolution-observer.service';

describe('BrowserResolutionObserverService', () => {
  let service: BrowserResolutionObserverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrowserResolutionObserverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
