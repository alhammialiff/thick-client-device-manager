import { BrowserAgentResolverService } from '../../services/browser-agent-resolver.service';
import { VideoStreamService } from '../../services/video-stream.service';
import { DevicesService } from 'src/app/services/devices.service';
import { StatusNotificationsService } from 'src/app/services/status-notifications.service';
import { Component, ElementRef, Input, ViewChild, ChangeDetectorRef, HostListener, NgZone, Output, EventEmitter } from '@angular/core';
import { Observable, Subscription, catchError, fromEvent, interval, switchMap, takeUntil, takeWhile } from 'rxjs';
import { Device } from 'src/app/models/device.model';
import { VideoStream } from 'src/app/models/video-stream';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { HololensAPIService } from 'src/app/services/hololens-api.service';

@Component({
  selector: 'app-play-hololens-app-row',
  templateUrl: './play-hololens-app-row.component.html',
  styleUrls: ['./play-hololens-app-row.component.scss']
})
export class PlayHololensAppRowComponent {

  // Source data: MRC Page's deviceSubject
  @Input() videoStreaming$!: Observable<VideoStream>;

  @Output() playingAppEmitter = new EventEmitter<any>();

  installedApps: any | null = null;

  currentPlayingAppFullName: any | null = null;
  notification: string = '';

  appToPlay: any = {

    packageDisplayName: ''

  }

  browserAgent: string = '';

  appToPlayForm: FormGroup = new FormGroup({

    packageDisplayName: new FormControl(this.appToPlay.packageDisplayName)

  });

  // =============================================================================================================================
  // [28/11 IMPORTANT NOTE]
  // In page video stream is disabled w.e.f 28/11/2023 to make way for video window implementation.
  // this.mrcStreamer is disabled throughout the code hence, please enable all codes referencing to it below to make it work again
  // @ViewChild('mrcStreamer', { static: false }) mrcStreamer!: ElementRef;
  // =============================================================================================================================

  // =====================================================
  // UNUSED CLASS VARIABLES
  // These variables existed as this component originally
  // served as an embedded PHAR
  // =====================================================
  // url!: string;
  // playStream: boolean = false;
  // playPromise: any | null = null;
  // pausePromise: any | null = null;
  // isSuspended: boolean = false;
  // canPlay: boolean = false;
  // sourceBuffer!: SourceBuffer;
  // mediaSource: MediaSource = new MediaSource();
  // videoBlob: Blob = new Blob([], {type: 'video/mp4'});

  vsSubscription!: Subscription | null;

  id: string = '';
  deviceData: any | null = null;
  deviceName: string = '';
  hostIP: string = '';
  battLife: number = 0;
  isCharging: string = '';
  isOnline: boolean | any = false;
  blobUrl!: Promise<Blob>;

  deviceDataToPass!: Device;
  hlAppIsPlaying: boolean = false;
  appToPlaySelected: boolean = false;

  isLoading: boolean = true;
  isPlaying: boolean = false;
  refreshedDeviceData!: Subscription;
  runUntilInstalledAppsRetrieved!: Subscription;

  subscribedToVS: boolean = false;
  lowPowerState: boolean | undefined = true;
  videoWindow!: Window | null;
  videoWindowIsOpened: boolean = false;
  listenToWebsocket!: Subscription;
  currentPlayingAppArray: {
    playingApp: string|null;
    deviceName: string;
    hostIP: string;
    id: string
  }[] = [];


  constructor(private changeDetectorRef: ChangeDetectorRef,
    private statusNotificationsService:StatusNotificationsService,
    private devicesService: DevicesService,
    private videoStreamService:VideoStreamService,
    private router: Router,
    private location: Location,
    private ngZone: NgZone,
    private browserAgentResolverService: BrowserAgentResolverService,
    private hololens: HololensAPIService){}

