import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TrialStatusService {

  constructor() { }

  TRIAL_EXPIRED: boolean = false;

  setTrialExpiry = (): void => {

    this.TRIAL_EXPIRED = true;

  }

  getTrialStatus = ():boolean => {

    console.log("[Trial Status Service] TRIAL_EXPIRED: ", this.TRIAL_EXPIRED);

    return this.TRIAL_EXPIRED;

  }

}
