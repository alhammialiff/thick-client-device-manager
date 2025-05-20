import { WebSocketService } from './../../services/web-socket.service';
import { DevicePanelOverlayMouseTrackerService } from './../../services/device-panel-overlay-mouse-tracker.service';
import { ModalDialogService } from './../../services/modal-dialog.service';
import { Component, EventEmitter, Output, ChangeDetectorRef, HostListener, ComponentRef, ViewChild, Injector, InjectionToken } from '@angular/core';
// import { Overlay, CdkOverlayOrigin, OverlayConfig, OverlayRef, OverlayPositionBuilder, OverlayContainer } from '@angular/cdk/overlay';
import { Router } from '@angular/router';
import { Observable, Subscription, concatMap, finalize, interval, mergeMap, switchMap, takeUntil, tap, of, map, Subject, throwError } from 'rxjs';

import { HololensAPIService } from 'src/app/services/hololens-api.service';
import { DevicesService } from 'src/app/services/devices.service';
import { Device } from 'src/app/models/device.model';
import { BrowserResolutionObserverService } from 'src/app/services/browser-resolution-observer.service';
import { StatusNotificationsService } from 'src/app/services/status-notifications.service';
import { DeviceConfigComponent } from '../device-config/device-config.component';
import { MatDialog } from '@angular/material/dialog';
import { DeviceDetailsComponent } from 'src/app/device-details/device-details.component';
import { ComponentPortal } from '@angular/cdk/portal';
import { SettingsService } from 'src/app/services/settings.service';
import { transition, trigger, style, animate, state } from '@angular/animations';
import { relative } from 'path';

export const dataFromDevicePanel = new InjectionToken<string>('overlay-data');