  ngOnInit(){

    console.log("PHAR - [ngOnInit]");

    this.browserAgent = this.browserAgentResolverService.detectBrowserAgent();

    console.log("PHAR - isOnline - ", this.isOnline);
    console.log("PHAR - lowPowerState - ", this.lowPowerState);

    // Default state when component init
    this.isLoading = true;
    this.isOnline = false;
    this.lowPowerState = true;

    // console.log("PHAR - ngOnInit - this.deviceData: ", this.deviceData);
    // Subscribe to Behavior Subject
    if(!this.subscribedToVS){

      this.vsSubscription = this.videoStreaming$? this.videoStreaming$
      .pipe(

        catchError(error=>{

        console.log("PHAR - [Pipe Error] -", error);
        return error;

      }))
      .subscribe(

        (value: any)=>{

          try{

            this.subscribedToVS = true;

            // Set vsSubscription flag to true because we are subscribing to it
            if(value){

              // [PHAR DEBUG 1704]
              this.deviceData = value.deviceData;

              console.log("PHAR - [inside subscription] - value: ", value);
              console.log("PHAR - [inside subscription] - url: ", value.hlVideoStreamingUrl);

              // [26/12 IMPORTANT NOTE]
              // We only need deviceName, hostIP, battLife, isCharging, id
              // KEEP FOR FUTURE DEV: lowPowerState, isOnline
              // DISPOSE: playStream, url
              this.id = value.deviceData.id;
              // this.url = value.hlVideoStreamingUrl;
              this.hostIP = value.deviceData.hostIP;
              this.deviceName = value.deviceData.deviceName;
              this.battLife = value.deviceData.battLife;
              this.isCharging = value.deviceData.isCharging? 'Charging':'';
              this.isOnline = value.deviceData.isOnline;
              // this.playStream = value.playStream;
              this.lowPowerState = value.deviceData.lowPowerState;

              console.log("PHAR - isOnline 2 - ", this.isOnline);
              console.log("PHAR - lowPowerState 2 - ", this.lowPowerState);

              this.currentPlayingAppFullName = this.devicesService.getPlayingAppRecord()
                                                                  .filter((device:any) => device.id === this.id)[0]
                                                                  .appFullName;

              console.log("PHAR - currentPlayingAppFullName", this.currentPlayingAppFullName);

              this.deviceDataToPass = {

                id: this.id,
                deviceName: this.deviceName,
                hostIP: this.hostIP

              }

              // Retrieve Current Playing App from Local Storage
              // This is to persist state of current playing app between app refresh
              // If an app is found to be playing based on cache, display Stop App button
              // because app is still running in HL
              try{

                this.currentPlayingAppArray = JSON.parse(localStorage.getItem('currentPlayingAppArray') || '""');
                console.log("PHAR Page - this.currentPlayingAppArray (retrieved cache)", this.currentPlayingAppArray);

                // If cache exists, find active HL and determine if an app is still playing from previous session
                if(this.currentPlayingAppArray.length > 0){

                  this.currentPlayingAppArray.forEach((cachedDevice)=>{

                    console.log("PHAR Page - this.currentPlayingAppArray (retrieved cache)", this.id);

                    if(this.deviceName && cachedDevice?.deviceName){

                      if(cachedDevice.playingApp){

                        console.log("PHAR Page - this.currentPlayingAppArray (retrieved cache)", this.deviceName);
                        console.log("PHAR Page - HL App is playing based on cache");

                        // Set playing flag to true to render 'Stop App' instead
                        this.hlAppIsPlaying = true;

                      }

                    }

                  })

                }


              }catch(e){

                console.log("PHAR - currentPlayingAppArray retrieval - error",e);

              }

              this.isLoading = false;
              // this.changeDetectorRef.detectChanges();

            }

          }catch(error){

            if(error instanceof TypeError){

              console.log("PHAR - inside subscription - error -", error);

              // Check if device is online
              this.statusNotificationsService.logTask(this.deviceDataToPass, 'Stop Mixed Reality Capture [Error]', false);

            }

          }

        },
        (error)=>{

          console.log("PHAR - [Sub Error] - ", error);
          this.statusNotificationsService.logTask(this.deviceDataToPass, 'Stop Mixed Reality Capture', true);

        }

      ):null;

    }

    // Listen to websocket for any updated HoloLens data
    this.listenToWebsocket = this.devicesService.deviceUpdate.subscribe({
      next: (device: any)=>{

        if(this.id === device.id){

          console.log("PHAR - listenToWebSocket - device found", device);

          this.id = device.id;
          this.hostIP = device.hostIP;
          this.deviceName = device.deviceName;
          this.battLife = device.battLife;
          this.isCharging = device.isCharging? 'Charging':'';
          this.isOnline = device.isOnline;
          this.lowPowerState = device.lowPowerState;

        }

      },
      error: (error: any)=>{

        console.log("PHAR - devicesService.deviceUpdate - subscribe error", error);

      },
      complete: ()=>{

        console.log("PHAR - devicesService.deviceUpdate - complete");

      }

    });

    this.hololens.getInstalledApps(this.hostIP).subscribe({

      next: (response) =>{

        console.log("PHAR - Installed Apps", response);
        this.installedApps = response?.InstalledPackages;
        // console.log("PHAR - Installed Apps", response);

      },
      error: (error) =>{

        console.log("PHAR - error", error);
        console.log("PHAR - this.hostIP", this.hostIP);

      },
      complete: () =>{

        console.log("PHAR - complete");

        this.isLoading = false;


      },

    });

    // Listen to changes in form values and store for later use
    this.appToPlayForm.valueChanges.subscribe((appName)=>{

      this.appToPlay.packageDisplayName = appName;
      this.appToPlaySelected = this.appToPlay.packageDisplayName;

      console.log("PHAR - this.appToPlay.packageDisplayName - ", this.appToPlaySelected);
      console.log("PHAR - App Selected - ", appName);

    });

    // Listen to Grid Stream emitter
    this.videoStreamService.gridStreamEmitter.subscribe((value: any[])=>{


      try{

        var gridStreamDevice = value.filter((device)=>device?.hostIP === this.hostIP);
        console.log("PHAR - gridStreamEmitter - gridStreamDevice ", gridStreamDevice);
        console.log("PHAR - gridStreamEmitter - this.hostIP ", this.hostIP);

        if(gridStreamDevice.length === 1){

          // this.mrcStreamer.nativeElement.pause();
          console.log(`PHAR - ${this.deviceName} is paused!`);

        }

      }catch(e){

        if(e instanceof TypeError){

          console.log("Error - Check value", value);

        }

      }



    });



  }

