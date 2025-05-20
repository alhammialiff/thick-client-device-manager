import { TrialStatusService } from './../services/trial-status.service';
import { WebSocketService } from './../services/web-socket.service';
import { Component, ViewChildren, Input, Type, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { Subscription, Subject } from 'rxjs';
import { HololensAPIService } from '../services/hololens-api.service';
import { Form, FormGroup, FormControl } from '@angular/forms';
import { InsertDevicePanelDirective } from '../directives/insert-device-panel.directive';
import { DevicePanelComponent } from '../reusable-components/device-panel/device-panel.component';
import { DevicesService } from '../services/devices.service';
import { DeviceDetailsComponent } from '../device-details/device-details.component';
import { StatusNotificationsService } from '../services/status-notifications.service';
import { Device } from '../models/device.model';
import { DEVICE_TASK_LIST } from '../models/device-task-list';

@Component({
  selector: 'app-main-container',
  templateUrl: './main-container.component.html',
  styleUrls: ['./main-container.component.scss']
})
export class MainContainerComponent {

  showSplashScreen: boolean = false;
  TRIAL_EXPIRED: boolean = false;
  START_SESSION_TIMER: number = 0;

  @ViewChild('loadingMessage', { static: false }) loadingMessage!: ElementRef;

  constructor(private webSocketService: WebSocketService,
    private changeDetectorRef: ChangeDetectorRef
  ){}

  ngOnInit(){

    this.showSplashScreen = true;
    this.START_SESSION_TIMER = 0;

  }

  ngAfterViewInit(){


    setTimeout(()=>{

      this.showSplashScreen = false;
      this.changeDetectorRef.detectChanges();

    },1000);


    // This is to programmatically render the dots in Loading Message to make it animated
    var intervalCount = 0;
    var fullStopChar = '.';

    setInterval(()=>{

      if(intervalCount >= 0 && intervalCount < 3){

        intervalCount++;

        this.loadingMessage.nativeElement.innerText = `Synchronising HoloLens Data ${fullStopChar.repeat(intervalCount)}`;

      }


    },200);

  }



}


// Device Panel Component Model - To modularize into a separate model file later
class DevicePanel {
  constructor(
    public component: Type<any>,
    public data: any
  ) { }
}
