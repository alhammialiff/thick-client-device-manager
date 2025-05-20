import { WebSocketService } from './../../services/web-socket.service';
import { animate, style, transition, trigger } from '@angular/animations';
import { Component, EventEmitter, ViewContainerRef, Output, ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription, concatMap, interval, tap } from 'rxjs';
import { Device } from 'src/app/models/device.model';
import { BrowserResolutionObserverService } from 'src/app/services/browser-resolution-observer.service';
import { DevicesService } from 'src/app/services/devices.service';
import { StatusNotificationsService } from 'src/app/services/status-notifications.service';
import { DeviceConfigComponent } from '../device-config/device-config.component';

@Component({
  selector: 'app-device-row',
  templateUrl: './device-row.component.html',
  styleUrls: ['./device-row.component.scss'],
  animations:[
    trigger(
      'fadeInEntrance', [
        transition(':enter',
          [
            style({
              opacity: 0,
            }),
            animate(
              '250ms',
              style({
                opacity: 1
              })
            )
          ]
        ),
        transition(':leave',
          [
            style({
              opacity: 1
            }),
            animate(
              '250ms',
              style({
                opacity: 0
              })
            )
          ]
        )
      ]
    )
  ]

})
export class DeviceRowComponent {

  deviceData!: any;
  @Output() onlineEvent = new EventEmitter<any>();
  @Output() offlineEvent = new EventEmitter<any>();
  effectiveHttpRequestCount: number = 0;

  hlID: any;
  hlName: any;
  hlIsCharging: any;
  hlOnlineStatus!: any;
  hlListIndex: number = 0;
  isOnline: boolean = false;
  isLoading: boolean = true;
  hlAddress!: any;
  hlDeviceName!: any;
  hlComputerHostName!: any;
  batteryLifePercentage!: any;
  hlInstalledApps: any = [];
  hlLowPowerState: boolean = false;

  intervalBasedRefreshSubscription!: Subscription;
  deviceUpdateInterval: number = 10;
  enableUpdateFlash: boolean = false;
  updateFlash: boolean = false;
  devicePanelBGColor!: object;

  deviceOnlineFlag: boolean = false;
  deviceUpdateTimeout: number = 0;
  listenToWebsocket!: Subscription;


  showDevicePanelOverlay: boolean = false;

  // Breakpoints
  currentBreakpoint!: string;
  isExtraSmall:boolean = false;
  isSmall:boolean = false;
  isMedium:boolean = false;
  isLarge:boolean = false;
  isExtraLarge:boolean = false;

  constructor(private devicesService: DevicesService,
    private webSocketService: WebSocketService,
    private browserResolutionObserver: BrowserResolutionObserverService,
    private statusNotificationService: StatusNotificationsService,
    private changeDetectorRef: ChangeDetectorRef,
    private dialog: MatDialog,
    private router: Router){}