  ngAfterViewInit(){

    console.log("PHAR - [ngAfterViewInit]");



    // Initialize interval-based refreshed data (10 secs) to obtain latest HL data
    // this.refreshedDeviceData = interval(10000).
    //   pipe(

    //     switchMap(()=>{

    //       console.log("PHAR - in refreshedData switchMap() - [10s Device Data Refresh]",{
    //         id: this.id,
    //         hlAddress: this.hostIP,
    //         hlDeviceName: this.deviceName
    //       });

    //       return this.devicesService.refreshDeviceData({
    //         id: this.id,
    //         hlAddress: this.hostIP,
    //         hlDeviceName: this.deviceName
    //       });

    //     })

    //   ).
    //   subscribe((response)=>{


    //     console.log("PHAR - refreshedDeviceData - response", response);

    //     this.id = response.id;
    //     this.hostIP = response.hostIP;
    //     this.deviceName = response.deviceName;
    //     this.battLife = response.battLife;
    //     this.isCharging = response.isCharging? 'Charging':'';
    //     this.isOnline = response.isOnline;
    //     this.lowPowerState = response.lowPowerState

    //   });




    // Run this observable until this HL's installed apps have been retrieve
    // this.runUntilInstalledAppsRetrieved = interval(1000)
    //   .pipe(

    //     // Run this interval observable until installedApp is populated with retrieved installed apps
    //     takeWhile(() => this.installedApps === null || this.installedApps === undefined)

    //   )
    //   .subscribe({

    //     // Retrieve installed apps once app has retrieved it (from cache or via web workers)
    //     next: async ()=>{

    //       if(this.installedApps === null || this.installedApps === undefined){

    //         let data = await this.devicesService.getInstalledApps(this.hostIP);
    //         this.installedApps = data?.installedApps;
    //         console.log("PHAR - installedApps (if-block) - ", this.installedApps);
    //         this.changeDetectorRef.detectChanges();

    //       }else{

    //         console.log("PHAR - installedApps (else-block) - ", this.isLoading);

    //       }

    //     },
    //     error: (error)=>{


    //       console.log("PHAR - installedApps (if-block) - ERROR ", error);


    //     },
    //     complete: ()=>{

    //       console.log("PHAR - installedApps (if-block) - COMPLETE ");
    //       this.isLoading = false;

    //     }

    //   });



  }

