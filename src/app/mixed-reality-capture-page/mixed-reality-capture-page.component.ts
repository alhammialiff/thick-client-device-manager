import { HololensAPIService } from './../services/hololens-api.service';
import { WebSocketService } from './../services/web-socket.service';
import { BehaviorSubject, Observable, Subscription, fromEvent, interval, switchMap } from 'rxjs';
import { DevicesService } from 'src/app/services/devices.service';
import { VideoStreamService } from './../services/video-stream.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { StatusNotificationsService } from './../services/status-notifications.service';
import { Component, ViewContainerRef, Type, ChangeDetectorRef, ViewChildren, QueryList, ViewChild, ElementRef, HostListener, EventEmitter } from '@angular/core';
import { InsertPlayHololensAppRowDirective } from '../directives/insert-play-hololens-app-row.directive';
import { PlayHololensAppRowComponent } from '../reusable-components/play-hololens-app-row/play-hololens-app-row.component';
import { Device } from '../models/device.model';
import { VideoStream } from '../models/video-stream';
import { ControlValueAccessor, FormControl, FormGroup, NG_ASYNC_VALIDATORS } from '@angular/forms';
import { filter } from 'cypress/types/bluebird';
import { P } from 'pino';

@Component({
  selector: 'app-mixed-reality-capture-page',
  templateUrl: './mixed-reality-capture-page.component.html',
  styleUrls: ['./mixed-reality-capture-page.component.scss']
})
export class MixedRealityCapturePageComponent implements ControlValueAccessor{

  @ViewChild(InsertPlayHololensAppRowDirective) insertPlayHololensAppRow!: InsertPlayHololensAppRowDirective | any;
  @ViewChild('gridStreamRow') gridStreamRow!: ElementRef;
  @ViewChild('appPlayingColumn') appPlayingColumn!: ElementRef;

  REGISTERED_DEVICES!: Device[];

  dynamicFormControls: any = {};
  gridStreamDevicesForm!: FormGroup;
  currentAvailableStreamDevice: any[] = [];
  currentPlayingAppArray: {
    playingApp: string|null;
    deviceName: string;
    hostIP: string;
    id: string
  }[] = [];
  gridStreamValues: any = {};
  gridStreamSelectionCount: number = 0;
  hasSelection: boolean = false;
  disabledRemainingUnchecked: boolean = false;
  reloadEventBroadcastChannel = new BroadcastChannel('MRC_VideoWindow_Reload_Channel');
  activeBroadcastChannel = new BroadcastChannel('MRC_VideoWindow_Active_Channel');
  videoWindowIsActive: boolean = false;

  videoStreamData!: any[];
  devicesData!: Device[];
  componentRef!: any;
  refreshedDeviceData!: Subscription;


  hideImportantNote: boolean = false;
  id: string = '';
  deviceName: string = '';
  hostIP: string = '';
  isOnline: boolean | undefined = false;
  isRegistered: boolean | undefined = false;
  isCharging: boolean | undefined | null = false;
  battLife: number = 0;
  lowPowerState: boolean | undefined = false;
  url: string = "";

  gridVideoWindows:any =[];

  activateWebSocket: boolean = false;

  constructor(private statusNotificationsService:StatusNotificationsService,
    private webSocketService: WebSocketService,
    private breakpointObserver:BreakpointObserver,
    private videoStreamService: VideoStreamService,
    private changeDetectorRef: ChangeDetectorRef,
    private devicesService: DevicesService,
    private hololensAPIService: HololensAPIService){}