  ngOnInit(){




    // [WEBSOCKET DEV] ================================

    // Using this class variable to display data in template will have
    // a delay effect, as compared to directly using deviceData.[device-prop-here]
    this.hlAddress = this.deviceData.hostIP;
    this.hlDeviceName = this.deviceData.deviceName;
    this.hlListIndex = this.deviceData.listIndex;
    this.hlComputerHostName = this.deviceData.hostComputerName;
    this.batteryLifePercentage = this.deviceData.battLife;
    this.hlIsCharging = this.deviceData.battLife;
    this.hlIsCharging = this.deviceData.isCharging;
    this.hlID = this.deviceData.id;
    this.hlLowPowerState = this.deviceData.lowPowerState;
    this.enableUpdateFlash = this.deviceData.updateFlash;
    this.deviceUpdateInterval = this.deviceData.deviceUpdateInterval * 1000;

    // [WEBSOCKET DEV] ================================
    this.listenToWebsocket = this.devicesService.deviceUpdate.subscribe({
      next:(webSocketResponse: any)=>{

        // console.log("[Device Panel] [Websocket Response] - ", webSocketResponse);
        console.log("[UPDATED DEVICE DATA EVENT]", webSocketResponse);

        if(webSocketResponse?.id === this.deviceData.id && webSocketResponse.deviceName === this.deviceData.deviceName){

          this.deviceData = webSocketResponse;

          this.effectiveHttpRequestCount = this.devicesService.getHTTPRequestCount();
          this.isLoading = false;

          // Bugged out effectiveHttpRequestCount  (resolved but need find how it happened)
          console.log("[Websocket Response] Device Panel - effectiveHttpRequestCount (buggy) - ", webSocketResponse.effectiveHttpRequestCount);
          console.log("[Websocket Response] Device Panel - effectiveHttpRequestCount - ", this.effectiveHttpRequestCount);

          // If Http Request is more than N, refresh web app to prevent locking
          if(this.effectiveHttpRequestCount > 300){

            console.log("[App reload imminent]");
            location.reload();

          }

          // Declare condition variable to make it more readable
          // const webSocketResponseDoesNotContainError = !webSocketResponse.hasOwnProperty('errorMessage') || (webSocketResponse.errorMessage === null || webSocketResponse.errorMessage === undefined)
          const webSocketResponseDoesNotContainError = webSocketResponse?.errorMessage === null;

          // If there's no error message
          if(webSocketResponseDoesNotContainError){

            console.log("[Websocket Response] Device Panel - [Success] Refresh data", webSocketResponse);
            console.log("[Websocket Response] Device Panel - [Success] Effective HTTP Request Count", this.effectiveHttpRequestCount);

            var dataToPass = {
              ...webSocketResponse,
            }

            this.getHoloLensPowerStatus();


            this.statusNotificationService.logTask(dataToPass, 'Device Update Success', true);

            // Device Flag
            if(!this.deviceOnlineFlag){

              this.statusNotificationService.logTask(dataToPass, 'Device Online', true);
              this.deviceOnlineFlag = true;

            }

          }else{

            console.log("[Websocket Response] Device Panel - [Failed] Refresh data", webSocketResponse);
            // console.log("Device Panel - [Failed] Error Message", refreshedDeviceData?.errorMessage);

            // Log 'Device Timeout' thrice to ensure that it is not intermittent network that is causing failed data retrieval
            if(this.deviceUpdateTimeout < 3){


              this.statusNotificationService.logTask(webSocketResponse, 'Device Update Timeout', false);

              // Invoke method to get device status
              this.getHoloLensPowerStatus();

              this.deviceUpdateTimeout++;
              console.log("[Websocket Response] Device Panel - [Failed] this.deviceUpdateTimeout", this.deviceUpdateTimeout);

              // this.devicesService.pushToOnlineHololensRecord(this.deviceData);


            }else{

              this.statusNotificationService.logTask(webSocketResponse, 'Device Offline', true);

              // Invoke method to get device status
              this.getHoloLensPowerStatus();

              // this.deviceUpdateTimeout = 0;
              this.deviceOnlineFlag = false;

            }

          }

        }

      },
      error:(error:any)=>{

        console.log("[Websocket Response] [Device Panel] [Websocket Error] - ", error);
        
      },
      complete:()=>{

        console.log("[Websocket Response] [Device Panel] [Websocket Transaction Complete]");

      }

    });


    // ----------------------------------------------------
    // [COMMENTED] REST API POLLING
    // HoloLens Device Data Refresh Subscription
    // Fire Device Data Refresh every 10000ms
    // ----------------------------------------------------
    // try{

    //   this.intervalBasedRefreshSubscription = interval(this.deviceUpdateInterval)
    //     .pipe(

    //       concatMap(()=>{

    //         console.log("Device Row - device update interval - this.hlDeviceName", this.hlDeviceName);

    //         return this.devicesService.refreshDeviceData(

    //           {
    //             id: this.hlID,
    //             hlAddress: this.hlAddress,
    //             hlDeviceName: this.hlDeviceName,
    //             hlComputerHostName: this.hlComputerHostName
    //           }

    //         )

    //       }),
    //       tap(()=>{

    //         console.log("Device Row - device update interval - this.deviceUpdateInterval", this.deviceUpdateInterval);
    //         console.log("Device Row - Check for updateFlash setting - ", this.enableUpdateFlash);

    //         if(this.enableUpdateFlash){

    //           this.updateFlash = true;

    //           setInterval(()=>{

    //             this.updateFlash = false;

    //           }, 1000);

    //         }


    //       }),

    //     )
    //     .subscribe({

    //       next: (refreshedDeviceData: Device) => {

    //         try{

    //           try{

    //             this.deviceData = refreshedDeviceData;
    //             this.effectiveHttpRequestCount = this.deviceData.effectiveHttpRequestCount;
    //             this.isLoading = false;

    //             // If there's no error message
    //             if(!refreshedDeviceData.hasOwnProperty('errorMessage') || (refreshedDeviceData.errorMessage === null || refreshedDeviceData.errorMessage === undefined)){

    //               console.log("Device Row - [Success] Refresh data", refreshedDeviceData);
    //               console.log("Device Row - [Success] Effective HTTP Request Count", this.effectiveHttpRequestCount);

    //               var dataToPass = {
    //                 ...refreshedDeviceData,
    //               }

    //               this.getHLOnlineStatus();
    //               this.batteryLifePercentage = this.deviceData.battLife;


    //               // this.statusNotificationService.logTask(dataToPass, 'Device Update Success', true);

    //               // Device Flag
    //               if(!this.deviceOnlineFlag){

    //                 // this.statusNotificationService.logTask(dataToPass, 'Device Online', true);
    //                 this.deviceOnlineFlag = true;

    //               }

    //             }else{

    //               console.log("Device Row - [Failed] Refresh data", refreshedDeviceData);
    //               // console.log("Device Row - [Failed] Error Message", refreshedDeviceData?.errorMessage);

    //               // Log 'Device Timeout' thrice to ensure that it is not intermittent network that is causing failed data retrieval
    //               if(this.deviceUpdateTimeout < 3){

    //                 // this.statusNotificationService.logTask(refreshedDeviceData, 'Device Update Timeout', false);

    //                 // Invoke method to get device status
    //                 this.getHLOnlineStatus();

    //                 this.deviceUpdateTimeout++;

    //               }else{

    //                 // this.statusNotificationService.logTask(refreshedDeviceData, 'Device Offline', true);

    //                 // Invoke method to get device status
    //                 this.getHLOnlineStatus();

    //                 // this.deviceUpdateTimeout = 0;
    //                 this.deviceOnlineFlag = false;

    //               }

    //             }

    //             // Update online status back to devices service
    //             // this.devicesService.pushToOnlineHololensRecord(this.deviceData);


    //           }catch(e){

    //             console.log("Device Row - [Failed] Error", e);
    //             // console.log("Device Row - [Failed] Error Message", refreshedDeviceData?.errorMessage);

    //           }

    //         }catch(error){



    //         }

    //       },
    //       error: (error) => {

    //         console.log("In ")

    //       },
    //       complete: () => {


    //       }


    //     });

    // }catch(e){



    // }

  }