  ngOnDestroy(){

    console.log("PHAR - [ngOnDestroy]");

    try{

      // this.mrcStreamer.nativeElement.pause();
      this.statusNotificationsService.logTask(this.deviceDataToPass, 'Stop Mixed Reality Capture', true);
      this.refreshedDeviceData.unsubscribe();

      // If subscription is not null
      if(this.vsSubscription){

        this.vsSubscription.unsubscribe();

      }

      this.runUntilInstalledAppsRetrieved.unsubscribe();
      this.listenToWebsocket.unsubscribe();

    }catch(e){

      console.log("PHAR - [ngOnDestroy] - error:", e);

    }

  }


  playApp(){

    console.log("PHAR - playApp - [CLICKED]", this.appToPlay.packageDisplayName.packageDisplayName);

    const encodedPackageItems = this.getPRAID();


    // Set notification
    this.notification = `Launching ${this.appToPlay.packageDisplayName.packageDisplayName} on ${this.deviceName}`;
    this.statusNotificationsService.renderToast(this.notification);

    this.changeDetectorRef.detectChanges();

    // Invoke Device Service's playHololensApp() to commence 'Play App' API Call
    this.devicesService
      .playHololensApp(
        this.hostIP,
        encodedPackageItems.encodedAppPRAID,
        encodedPackageItems.encodedAppFullName
      )
      .subscribe({

        next: (response)=>{

          console.log("PHAR - playApp() - response", response);

          // If HTTP Response succeeds
          if(response.playAppSuccess){

            this.hlAppIsPlaying = true;

            const dataToPass = {

              id: this.id,
              hostIP: this.hostIP,
              deviceName: this.deviceName,
              appFullName: encodedPackageItems.appFullName,
              appDisplayName: this.appToPlay.packageDisplayName.packageDisplayName,
              isPlaying: true

            }

            // [TO-DO] Send object, pegged with playing app, ID and Package Relative ID, to 'playing app record' service
            this.devicesService.savePlayingAppIntoRecord(dataToPass);

            this.playingAppEmitter.emit(dataToPass);

          }else{

            this.notification = `Play app on ${this.deviceName} failed. Is it online, or have you performed Windows logged in on HoloLens?`
            this.statusNotificationsService.renderToast(this.notification);

          }

        },
        error: (error)=>{

          console.log("PHAR - playApp() - error", error);

        },
        complete: ()=>{

          console.log("PHAR - playApp() - complete");

        }
      });

  }

  stopApp(){

    // Render notification that stopping of the app is commencing
    this.notification = `Stopping App on ${this.deviceName}. Please wait...`;
    this.statusNotificationsService.renderToast(this.notification);

    // Get 'playing app record' from service by Hololens ID/IP
    const playingAppRecord = this.devicesService.getPlayingAppRecord();

    console.log("PHAR - stopApp() - playingAppRecord", playingAppRecord);
    console.log("PHAR - stopApp() - typeof playingAppRecord", typeof playingAppRecord);

    // Check if playing app length is more than 0
    const filteredRecord = playingAppRecord
    .filter((existingDevicePlayingAppRecord:any) => this.id === existingDevicePlayingAppRecord.id)[0];

    console.log("PHAR - stopApp() - filteredRecord", filteredRecord);

    // Obtain playing app package name
    if(filteredRecord !== undefined){

      if(this.currentPlayingAppFullName === filteredRecord?.appFullName){

        console.log("PHAR - stopApp() - invoking Hololens API.. ", filteredRecord);

        this.hololens.stopHLApp(this.hostIP, btoa(this.currentPlayingAppFullName as string))
          .subscribe({
            next: (response)=>{

              if(response.stopAppSuccess){

                this.hlAppIsPlaying = false;
                console.log("PHAR - stopApp() - response", response);
                this.devicesService.removeStoppedAppFromRecord(this.id);


              }

              const dataToPass = {

                id: this.id,
                hostIP: this.hostIP,
                deviceName: this.deviceName,
                appDisplayName: this.appToPlay.packageDisplayName.packageDisplayName,
                isPlaying: false

              }

              this.playingAppEmitter.emit(dataToPass);


            },
            error: (error)=>{

              console.log("PHAR - stopApp() - error", error);


            },
            complete: ()=>{

              console.log("PHAR - stopApp() - Stop App Complete");


            },

          })

      }

    }

  }