  // [2308] STOP HEREEEE - VIDEOONERROR ISSUE WHEN REFRESH IN MRC PAGE
  //                       TO FIND OTHER WAYS TO SEND DATA TO VIDEO STREAMER
  //                       . TRY USING SERVICE AS A CONDUIT TO SENDING DATA FROM MRC TO VIDEO STREAMER COMP.
  ngOnInit(){


    // // (WEBSOCKET) Reconnect Socket
    // this.webSocketService.reconnectSocket();

    // (WEBSOCKET) Send API request with START signal to initiate HoloLens poll
    this.hololensAPIService.startDataPolling().subscribe({
      next:(response:any)=>{

        console.log("[MRC Page] START DATA POLLING - response", response);
        this.devicesService.listenToDeviceDataChange();


      },
      error:(error: any)=>{

        console.log("[MRC Page] START DATA POLLING - request error",error);

      },
      complete:()=>{

        console.log("[MRC Page] START DATA POLLING - request complete");

      }

    });

    // this.initializeSocketConnection(this.deviceName);
    // this.receiveSocketResponse(this.deviceName);

    // Obtain fragments of all device data (with vid stream properties)
    this.videoStreamData = [...this.videoStreamService.getAllVideoStreamerData()];

    this.devicesData = this.devicesService.getRegisteredDevices();

    console.log("MRC Page - (refresh) allDevicesData length", this.devicesData.length);

    if(this.devicesData.length > 1){

      console.log("MRC Page - (possibly from overview) this.devicesData", this.devicesData);

    // Retrieve from cache (Local Storage)
    }else{

      this.devicesData = this.devicesService.retrieveRegisteredDeviceFromStorage();
      console.log("MRC Page - (possibly page refreshed) this.devicesData", this.devicesData);

    }

    try{

      this.currentPlayingAppArray = JSON.parse(localStorage.getItem('currentPlayingAppArray') || '""');
      console.log("MRC Page - cachedCurrentPlayingApp", this.currentPlayingAppArray);

    }catch(e){

      console.log("MRC Page - currentPlayingAppArray retrieval - error",e);

    }

    console.log("MRC Page - Video Stream Data - ", this.videoStreamData);
    console.log("MRC Page - devicesData - ", this.devicesData);



    this.devicesData.forEach((device, index) => {

      try{

        this.url = "http://" + device.hostIP + "/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false";

        console.log("MRC Page - this.devicesData: ", this.devicesData);
        console.log("MRC Page - device: ", device);

        const lowPowerState = device.lowPowerState;


        // this.renderPlayHololensAppRow(device);


        // Set Form Controls if device is actively online (not asleep)
        if(device.isOnline && !lowPowerState){

          this.renderPlayHololensAppRow(device);


          this.dynamicFormControls = {

            ...this.dynamicFormControls,
            [device.deviceName]: new FormControl('')

          }

          console.log("MRC Page - dynamicFormControls: ", this.dynamicFormControls);

          // Push available device for streaming into record
          this.currentAvailableStreamDevice.push(device);


        }

      }catch(e){

        console.log("MRC Page - devicesData.forEach - error", e);

      }



    });

    this.gridStreamDevicesForm = new FormGroup(
      this.dynamicFormControls
    )

    // Define a Broadcast Channel between MRC Page and active Video Window/s
    this.reloadEventBroadcastChannel.onmessage = (event)=>{

      console.log(event);

    };

    this.activeBroadcastChannel.onmessage = (event)=>{

      // Set videoWindowIsActive flag to true if truthy flag is received
      if(event.data?.videoWindowIsActive !== undefined){

        this.videoWindowIsActive = event.data?.videoWindowIsActive;

      }

    }

    this.videoStreamService.videoWindowHasClosedEmitter.subscribe({
      next: (emittedData:any)=>{

        console.log("MRC Page - windowHasClosedEmitter - emittedData", emittedData);
        window.location.reload();

      },
      error: (error:any)=>{

        console.log("Error:", error);

      },
      complete: ()=>{

        console.log("Complete");

      }
    });



  }