  ngAfterViewInit(){

    this.browserResolutionObserver
    .getBreakpointObserver()
    .subscribe((result)=>{

      for(const query of Object.keys(result.breakpoints)){

        const queryExists = result.breakpoints[query];

        // console.log("Device Row - breakpoint query ", result.breakpoints);

        if(queryExists){

          this.currentBreakpoint = query;

          switch(query){

            case '(max-width: 599.98px)':

              this.isExtraSmall = true;
              this.isSmall = false;
              this.isMedium = false;
              this.isLarge = false;
              this.isExtraLarge = false;
              break;

            case '(min-width: 600px) and (max-width: 959.98px)':

              this.isExtraSmall = false;
              this.isSmall = true;
              this.isMedium = false;
              this.isLarge = false;
              this.isExtraLarge = false;
              break;

            case '(min-width: 960px) and (max-width: 1279.98px)':

              this.isExtraSmall = false;
              this.isSmall = false;
              this.isMedium = true;
              this.isLarge = false;
              this.isExtraLarge = false;
              break;

            case '(min-width: 1280px) and (max-width: 1919.98px)':

              this.isExtraSmall = false;
              this.isSmall = false;
              this.isMedium = false;
              this.isLarge = true;
              this.isExtraLarge = false;

              break;

            case '(min-width: 1920px)':

              this.isExtraSmall = false;
              this.isSmall = false;
              this.isMedium = false;
              this.isLarge = false;
              this.isExtraLarge = true;

              break;

            default:

              this.isExtraSmall = false;
              this.isSmall = false;
              this.isMedium = false;
              this.isLarge = false;
              this.isExtraLarge = false;
              console.log("Placeholder for default config");

          }

        }


      }

      this.changeDetectorRef.detectChanges();

    });

  }