@Component({
  selector: 'app-device-panel',
  templateUrl: './device-panel.component.html',
  styleUrls: ['./device-panel.component.scss'],
  animations:[
    trigger(
      'enterAnimation', [
        state('open',
          style({
            opacity: 1,
            zIndex: 10
          }),
        ),
        state('closed',
          style({
            opacity: 0,
            zIndex: 10
          }),
        ),
        transition('open=>closed',[
          // animate('500ms', style({opacity:1}))
          animate('200ms')
        ]),
        transition('closed=>open',[
          animate('200ms')
        ]),

      ]
    ),
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
export class DevicePanelComponent {

  @Output() onlineEvent = new EventEmitter<any>();
  @Output() offlineEvent = new EventEmitter<any>();
  @Output() batteryLowEvent = new EventEmitter<any>();
  @Output() deviceDetailsNavEvent = new EventEmitter<any>();

  // [NOTE 1803] To add Device types into deviceData
  deviceData!: any;
  effectiveHttpRequestCount: number = 0;
  pauseDeviceDataRefresh= new Subject<boolean>();
  errorMessage: string | null = null;
  panelIsHidden: boolean = false;

  hlID: any;
  hlName: any;
  hlIsCharging: any;
  hlOnlineStatus!: any;
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
  updateFlash:boolean = false;
  devicePanelBGColor!: Object;

  deviceOnlineFlag: boolean = false;
  deviceUpdateTimeout: number = 0;
  listenToWebsocket!: Subscription;


  // Overlay flag
  showDevicePanelOverlay: boolean = false;

  notification: any;

  // Breakpoints
  currentBreakpoint!: string;
  isExtraSmall:boolean = false;
  isSmall:boolean = false;
  isMedium:boolean = false;
  isLarge:boolean = false;
  isExtraLarge:boolean = false;

  constructor(private hololensAPIService: HololensAPIService,
      private settingsService: SettingsService,
      private webSocketService: WebSocketService,
      private devicesService: DevicesService,
      private browserResolutionObserver: BrowserResolutionObserverService,
      private statusNotificationService: StatusNotificationsService,
      private changeDetectorRef: ChangeDetectorRef,
      public dialog: MatDialog,
      private router: Router){}

  ngOnInit(){


    // [WEBSOCKET DEV] ================================

    console.log("Device Panel [Ng On Init]");
    console.log("Device Panel - data (init) - ", this.deviceData);

    this.hlAddress = this.deviceData.hostIP;
    this.hlDeviceName = this.deviceData.deviceName;
    this.hlComputerHostName = this.deviceData.hostComputerName;
    this.batteryLifePercentage = this.deviceData.battLife;
    this.hlIsCharging = this.deviceData.isCharging;
    this.hlID = this.deviceData.id;
    this.hlLowPowerState = this.deviceData.lowPowerState;
    this.enableUpdateFlash = this.deviceData.updateFlash;
    this.deviceUpdateInterval = this.deviceData.deviceUpdateInterval? this.deviceData.deviceUpdateInterval * 1000: 10000;

    // [WEBSOCKET DEV] ================================
    // this.initializeSocketConnection(this.hlDeviceName);
    // this.receiveSocketResponse(this.hlDeviceName);
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


    // [Future ref] Create a portal injector to pass data
    // this.portalInjector = Injector.create({
    //   providers: [{provide: dataFromDevicePanel, useValue: this.hlID}]
    // });


    // ----------------------------------------------------
    // [COMMENTED] REST API POLLING
    // HoloLens Device Data Refresh Subscription
    // Fire Device Data Refresh every 10000ms
    // ----------------------------------------------------
    // this.intervalBasedRefreshSubscription = interval(this.deviceUpdateInterval).
    //   pipe(

    //     concatMap(()=>{

    //       return this.devicesService.refreshDeviceData(
    //         {
    //           id: this.hlID,
    //           hlAddress: this.hlAddress,
    //           hlDeviceName: this.hlDeviceName,
    //           hlComputerHostName: this.hlComputerHostName
    //         }
    //       )
    //     }),

    //     tap(()=>{
    //       console.log("Device Panel - device update interval - this.deviceUpdateInterval", this.deviceUpdateInterval);
    //       console.log("Device Panel - Check for updateFlash setting - ", this.enableUpdateFlash);

    //       // Check if updateFlash (set/cached in/from Settings Configs) is enabled
    //       if(this.enableUpdateFlash){

    //         this.updateFlash = true;

    //         setInterval(()=>{

    //           this.updateFlash = false;

    //         }, 1000);

    //       }


    //     })
    //   )
    //   .subscribe({

    //     next: (refreshedDeviceData: Device)=>{

    //       // Retrieve Hololens Status
    //       try{

    //         this.deviceData = refreshedDeviceData;
    //         this.effectiveHttpRequestCount = this.devicesService.getHTTPRequestCount();
    //         this.isLoading = false;

    //         // Bugged out effectiveHttpRequestCount  (resolved but need find how it happened)
    //         console.log("Device Panel - effectiveHttpRequestCount (buggy) - ", refreshedDeviceData.effectiveHttpRequestCount);
    //         console.log("Device Panel - effectiveHttpRequestCount - ", this.effectiveHttpRequestCount);

    //         // If Http Request is more than N, refresh web app to prevent locking
    //         if(this.effectiveHttpRequestCount > 300){

    //           console.log("[App reload imminent]");
    //           location.reload();

    //         }

    //         // If there's no error message
    //         if(!refreshedDeviceData.hasOwnProperty('errorMessage') || (refreshedDeviceData.errorMessage === null || refreshedDeviceData.errorMessage === undefined)){

    //           console.log("Device Panel - [Success] Refresh data", refreshedDeviceData);
    //           console.log("Device Panel - [Success] Effective HTTP Request Count", this.effectiveHttpRequestCount);

    //           var dataToPass = {
    //             ...refreshedDeviceData,
    //           }

    //           this.getHoloLensPowerStatus();


    //           this.statusNotificationService.logTask(dataToPass, 'Device Update Success', true);

    //           // Device Flag
    //           if(!this.deviceOnlineFlag){

    //             this.statusNotificationService.logTask(dataToPass, 'Device Online', true);
    //             this.deviceOnlineFlag = true;

    //           }

    //         }else{

    //           console.log("Device Panel - [Failed] Refresh data", refreshedDeviceData);
    //           // console.log("Device Panel - [Failed] Error Message", refreshedDeviceData?.errorMessage);

    //           // Log 'Device Timeout' thrice to ensure that it is not intermittent network that is causing failed data retrieval
    //           if(this.deviceUpdateTimeout < 3){

    //             this.statusNotificationService.logTask(refreshedDeviceData, 'Device Update Timeout', false);

    //             // Invoke method to get device status
    //             this.getHoloLensPowerStatus();

    //             this.deviceUpdateTimeout++;
    //             // this.devicesService.pushToOnlineHololensRecord(this.deviceData);


    //           }else{

    //             this.statusNotificationService.logTask(refreshedDeviceData, 'Device Offline', true);

    //             // Invoke method to get device status
    //             this.getHoloLensPowerStatus();

    //             // this.deviceUpdateTimeout = 0;
    //             this.deviceOnlineFlag = false;

    //           }

    //         }

    //         // Update online status back to devices service
    //         // this.devicesService.pushToOnlineHololensRecord(this.deviceData);


    //       }catch(e){

    //         console.log("Device Panel - [Failed] Error", e);
    //         // console.log("Device Panel - [Failed] Error Message", refreshedDeviceData?.errorMessage);

    //       }

    //     },

    //     error: (error)=>{

    //       console.log("Device Panel - [Error] Refresh data", error);

    //       if(error.hasOwnProperty('errorMessage')){

    //         this.isOnline = false;

    //       }

    //     },

    //     complete: ()=>{

    //       console.log("Device Panel - [Complete] Refresh data");

    //     }


    //   });

    // ----------------------------------------------------
    // Device Config Change Subscription
    // ----------------------------------------------------
    this.devicesService.deviceConfigChange.subscribe((deviceData:Device)=>{

      if(this.hlID === deviceData.id){

        this.hlAddress = deviceData.hostIP;
        this.hlDeviceName = deviceData.deviceName;
        this.hlComputerHostName = deviceData.hostComputerName;
        this.batteryLifePercentage = deviceData.battLife;
        this.hlIsCharging = deviceData.isCharging;
        this.hlID = deviceData.id;


      }

    });



  }

  ngAfterViewInit(){

    this.setDevicePanelOverlayFlagToFalse();

    this.browserResolutionObserver
      .getBreakpointObserver()
      .subscribe((result)=>{

        for(const query of Object.keys(result.breakpoints)){

          const queryExists = result.breakpoints[query];

          console.log("Device Panel - breakpoint query ", result.breakpoints);

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


    // Subscribe to broadcast message of all device panels
    // If other device panel overlay is activated, close this one
    // (This resolve is to address overlay that remains in view even after mouse no longer hovers on it)
    this.devicesService.devicePanelOverlayEvent.subscribe((message:any)=>{

      console.log("DEVICE PANEL OVERLAY - ", message);

      if(message?.panel !== this.hlDeviceName){

        this.setDevicePanelOverlayFlagToFalse();

      }

    })

  }

  ngOnDestroy(){

    console.log("[Device Panel] - [Ng On Destroy]");

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
            if(this.deviceUpdateTimeout < 2){

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

  setDevicePanelOverlayFlagToTrue(){

    console.log("Mouseenter");

    if(!this.showDevicePanelOverlay){

      this.showDevicePanelOverlay = true;
      this.changeDetectorRef.detectChanges();

    }

    console.log("Device Panel - setDevicePanelOverlayFlagToTrue - ", this.showDevicePanelOverlay);

    // Send broadcast to other device panel instances that overlay for this panel instance is activated
    const broadcastMessage = {
      panel: this.hlDeviceName,
      overlay: true
    }

    this.devicesService.broadcastOverlayEvent(broadcastMessage);

  }

  setDevicePanelOverlayFlagToFalse(){

    console.log("Mouseleave");

    if(this.showDevicePanelOverlay){

      this.showDevicePanelOverlay = false;
      this.changeDetectorRef.detectChanges();

    }

    console.log("Device Panel - setDevicePanelOverlayFlagToFalse - ", this.showDevicePanelOverlay);

  }


  getHoloLensPowerStatus(): void{

    // Retrieve online status
    if (this.deviceData.isOnline) {

      if(this.hlLowPowerState){

        this.hlOnlineStatus = 'Sleep';

      }else{

        this.hlOnlineStatus = 'Online';

      }

      // console.log("Device Panel - getHLOnlineStatus - (Online) dataToPass", dataToPass);
      console.log("Device Panel - getHLOnlineStatus - (Online) dataToPass -- ", this.deviceData);

      // Emit latest device data back to parent (i.e Overview Page)
      try{

        this.onlineEvent.emit(this.deviceData);

      }catch(error){

        if(error instanceof TypeError){

          console.log("[Captured Error] Device Panel - getHLPowerStatus - onlineEvent.emit(this.deviceData)", error);

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
      console.log("Device Panel - getHLOnlineStatus - (Offline) dataToPass", dataToPass);

      // Emit latest device data back to parent (i.e Overview Page)
      try{

        this.onlineEvent.emit(this.deviceData);

      }catch(error){

        if(error instanceof TypeError){

          console.log("[Captured Error] Device Panel - getHLPowerStatus - onlineEvent.emit(this.deviceData)", error);

        }

      }

    }

  }

  openDeviceConfigPopUpDialog(){

    let popUpDialogRef = this.dialog.open(DeviceConfigComponent, {

      width: '500px',
      height:'500px'

    });

    popUpDialogRef.componentInstance.deviceData = this.deviceData;

    popUpDialogRef.afterClosed().subscribe(result=>{

      console.log("Popup Dialog Ref - after close - ",result);

    })

  }

  openDeviceDetailsSection(){

    this.router.navigate(['/started/overview', this.hlID]);
    this.deviceDetailsNavEvent.emit({nav: true});

  }



}