  ngAfterViewInit(){

    this.videoStreamData.forEach((deviceSubject)=>{

      console.log("MRC Page - ngAfterViewInit - deviceSubject", deviceSubject);
      console.log("MRC Page - ngAfterViewInit - device isOnline?", deviceSubject._value.deviceData.isOnline);



      // If HL2 is not asleep or offline
      if(deviceSubject._value.deviceData.isOnline && !deviceSubject._value.deviceData.lowPowerState){

        this.renderPlayHololensAppRow(deviceSubject);

      }

    });


    // [STOP HERE] 3/4/2024 - The idea is to add more form controls as device appear online. But
    //                        newly added form control is not detected by app
    this.devicesService.deviceUpdate.subscribe({
      next: (device: Device)=>{

        // Use filter to determine if device is already in record (i.e currentAvailableStreamDevice)
        const deviceInRecord = this.currentAvailableStreamDevice
          .filter(recordedDevice => recordedDevice.deviceName === device.deviceName);

        console.log("MRC Page Websocket Device Update- Device", device);
        console.log("MRC Page Websocket Device Update- this.currentAvail...device?", this.currentAvailableStreamDevice);
        console.log("MRC Page Websocket Device Update- deviceInRecord?", deviceInRecord);

        // [NOTE] This is an important condition so that the checkbox does not get updated every
        //        firing of new data in this subscription
        //        Condition: If the device is NOT in the currentAvailableStreamDevice Record,
        //                   don't update Form Control (to avoid change detection to be triggered on Form)
        if(deviceInRecord.length < 1){


          // this.changeDetectorRef.detectChanges();


          // [!!!] Must add a condition that only detects new online device
          //       and not existing ones
          //       Tmr: Can use a temporary array to store stream devices
          if(device?.isOnline && !(device.lowPowerState)){

            this.dynamicFormControls = {

              ...this.dynamicFormControls,
              [device.deviceName]: new FormControl('')

            };

            console.log("(If) MRC Page Websocket Device Update- Updated Form Control", this.dynamicFormControls);

            this.gridStreamDevicesForm = new FormGroup(
              this.dynamicFormControls
            );

            // this.renderPlayHololensAppRow(device);

            // // Reload MRC Page to stably display all information
            // // This is important because sometimes playHololensAppRow is not rendered when a device is online
            setTimeout(()=>{

              location.reload();

            },2000);

          }

        // Device in record
        }else{

          console.log("(Else) MRC Page Websocket Device Update");


          // If device is no longer online, delete it from record
          if(!device.isOnline){

            //  Get index of device in record
            const index = this.currentAvailableStreamDevice.indexOf(device);
            console.log("(Else) MRC Page Websocket Device Update - device", index);

            //  Remove record by splicing
            this.currentAvailableStreamDevice.splice(index,1);

            console.log("(Else) MRC Page Websocket Device Update - currentAvail...Device (After Splice)", this.currentAvailableStreamDevice);

          }

        }



      },
      error: (error: any)=>{

        console.log("MRC Page Websocket Device Update- Error", error);

      },
      complete: ()=>{

        console.log("MRC Page Websocket Device Update - Complete");

      },
    })

    this.gridStreamDevicesForm.valueChanges.subscribe((value)=>{

      this.gridStreamValues = value;
      this.gridStreamSelectionCount = Object.keys(this.gridStreamValues).length;

      console.log("MRC Page - gridStreamDevicesForm - Selections", this.gridStreamValues);


      for(const [key,value] of Object.entries(this.gridStreamValues)){

        // [Experimenting on inverse selection count]
        // If there are unchecked option minus it from gridStreamSelectionCount
        if(!value){

          this.gridStreamSelectionCount -= 1;

        }

        console.log("MRC Page - gridStreamDevicesForm - Grid Selection Count", this.gridStreamSelectionCount);


      }

      this.hasSelection = this.gridStreamSelectionCount > 0;
      // this.disabledRemainingUnchecked = this.gridStreamSelectionCount === 4;

      // Routine to re-enable disabled unchecked boxes
      // One eg of usecase  - This is when user has selected 4 hololens, but realises some is selected by mistake,
      //                      and user unselect the wrong ones for the right one
      if(this.gridStreamSelectionCount >= 0 && this.gridStreamSelectionCount < 4){

        this.disabledRemainingUnchecked = false;

        // console.log("MRC Page - gridStreamDevicesForm - Grid Selection Count", this.grid);
        for(const [key,value] of Object.entries(this.gridStreamDevicesForm.getRawValue())){

          console.log("MRC Page - gridStreamDevicesForm (0 && < 4 Selected) Grid Stream Device Form ", this.gridStreamDevicesForm.getRawValue());

          if(this.gridStreamDevicesForm.controls[key].disabled){

            this.gridStreamDevicesForm.controls[key]?.enable();

          }

        }


      // Routine to disable unchecked boxes
      // This is to prevent use from selecting more than 4 hololens to stream
      }else if(this.gridStreamSelectionCount === 4){

        this.disabledRemainingUnchecked = true;

        for(const [key,value] of Object.entries(this.gridStreamValues)){

          // [Experimenting on inverse selection count]
          // If there are unchecked option minus it from gridStreamSelectionCount
          if(value === '' || value === false){

            this.gridStreamDevicesForm.controls[key]?.disable();

          }

          console.log("MRC Page - gridStreamDevicesForm (4 Selected) - Grid Stream Values", key, value);

        }


      }

    });

    // this.changeDetectorRef.detectChanges();



  }