  ngDoCheck(){

    // Check if device name has changed (due to config change done by user)
    if(this.deviceData.deviceName !== this.hlDeviceName){

      this.hlDeviceName = this.deviceData.deviceName;

    }

    // Check if host IP has changed (due to config change done by user)
    if(this.deviceData.hostIP !== this.hlAddress){

      this.hlAddress = this.deviceData.hostIP;

    }

  }

  ngOnDestroy(){

    console.log("[Device Row] - [Ng On Destroy]");

    this.listenToWebsocket.unsubscribe();

    // if(this.intervalBasedRefreshSubscription){

    //   // Unsubscribe RXJS subscription when
    //   console.log("unsubscribe from intervalBasedRefreshSubscription");
    //   this.intervalBasedRefreshSubscription.unsubscribe();

    // }
    // else {

    //   console.log("intervalBasedRefreshSubscription is null");

    // }

    // this.intervalBasedRefreshSubscription.unsubscribe();
    // this.disconnectSocket();

  }

  initializeSocketConnection(deviceName: string){

    this.webSocketService.connectSocket();

  }

  receiveSocketResponse(deviceName: string){

    this.webSocketService.receiveStatus().subscribe({

      next:(webSocketResponse: any)=>{

        console.log("[Device Panel] [Websocket Response] - ", webSocketResponse);

        if(webSocketResponse?.id === this.deviceData.id){

          this.deviceData = webSocketResponse;

          this.effectiveHttpRequestCount = this.devicesService.getHTTPRequestCount();
          this.isLoading = false;

          // Bugged out effectiveHttpRequestCount  (resolved but need find how it happened)
          console.log("[Websocket Response] Device Panel - effectiveHttpRequestCount (buggy) - ", webSocketResponse.effectiveHttpRequestCount);
          console.log("[Websocket Response] Device Panel - effectiveHttpRequestCount - ", this.effectiveHttpRequestCount);

          // If Http Request is more than N, refresh web app to prevent locking
          if(this.effectiveHttpRequestCount > 300){

            console.log("[App reload imminent]");
            location.reload();

          }

          // Declare condition variable to make it more readable
          // const webSocketResponseDoesNotContainError = !webSocketResponse.hasOwnProperty('errorMessage') || (webSocketResponse.errorMessage === null || webSocketResponse.errorMessage === undefined)
          const webSocketResponseDoesNotContainError = webSocketResponse?.errorMessage === null;

          // If there's no error message
          if(webSocketResponseDoesNotContainError){

            console.log("[Websocket Response] Device Panel - [Success] Refresh data", webSocketResponse);
            console.log("[Websocket Response] Device Panel - [Success] Effective HTTP Request Count", this.effectiveHttpRequestCount);

            var dataToPass = {
              ...webSocketResponse,
            }

            this.getHoloLensPowerStatus();


            this.statusNotificationService.logTask(dataToPass, 'Device Update Success', true);

            // Device Flag
            if(!this.deviceOnlineFlag){

              this.statusNotificationService.logTask(dataToPass, 'Device Online', true);
              this.deviceOnlineFlag = true;

            }

          }else{

            console.log("[Websocket Response] Device Panel - [Failed] Refresh data", webSocketResponse);
            // console.log("Device Panel - [Failed] Error Message", refreshedDeviceData?.errorMessage);

            // Log 'Device Timeout' thrice to ensure that it is not intermittent network that is causing failed data retrieval
            if(this.deviceUpdateTimeout < 3){

              this.statusNotificationService.logTask(webSocketResponse, 'Device Update Timeout', false);

              // Invoke method to get device status
              this.getHoloLensPowerStatus();

              this.deviceUpdateTimeout++;
              // this.devicesService.pushToOnlineHololensRecord(this.deviceData);


            }else{

              this.statusNotificationService.logTask(webSocketResponse, 'Device Offline', true);

              // Invoke method to get device status
              this.getHoloLensPowerStatus();

              // this.deviceUpdateTimeout = 0;
              this.deviceOnlineFlag = false;

            }

          }

        }

      },
      error:(error)=>{

        console.log("[Websocket Response] [Device Panel] [Websocket Error] - ", error);
      },
      complete:()=>{
        console.log("[Websocket Response] [Device Panel] [Websocket Transaction Complete]");

      }


    })

  }

