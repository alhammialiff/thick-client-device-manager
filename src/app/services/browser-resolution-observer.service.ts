import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Injectable({
  providedIn: 'root'
})
export class BrowserResolutionObserverService {

  constructor(private breakpointObserver: BreakpointObserver) { }

  getBreakpointObserver(){

    return this.breakpointObserver.observe([

      Breakpoints.XSmall,
      Breakpoints.Small,
      Breakpoints.Medium,
      Breakpoints.Large,
      Breakpoints.XLarge,

    ]);

  }

}
