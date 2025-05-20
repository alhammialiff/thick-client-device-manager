import { TestBed } from '@angular/core/testing';

import { HololensAPIService } from './hololens-api.service';

describe('BatteryLifeService', () => {
  let service: HololensAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HololensAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