  restartApp(){

    this.notification = `Restarting ${this.deviceName}...`;
    this.statusNotificationsService.renderToast(this.notification);

    // Call Restart HL API
    this.hololens.restartHL(this.hostIP).subscribe({

      next: (response) => {

        console.log("[Response] Restarting HL");

      },
      error: (error) => {

        console.log("[Error]");

      },
      complete: () => {

        console.log("[Complete]");

      }

    });

    console.log("Restart App Clicked");

  }

  openVideoWindow(){

    console.log("Open Video Window");
    console.log("Open Video Window - window.origin: ", window.origin);

    const videoWindowURL = `${window.origin}/video-window/${this.id}`;

    // Opens a blank window with only the video.
    this.videoWindow = window.open(videoWindowURL);

    if(this.videoWindow){

      this.videoWindow.onload = () => {

        // Invoke sendMessage function to pass data to Video Window
        this.sendMessage(videoWindowURL);

        // Pause video
        this.videoWindowIsOpened = true;
        // this.mrcStreamer.nativeElement.pause();
        console.log("In-DOM video paused");

      };

      // Create an observable event to subscribe for Video Window 'window close' message
      let videoWindowCloseStream = fromEvent(this.videoWindow, 'message');

      videoWindowCloseStream.subscribe((event: any)=>{

        console.log("Message from Video Window received - ", event);

          if(event.data.windowHasClosed){

            this.videoWindowIsOpened = false;
            console.log("Message from Video Window received - videoWindowIsOpened ", this.videoWindowIsOpened);

          }

      });

    }

  }

  sendMessage(URL: string){

    if(this.videoWindow){

      // Perform postMessage to pass data
      // as videoWindow is no longer in the same DOM as this app
      // (cannot pass data using DI)
      this.videoWindow.postMessage(
        {
          dataToPass: {

              id: this.id,
              hostIP: this.hostIP,
              deviceName: this.deviceName,
              videoURL: "http://"+this.hostIP+"/api/holographic/stream/live_med.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=false",
              playingHololensApp: this.currentPlayingAppFullName

          },
        },
      URL);

    }

  }

  getPRAID(): any{

    // Filter selected app to play and encoded its PRAID and Package Full Name
    const appToPlay = this.installedApps.filter((app: any)=> app.PackageDisplayName === this.appToPlay.packageDisplayName.packageDisplayName)[0];
    this.currentPlayingAppFullName = appToPlay.PackageFullName;
    const encodedAppPRAID = btoa(appToPlay.PackageRelativeId);
    const encodedAppFullName = btoa(appToPlay.PackageFullName);

    const encodedPackageItems = {

      appFullName: appToPlay.PackageFullName,
      encodedAppPRAID: encodedAppPRAID,
      encodedAppFullName: encodedAppFullName

    }

    console.log("GET PRAID ---", encodedAppPRAID);

    return encodedPackageItems;

  }



  // =============================UNUSED CODES=============================

  // @HostListener('document:visibilitychange',['$event'])
  // visibilitychange(){

  //   if(document.hidden){

  //     // this.mrcStreamer.nativeElement.pause();
  //     console.log("Page hidden!!");

  //   }else{

  //     console.log("Page shown!! isPlaying", this.isPlaying);

  //     console.log("Page shown!! Reloading page to reset video...", this.isPlaying);
  //     console.log("Page shown!! Reloaded", this.isPlaying);
  //     console.log("Page shown!! Reloaded - videoWindowIsOpened", this.videoWindowIsOpened);

  //     if(!this.videoWindowIsOpened){

  //       if(this.browserAgent === 'firefox'){

  //         this.router.navigate(['/started/mixed-reality-capture']);

  //       }

  //       if(this.playStream){

  //         if(this.browserAgent === 'firefox'){

  //           // this.mrcStreamer.nativeElement.load();

  //         }

  //         // console.log("Page shown - this.mrcStreamer.nativeElement.seekable", this.mrcStreamer.nativeElement.seekable);
  //         this.changeDetectorRef.detectChanges();