  ngDoCheck(){

    // this.gridStreamDevicesForm.valueChanges.subscribe((value)=>{

    //   this.gridStreamValues = value;
    //   this.gridStreamSelectionCount = Object.keys(this.gridStreamValues).length;

    //   for(const [key,value] of Object.entries(this.gridStreamValues)){

    //     // [Experimenting on inverse selection count]
    //     // If there are unchecked option minus it from gridStreamSelectionCount
    //     if(!value){

    //       this.gridStreamSelectionCount -= 1;

    //     }

    //     console.log("MRC Page - gridStreamDevicesForm - Grid Selection Count", this.gridStreamSelectionCount);


    //   }

    //   this.hasSelection = this.gridStreamSelectionCount > 0;
    //   this.disabledRemainingUnchecked = this.gridStreamSelectionCount === 4;

    //   // [TO TEST 30/10] To work on disabling remaining unchecked boxes
    //   if(this.gridStreamSelectionCount === 4){

    //     this.disabledRemainingUnchecked = true;

    //   };

    // });

  }

  ngOnDestroy(){

    console.log("[ngOnDestroy] MRC Page");

    try{

      this.refreshedDeviceData?.unsubscribe();

      // (WEBSOCKET) Send API request with STOP signal to stop HoloLens poll
      this.hololensAPIService.stopDataPolling('mixed-reality-capture-page').subscribe({
        next:(response:any)=>{

          console.log("[MRC Page] STOP DATA POLLING - response", response);
          // this.devicesService.unsubscribeToDeviceDataChange();
          this.componentRef?.destroy();


        },
        error:(error: any)=>{

          console.log("[MRC Page] STOP DATA POLLING - request error",error);

        },
        complete:()=>{

          console.log("[MRC Page] STOP DATA POLLING - request complete");

        }

      });

      // [WEBSOCKET]
      // this.devicesService.unsubscribeToDeviceDataChange();


    }catch(error){

      console.log("MRC Page - [ngOnDestroy] error", error);

    }

  }


  // ==========================================
  // [WEBSOCKET DEV]
  // ==========================================
  // initializeSocketConnection(deviceName: string){

  //   this.webSocketService.connectSocket();

  // }

  // receiveSocketResponse(deviceName: string){

  //   this.webSocketService.receiveStatus().subscribe({

  //     next: (allDevicesData: any)=>{

  //       if(allDevicesData?.length > 1){

  //         console.log("MRC Page - (possibly from overview) All Devices Data", allDevicesData);

  //         // Pass device data to class variable
  //         this.devicesData = allDevicesData;

  //       // Retrieve from cache (Local Storage)
  //       }else{

  //         this.devicesData = this.devicesService.retrieveRegisteredDeviceFromStorage();
  //         console.log("MRC Page - (possibly page refreshed) All Devices Data", allDevicesData);

  //       }

  //       console.log("MRC Page - Video Stream Data - ", this.videoStreamData);
  //       console.log("MRC Page - devicesData - ", this.devicesData);

  //       this.devicesData.forEach((device, index) => {

  //         // Is this necessary? Passing each var to the respective variables?
  //         this.id = device.id;
  //         this.deviceName = device.deviceName;
  //         this.hostIP = device.hostIP;
  //         this.isOnline = device.isOnline;
  //         this.isRegistered = device.isRegistered;
  //         this.isCharging = device.isCharging;
  //         this.battLife = device.battLife;
  //         this.lowPowerState = device.lowPowerState;
  //         this.url = "http://" + device.hostIP + "/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false";

  //         this.renderPlayHololensAppRow(device);

  //         try{

  //           // Set values in Observable
  //           this.videoStreamData[index].next({

  //             playStream: true,
  //             hlVideoStreamingUrl: this.url,
  //             deviceData: {

  //               id: this.id,
  //               deviceName: this.deviceName,
  //               battLife: this.battLife,
  //               hostIP: this.hostIP,
  //               isOnline: this.isOnline,
  //               isRegistered: this.isRegistered,
  //               isCharging: this.isCharging,
  //               lowPowerState: this.lowPowerState

  //             },
  //             isLoading: false

  //           });

  //         }catch(error){

