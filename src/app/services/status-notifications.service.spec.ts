import { TestBed } from '@angular/core/testing';

import { StatusNotificationsService } from './status-notifications.service';

describe('StatusNotificationsService', () => {
  let service: StatusNotificationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StatusNotificationsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