  //         // Trigger reload via restarting of angular lifecycle
  //         this.ngOnInit();
  //         this.ngAfterViewInit();
  //         this.streamVideo();

  //       }

  //       console.log("Page shown!!");

  //     }



  //   }

  // }

  // streamVideo(){

  //   console.log(`PHAR - [In playPromise] playStream: ${this.playStream}`);

  //   // If user clicks vid and playStream flag is not yet true, set it to true
  //   if(!this.playStream){

  //     this.playStream = true;

  //   }

  //   try{

  //     this.deviceDataToPass = {

  //       id: this.id,
  //       deviceName: this.deviceName,
  //       hostIP: this.hostIP

  //     }

  //     if(this.playStream){

  //       console.log(`PHAR - [In playPromise] playStream is true...`);

  //       // const playPromise = await this.mrcStreamer.nativeElement.play();

  //       // Capture play() promise response
  //       // if(playPromise !== undefined){

  //       // this.mrcStreamer.nativeElement.src = this.url;
  //       this.changeDetectorRef.detectChanges();

  //       // this.playPromise = this.mrcStreamer.nativeElement.play().then(

  //       //   // Play is successful
  //       //   ()=>{

  //       //     console.log(`PHAR - [In playPromise] ${this.hostIP} Play video stream successful`);

  //       //     this.notification = `${this.deviceName} live stream ready`
  //       //     this.statusNotificationsService.renderToast(this.notification);

  //       //     // Set isPlaying flag
  //       //     this.isPlaying = true;

  //       //   }

  //       // ).catch((error:any)=>{

  //       //   console.log(`PHAR - [In playPromise CATCH] ${this.hostIP} Error - ${error}`);
  //       //   console.log("PHAR - [In playPromise CATCH] Error (Debug) - this.mrcStreamer", this.mrcStreamer);

  //       //   // this.mrcStreamer.nativeElement.src = "";
  //       //   // this.mrcStreamer.nativeElement.load();

  //       //   if(error instanceof DOMException){

  //       //     // console.log(`PHAR - [In playPromise CATCH] ${this.hostIP} DOM Error - Hololens might have been turned off when play request was made. Error Code 20: ${error.ABORT_ERR}`);
  //       //     console.log(`PHAR - [In playPromise CATCH] ${this.hostIP} DOM Error - this.mrcStreamer.nativeElement.src - ${this.mrcStreamer.nativeElement.src}`);
  //       //     console.log(`PHAR - [In playPromise CATCH] ${this.hostIP} DOM Error - this.mrcStreamer.nativeElement.currentSrc - ${this.mrcStreamer.nativeElement.currentSrc}`);

  //       //     this.isPlaying = false;
  //       //     this.playStream = false;

  //       //     // Stop (pause()) video, destroy component and trigger reload via angular lifecycle restart
  //       //     // this.mrcStreamer.nativeElement.pause();
  //       //     // this.mrcStreamer.nativeElement.src = '';
  //       //     // this.ngOnDestroy();
  //       //     // this.ngOnInit();
  //       //     // this.ngAfterViewInit();
  //       //     // this.streamVideo();

  //       //   }

  //       // });



  //       // }

  //       // Log task
  //       this.statusNotificationsService.logTask(this.deviceDataToPass, 'Start Mixed Reality Capture', true);

  //     }else{

  //       // var pausePromise = this.mrcStreamer.nativeElement.pause();

  //       // if(pausePromise !== undefined){

  //       //   pausePromise.then(

  //       //     ()=>{

  //       //       console.log(`Video Streaming - [In pausePromise] ${this.hostIP} Pause video stream successful`);

  //       //     }

  //       //   ).catch((error: any)=>{

  //       //     console.log(`PHAR - [In pausePromise] ${this.hostIP} Error - ${error}`);

  //       //   })

  //       // }

  //       // this.mrcStreamer.nativeElement.src = this.url;
  //       this.statusNotificationsService.logTask(this.deviceDataToPass, 'Stop Mixed Reality Capture', true);
  //       this.changeDetectorRef.detectChanges();
  //       // console.log("PHAR - streamVideo() - "+ this.hostIP + " stream stopped: " + this.mrcStreamer.nativeElement);
  //       this.isPlaying = false;

  //     }