  //           console.log("[CAPTURED ERROR] this.videoStreamData[index] is causing the issue: ", error);
  //           console.log("[CAPTURED ERROR] this.videoStreamData[index]: ", this.videoStreamData);

  //         }

  //         console.log("MRC Page - this.devicesData: ", this.devicesData);

  //         // Set Form Controls if device is actively online (not asleep)
  //         if(device.isOnline && !(device.lowPowerState)){

  //           this.dynamicFormControls = {

  //             ...this.dynamicFormControls,
  //             [device.deviceName]: new FormControl('')

  //           }

  //           console.log("MRC Page - dynamicFormControls: ", this.dynamicFormControls);

  //         }

  //       });

  //       this.gridStreamDevicesForm = new FormGroup(this.dynamicFormControls);


  //       console.log("MRC Page - dynamicFormControls: ", this.dynamicFormControls);

  //       // this.changeDetectorRef.detectChanges();

  //     },
  //     error: (error)=>{


  //     },
  //     complete: ()=>{


  //     }

  //   });


  // }

  // disconnectSocket(){

  //   this.webSocketService.disconnectSocket();

  // }

  // IMPORTANT NOTE 26/12 -
  // Video Streamer Component is repurposed into Play Hololens App Row Component
  // We no longer need to pass
  // Heavy refactoring commences from 26/12/23
  renderPlayHololensAppRow(deviceSubject: BehaviorSubject<VideoStream> | Device){

    try{

      const formContainerReference = this.insertPlayHololensAppRow;

      console.log("MRC Page - renderPlayHololensAppRow - this.insertVideoStreamer ", this.insertPlayHololensAppRow);
      console.log("MRC Page - renderPlayHololensAppRow - formContainerReference ", formContainerReference);

      // this.videoStreamData.forEach((data: any, index: any)=>{

        const insertVideoStreamingContainer = formContainerReference.viewContainerRef;

        const videoStreamer = new PlayHololensAppRow(PlayHololensAppRowComponent, deviceSubject);

        this.componentRef = insertVideoStreamingContainer.createComponent(videoStreamer.component);

        // [23/08 GOT PROBLEM HERE - Sometimes data is passed to Video Streamer Comp. Sometimes no]
        this.componentRef.instance.videoStreaming$ = videoStreamer.data;
        // this.componentRef.instance.deviceData = data;



      // });


    }catch(error){

      console.log("MRC Page - renderVideoStreamer - TypeError", error);

      if(error instanceof TypeError){

        console.log("MRC Page - renderVideoStreamer - TypeError", error);

      }

    }

    if(this.componentRef){

      this.componentRef.instance.playingAppEmitter.subscribe((dataFromVideoStreamer: any)=>{

        console.log("MRC Page - playingAppEmitter - dataFromVideoStreamer - ", dataFromVideoStreamer);

        if(dataFromVideoStreamer !== null || dataFromVideoStreamer !== undefined){

          this.devicesData.forEach((device, index)=>{

            if(device.id === dataFromVideoStreamer.id){

              // If app is playing, add playing app it in currentPlayingAppArray record
              if(dataFromVideoStreamer.isPlaying){

                this.devicesData[index].playingApp = dataFromVideoStreamer.appDisplayName;
                this.currentPlayingAppArray[index] = {
                  playingApp: dataFromVideoStreamer.appDisplayName,
                  deviceName: device.deviceName,
                  hostIP: device.hostIP,
                  id: device.id
                };

              // Otherwise, remove playing app from record
              }else{

                this.currentPlayingAppArray[index] = {
                  playingApp: null,
                  deviceName: device.deviceName,
                  hostIP: device.hostIP,
                  id: device.id
                }


              }

              // Cache current playing app into Local Storage
              // This is important because when another HL is added during session, MRC Page refreshes for stability
              // Refreshing makes the playing app disappear. Thus, to persist playing app between refresh, caching is necessary
              localStorage.setItem('currentPlayingAppArray',JSON.stringify(this.currentPlayingAppArray));

            }

          });

        }

      });

    }



  }

  toggleHideImportantNote = ()=>{

    this.hideImportantNote = true;
    this.changeDetectorRef.detectChanges();

  }

  startSoloStream = (deviceData: any)=>{

    console.log("MRC Page - Solo Stream clicked - deviceData", deviceData);

    this.openVideoWindow([deviceData]);

  }