  disconnectSocket(){

    this.webSocketService.disconnectSocket();

  }

  getHoloLensPowerStatus(): void{

    // Retrieve online status
    if (this.deviceData.isOnline) {

      const dataToPass:Device = {

        id: this.hlID,
        hostIP: this.hlAddress,
        deviceName: this.hlDeviceName,
        isOnline: true,
        isCharging: this.hlIsCharging,
        battLife: this.batteryLifePercentage,
        lowPowerState: this.hlLowPowerState

      }

      // acOnline = this.data[1].value.AcOnline;

      if(this.hlLowPowerState){

        this.hlOnlineStatus = 'Sleep';

      }else{

        this.hlOnlineStatus = 'Online';

      }

      console.log("Device Row - getHLOnlineStatus - (Online) dataToPass", dataToPass);

      // Emit latest device data back to parent (i.e Overview Page)
      try{

        this.onlineEvent.emit(this.deviceData);

      }catch(error){

        if(error instanceof TypeError){

          console.log("[Captured Error] Device Row - getHLPowerStatus - onlineEvent.emit(this.deviceData)", error);

        }

      }

    } else {

      const dataToPass:Device = {

        id: this.hlID,
        hostIP: this.hlAddress,
        deviceName: this.hlDeviceName,
        isOnline: false,
        isCharging: this.hlIsCharging,
        battLife: this.batteryLifePercentage,
        lowPowerState: this.hlLowPowerState

      }

      this.hlOnlineStatus = 'Offline'
      console.log("Device Row - getHLOnlineStatus - (Offline) dataToPass", dataToPass);

      // Emit latest device data back to parent (i.e Overview Page)
      try{

        this.onlineEvent.emit(this.deviceData);

      }catch(error){

        if(error instanceof TypeError){

          console.log("[Captured Error] Device Row - getHLPowerStatus - onlineEvent.emit(this.deviceData)", error);

        }

      }

      // this.offlineEvent.emit(dataToPass);

    }

  }

  openDeviceConfigPopUpDialog(){

    let popUpDialogRef = this.dialog.open(DeviceConfigComponent, {

      width: '400px',
      height:'400px'

    });

    popUpDialogRef.componentInstance.deviceData = this.deviceData;

  }

}
