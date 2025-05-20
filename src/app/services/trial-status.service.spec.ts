import { TestBed } from '@angular/core/testing';

import { TrialStatusService } from './trial-status.service';

describe('TrialStatusService', () => {
  let service: TrialStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrialStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