  startGridStream = ()=>{

    let devicesToStream = [];

    // Iterate selected Hololens to grid stream and obtain its deviceData
    for(const [key, value] of Object.entries(this.gridStreamValues)){

      if(value){

        // Device data of the HLs to pass to video window on Grid Stream
        devicesToStream.push(this.devicesData.filter((device)=> device.deviceName === key)[0]);

      }

    }

    console.log("MRC Page - devicesToStream - ", devicesToStream);

    // Emit deviceData to Video Streamer component
    // This is to infd individual Video Streamer to pause video
    this.videoStreamService.broadcastGridStreamCommencement(devicesToStream);

    this.openVideoWindow(devicesToStream);


  }

  openVideoWindow = (devicesToStream: Device[])=>{

    // Var to define scale of video window width & height
    var widthScale = 0;
    var heightScale = 0;

    console.log("Open Video Window");
    console.log("Open Video Window - window.origin: ", window.origin);

    // Perform switch case to set scaling values (Eg. 4 devices = 2x2 grid = heightScale 2 & widthScale 2)
    switch(devicesToStream.length){

      case 1:

        widthScale = 1;
        heightScale = 1;
        break;

      case 2:

        widthScale = 2;
        heightScale = 1;
        break;

      case 3:

        widthScale = 2;
        heightScale = 2;
        break;

      case 4:

        widthScale = 2;
        heightScale = 2;
        break;

      default:

        widthScale = 1;

    }


    var videoWindowIsOpened = false;

    devicesToStream.forEach((device, index)=>{

      const videoWindowURL = `${window.origin}/video-window/${device.id}`;
      var xPos = 0;
      var yPos = 0;

      console.log("MRC Page - index modulo -", index%2);
      console.log("MRC Page - screen.width - ",index, screen.width);
      console.log("MRC Page - screen.availWidth - ",index, screen.availWidth);
      console.log("MRC Page - window.innerWidth - ",index, window.innerWidth);
      console.log("MRC Page - window.outerWidth - ",index, window.outerWidth);

      // Opens a blank window with only the video.
      // NOTE: This algo only supports 4 live streams
      if(index%2 === 0){

        console.log("MRC Page - index should be even -", index);

        if(index === 0){

          yPos = 0;
          console.log("MRC Page - index modulo -", index%2);


        // Index -
        }else{

          // yPos = screen.availHeight/2;
          // yPos = window.outerHeight/2;
          yPos = (window.screen.height*window.devicePixelRatio)/2 + 50;
          console.log("MRC Page - (DPR) yPos - ",index, yPos);

        }

      }else{

        // xPos = screen.width/2; [UNCOMMENT TO REVERT CHANGE]
        xPos = (window.screen.width*window.devicePixelRatio)/2;
        console.log("MRC Page - (DPR) xPos - ",index, xPos);

        // xPos = window.outerWidth/2;

        console.log("MRC Page - index should be odd -", index);

        if(index === 1){

          yPos = 0;
          console.log("MRC Page - index modulo -", index%2);
          // console.log("MRC Page - window.outerWidth -", window.outerWidth);

        }else{

          // yPos = screen.availHeight/2;
          // yPos = window.outerHeight/2; [UNCOMMENT TO REVERT CHANGE]
          yPos = (window.screen.height*window.devicePixelRatio)/2;

        }


      }

      console.log(`MRC Page - check xPos & yPos - x:${xPos},y: ${yPos}`);
      console.log(`MRC Page - gridValue:${widthScale}`);
      console.log(`MRC Page - WIDTH:${screen.width/widthScale},HEIGHT: ${screen.availHeight/heightScale}`);
      console.log(`MRC Page - Avail WIDTH:${screen.availWidth/widthScale}`);
      console.log(`MRC Page - (DPR) WIDTH:${(window.screen.width*window.devicePixelRatio)/widthScale},HEIGHT: ${(window.screen.height*window.devicePixelRatio)/heightScale}`);


      // var videoWindow: any = window.open(videoWindowURL, '_blank', `width=${window.innerWidth/widthScale}, height=${screen.availHeight/heightScale}, left=${xPos}, top=${yPos}`);
      // var videoWindow: any = window.open(videoWindowURL, '_blank', `width=${window.screen.width/widthScale}px, height=${window.screen.availHeight/heightScale}px, left=${xPos}, top=${yPos}`);
      var videoWindow: any = window.open(videoWindowURL,
                                        `VideoWindow${index}`,
                                        // `width=${(window.screen.width/widthScale)-10} [UNCOMMENT TO REVERT CHANGE]
                                        //  height=${(screen.availHeight/heightScale)-78} [UNCOMMENT TO REVERT CHANGE]
                                        `width=${((window.screen.width*window.devicePixelRatio)/widthScale)-8},
                                        height=${index===2 || index===3?((window.screen.height*window.devicePixelRatio)/heightScale)-107:((window.screen.height*window.devicePixelRatio)/heightScale)-78},
                                        left=${xPos},
                                        top=${yPos}
                                        location=no,
                                        addressbar=no`);

      if(this.videoWindowIsActive){

        this.activeBroadcastChannel.postMessage({
          videoWindowIsSpawning: true
        })

      }

      if(videoWindow){

        videoWindow.onload = () => {

          // Invoke sendMessage function to pass data to Video Window
          this.sendMessage(device, videoWindowURL, videoWindow, index);


          // Reload this page
          // window.location.reload();

          // Pause video
          videoWindowIsOpened = true;
          // this.mrcStreamer.nativeElement.pause();
          console.log("In-DOM video paused");

        };


        // Create an observable event to subscribe for Video Window 'window close' message
        // let videoWindowCloseStream = fromEvent(videoWindow, 'message');

        // videoWindowCloseStream.subscribe((event: any)=>{

        //   console.log("Message from Video Window received - ", event);

        //     if(event.data.windowHasClosed){

        //       videoWindowIsOpened = false;
        //       console.log("Message from Video Window received - videoWindowIsOpened ", videoWindowIsOpened);

        //     }

        // });

      }


    });





  }