  //   }catch(error){

  //     console.log("PHAR - streamVideo - [Error] ", error);

  //   }

  // }

  // =============================================================
  // Video Stream Event Handler Methods below
  // (Uncomment if you want to enable in-page PHAR)
  // =============================================================

  // videoStalledHandler(event: any){
  //   console.log(`PHAR - [videoStalledHandler]  ${this.hostIP} - event`);
  // }

  // videoOnErrorHandler(event: any){

  //   try{

  //     this.statusNotificationsService.logTask(this.deviceDataToPass, '[Video Error Event] MRC', false);

  //     // Attempt to stream video again to verify that HL is online or offline
  //     console.log(`PHAR - [videoOnError] ${this.hostIP} - set playStream and isPlaying flags to false`);
  //     console.log("PHAR - [videoOnError] - event", event);

  //     // Update video flags
  //     this.playStream = false;
  //     this.isPlaying = false;
  //     // this.mrcStreamer.nativeElement.poster = "/assets/images/vid-not-playing-bg.png";
  //     this.mrcStreamer.nativeElement.src = this.url;

  //     // console.log("PHAR - [videoOnError] - Destroying component and re-initialise component lifecycle");

  //     // Stop (pause()) video, and reload component via restarting of angular lifecycle
  //     // this.mrcStreamer.nativeElement.pause();
  //     // this.ngOnDestroy();
  //     // this.ngOnInit();
  //     // this.ngAfterViewInit();
  //     // this.streamVideo();

  //   }catch(e){

  //     console.log(`PHAR - [videoOnError] ${this.hostIP} - error - ${e}`);

  //   }

  // }

  // // Event to capture when video data fetch is intentionally paused by browser
  // // Why?
  // // Found onsuspend to be triggered when user leaves app (eg. change browser tab)
  // // What to do? Do not pause video data fetching - re-load video and play again...
  // videoSuspendedHandler(event: any){

  //   // event.stopPropagation();
  //   console.log(`PHAR - [videoSuspendedHandler] ${this.hostIP} - event`);
  //   console.log("PHAR - [videoSuspendedHandler]", this.hostIP, " - current mrcStreamer state...", this.mrcStreamer);

  //   // Set suspend flag
  //   this.isSuspended = true;

  //   // this.mrcStreamer.nativeElement.poster = "/assets/images/vid-not-playing-bg.png";
  //   console.log(`PHAR - [videoSuspendedHandler] ${this.hostIP} - isPlaying is true. Try re-playing? `);
  //   // this.mrcStreamer.nativeElement.play();


  //   // [WIP] End suspended stream
  //   // this.mrcStreamer.nativeElement.end();

  // }

  // videoOnWaitHandler(event: any){

  //   console.log(`PHAR - [videoOnWaitHandler] ${this.hostIP} - event`);


  // }

  // videoResourceProgressMonitor(event: any){

  //   // console.log("PHAR - [videoResourceProgressMonitor] - event", event);

  // }

  // videoOnPlayingHandler(event: any){

  //   this.canPlay = false;
  //   console.log(`PHAR - [videoOnPlayingHandler] ${this.hostIP}`);
  //   console.log("PHAR - [videoOnPlayingHandler]", this.hostIP, " - current mrcStreamer state...", this.mrcStreamer);

  // }

  // videoOnPlayHandler(event: any){

  //   console.log(`PHAR - [videoOnPlayHandler] ${this.hostIP} - event`);

  // }

  // videoOnEmptiedHandler(event: any){

  //   console.log(`PHAR - [videoOnEmptiedHandler] ${this.hostIP} - event`);

  // }

  // videoOnLoadStartHandler(event: any){

  //   console.log(`PHAR - [videoOnLoadStart] ${this.hostIP} - event`);

  // }

  // videoOnLoadedDataHandler(event: any){

  //   console.log(`PHAR - [videoOnLoadedData] ${this.hostIP} - event`);

  // }

  // videoOnLoadedMetaDataHandler(event: any){

  //   console.log(`PHAR - [videoOnLoadedMetaData] ${this.hostIP} - event`);

  // }

  // videoOnEndedHandler(event: any){

  //   console.log(`PHAR - [videoOnEndedHandler] ${this.hostIP} - event`);

  // }



}


