import { TestBed } from '@angular/core/testing';

import { BrowserAgentResolverService } from './browser-agent-resolver.service';

describe('BrowserAgentResolverService', () => {
  let service: BrowserAgentResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BrowserAgentResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