  sendMessage = async (deviceData: Device, URL: string, videoWindow: Window, deviceIndex: number)=>{

    console.log("MRC Page - sendMessage() - deviceData", deviceData);
    console.log("MRC Page - sendMessage() - URL", URL);
    console.log("MRC Page - sendMessage() - videoWindow", videoWindow);
    console.log("MRC Page - sendMessage() - deviceIndex", deviceIndex);

    try{

      var finalDeviceData = {

        id: deviceData.id,
        hostIP: deviceData.hostIP,
        deviceName: deviceData.deviceName,
        videoURL: "http://"+deviceData.hostIP+"/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false",
        playingHololensApp: deviceIndex < this.currentPlayingAppArray.length? this.currentPlayingAppArray[deviceIndex]?.playingApp: ''

      }


      if(videoWindow){


        // [KIV] Currently emitted event does not reach video window. Might delete
        this.videoStreamService.broadcastGridStreamCommencement(finalDeviceData);

        // Perform postMessage to pass data
        // as videoWindow is no longer in the same DOM as this app
        // (cannot pass data using DI)
        videoWindow.postMessage(
          {
            dataToPass: finalDeviceData,
          },
        URL);

      }

    }catch(e){

      console.log("MRC Page - sendMessage - error ",e);

    }

  }

  @HostListener('window:beforeunload')
  sendReloadSignalToActiveVideoWindow = () => {

    this.reloadEventBroadcastChannel.postMessage({
      reload: true
    })

    setTimeout(()=>{

    }, 5000);

  }

  // ===========================
  // Custom Reactive Form: Required Control Value Accessor method
  // ===========================
  writeValue(value:any){

    // this.selectedValue = value;
    // console.log("Tree Hierarchy Component - writeValue - value", this.selectedValue);

  }

  // Required CVA method
  registerOnChange(onChange: any){

    // this.onFormValueChange = onChange;
    console.log("Tree Hierarchy Component - registerOnChange - onChange", onChange);

  }

  // Required CVA method
  registerOnTouched(callback:any){

    // this.onTouch = callback;

  }

  // Method to bind (click) and supplement CVA methods
  onSelect(event: any){
    console.log("Tree Hierarchy Component - onSelect - $event", event.target.innerText);

    // this.selectedValue = event.target.innerText;
    // this.onFormValueChange(this.selectedValue);

  }

}

window.addEventListener('message', (event)=>{

  if(event.data?.windowHasClosed){

    console.log("Video Window Message Event Listener - close event detected");

    window.location.reload();

  }

})


class PlayHololensAppRow{
  constructor(public component: Type<any>, public data: any){};
}
