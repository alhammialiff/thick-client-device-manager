import { ChangeDetectorRef, Component, ElementRef, Input, ViewChild, ViewContainerRef } from '@angular/core';
import { Params, ActivatedRoute, Router } from '@angular/router';
import { FormGroup, FormControl, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { Location, ViewportScroller } from '@angular/common';
import { Subscription, interval, map, switchMap, Observable, distinctUntilChanged, of, BehaviorSubject, finalize, concatMap } from 'rxjs';
import { DevicesService } from '../services/devices.service';
import { HololensAPIService } from '../services/hololens-api.service';
import { Store, select } from '@ngrx/store';
import { deviceDataSelector } from '../states/devices.selector';
import { MasterStateInterface } from '../states/master-state.interface';
import { Device } from '../models/device.model';
import * as DeviceDataStateActions from '../states/devices.actions';
import { StatusNotificationsService } from '../services/status-notifications.service';
import { NotificationLog } from '../models/notification-log';
import { VideoStream } from '../models/video-stream';
import { VideoStreamService } from '../services/video-stream.service';
import { InsertToastMessageDirective } from '../directives/insert-toast-message.directive';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { UninstallVersionSelectionDialogComponent } from './uninstall-version-selection-dialog/uninstall-version-selection-dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { filter } from 'cypress/types/bluebird';

@Component({
  selector: 'app-device-details',
  templateUrl: './device-details.component.html',
  styleUrls: ['./device-details.component.scss']
})
export class DeviceDetailsComponent {

  @Input() data!: any;
  @ViewChild('mrcStreamer') mrcStreamer!: ElementRef;
  // @ViewChild(InsertToastMessageDirective) insertToastMessage!: InsertToastMessageDirective;

  // Main device var
  deviceName: string | null = null;
  deviceData: Device = {
    id: '',
    hostIP: '',
    deviceName: '',
    isOnline: false,
    battLife: '',
    isCharging: false,
    isRegistered: false,
    errorMessage: null,
    effectiveHttpRequestCount: 0
  };

  // Loading Spinners
  showDeviceDetailsSectionLoading: boolean = false;
  showInstalledAppsSectionLoading: boolean = false;
  showAppInstallationLoading: boolean = false;
  showAppUninstallationLoading: boolean = false;

  ngrxDeviceData$!: Observable<Device>;
  notification: string = "";

  // Video-related vars
  hlVideoStreamingUrl: string = '';
  playMRCStream: boolean = false;
  dataToPassToVideoStreamer = new BehaviorSubject<VideoStream>({
    playStream: false,
    hlVideoStreamingUrl: '',
    deviceData: {
      id:'',
      deviceName: '',
      hostIP:'',
      isOnline:false,
      isRegistered:false,
      isCharging: false
    },
    isLoading: false
  });

  // Device props
  id: any;
  hlAddress: any;
  hlDeviceName: any;
  batteryLifePercentage: any;
  fileToUpload!: any;
  hlInstalledApps: any | null = null;

  // =========================================================
  // Various App Name Types retrieved from HoloLens
  // =========================================================
  // App name used for install/uninstallation
  packageFullNames: any[] = [];

  // Truncated app names used for obtaining Package Full Names
  packageFamilyNames: any[] = [];

  // App Names used for displaying to users
  packageDisplayNames: any[] = [];

  hlDataRefreshStream!: Subscription;
  appRemoveFormIsDisabled: boolean = true;

  appToRemove: any = {
    appToRemove: ''
  }

  hlFileUploader: any = {
    hlFileName: ''
  };

  hlFileUploaderForm: FormGroup = new FormGroup({
    hlFileName: new FormControl(this.hlFileUploader.hlFileName)
  });

  appRemoveForm: FormGroup = new FormGroup({
    appToRemove: new FormControl(this.appToRemove.appToRemove)
  });

  constructor(private location: Location,
    private route: ActivatedRoute,
    private devicesService: DevicesService,
    private hololensAPIService: HololensAPIService,
    // private store: Store<MasterStateInterface>,
    private changeDetectorRef: ChangeDetectorRef,
    private statusNotificationService: StatusNotificationsService,
    private videoStreamService: VideoStreamService,
    private router: Router,
    private viewportScroller: ViewportScroller,
    private dialog: MatDialog) { }

  ngOnInit() {

    // [Deprecated but working] This refreshes device details everytime
    // URL params change, thereby kicking in fetching of respective HL's Installed Apps
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;

    this.showDeviceDetailsSectionLoading = true;
    this.showInstalledAppsSectionLoading = true;

    this.hlDataRefreshStream = interval(5000).pipe(

      // Pipe #1: Return route parameter's result
      switchMap(() => this.route.params),

      // Pipe #2: Use route parameter's ID and HostIP in getDeviceData return getDeviceData's result
      switchMap((param) => {

        console.log("Device Details - In this.route.params.pipe(map(...)) - param", param);
        console.log("Device Details - In this.route.params.pipe(map(...)) - this.id", this.id);
        console.log("Device Details - this.id", this.id);

        if(typeof this.id !== 'undefined' && this.id !== param['id']){

          console.log("Device Details - this.id is not data.id", param['id']);

          setTimeout(()=>{
            this.endMRCLivePreview();
          },500);

        }

        this.id = param['id'];
        this.hlAddress = param['hostIP'];
        this.hlVideoStreamingUrl = "http://"+this.hlAddress+"/api/holographic/stream/live_low.mp4?holo=true&pv=true&mic=false&loopback=false&RenderFromCamera=true";
        console.log("Device Details - In this.route.params.pipe(map(...)) - mrcUrl", this.hlVideoStreamingUrl);

        // Retrieve latest HL data from Devices Service
        return this.devicesService.getDeviceData(

          {
            id: param['id'],
            hlAddress: param['hostIP'],
            hlDeviceName: ''
          }

        );

      })

    ).subscribe((data: any) => {

      console.log("Device Details - data", data);

      try {

        this.data = data[0];

        if (data) {

          this.deviceData = {

            id: this.data.id,
            hostIP: this.data.hostIP,
            deviceName: this.data.deviceName,
            isOnline: this.data.isOnline,
            battLife: this.data.battLife,
            isCharging: this.data.isCharging,
            isRegistered: this.data.isRegistered,
            errorMessage: this.data.errorMessage,
            effectiveHttpRequestCount: this.data.effectiveRequestCount,
            lowPowerState: this.data.lowPowerState

          };

          this.showDeviceDetailsSectionLoading = false;
          // this.changeDetectorRef.detectChanges();


          console.log("Device Details - this.data (in subscribe, after pipe)", this.data);
          // console.log("Device Details - this.packageDisplayNames (in subscribe, after pipe)", this.packageDisplayNames);

          // If hlInstallApps array is null OR undefined, retrieve from cache and store in class var for use in this instance
          if(this.hlInstalledApps === null || this.hlInstalledApps === undefined){

            // If device is active (not asleep)
            if(this.deviceData.isOnline && !this.deviceData.lowPowerState){

              this.hololensAPIService.getInstalledApps(this.deviceData.hostIP).subscribe({

                next: (response) =>{

                  try{

                    // Invoke Device Services to check Local Storage for hlInstalledApps
                    // this.hlInstalledApps = this.devicesService.getInstalledApps(this.deviceData.hostIP);
                    this.hlInstalledApps = response?.InstalledPackages;

                    console.log("Device Details - hlInstalledApps", this.hlInstalledApps);

                    // If device is online and no cache is available
                    if(!this.hlInstalledApps){

                      this.appRemoveForm.controls["appToRemove"].disable();
                      throw new Error(`Loading ${this.deviceData.deviceName} installed apps, please wait...`);

                    }else{

                      this.appRemoveForm.controls["appToRemove"].enable();
                      this.appRemoveFormIsDisabled = false;

                    }

                    this.showInstalledAppsSectionLoading = false;

                  }catch(error){

                    console.log("Device Details - hlInstalledApps (ERROR)", error);

                    this.notification = `Loading ${this.deviceData.deviceName} installed apps, please wait...`;
                    this.statusNotificationService.renderToast(this.notification);
                    this.showInstalledAppsSectionLoading = false;

                  }

                },
                error: (error) =>{

                  console.log("Device Details - Retrieval of Installed Apps - error", error);

                },
                complete: () =>{

                  console.log("Device Details - Retrieval of Installed Apps - complete");

                  // this.isLoading = false;


                },

              });



            }else{

              this.appRemoveForm.controls["appToRemove"].disable();
              console.log("Device Details - appRemoveForm - ", this.appRemoveForm);
              this.showInstalledAppsSectionLoading = false;


            }

          }else{

            if(this.showInstalledAppsSectionLoading){

              this.showInstalledAppsSectionLoading = false;
              console.log("Device Details - showInstalledAppsSectionLoading (removing loading)", this.showInstalledAppsSectionLoading);
              this.changeDetectorRef.detectChanges();

            }

          }

          // If packageDisplayNames array is not empty
          if(this.packageDisplayNames.length > 1){

            // If length of packageDisplayNames and hlInstalledApps arrays are different, clear it (to update)
            if (this.packageDisplayNames.length !== this.hlInstalledApps?.installedApps.length) {

              this.packageDisplayNames = [];
              console.log("Device Details - packageDisplayName is not empty and there is an updated list, updating installed app list...")

            }else{

              console.log("Device Details - packageDisplayName is not empty and no change in list")

            }

          }

          this.hlInstalledApps.forEach((app: any) => {

            // Append arrays with updated app list
            this.packageDisplayNames.push(app.PackageDisplayName);
            this.packageFullNames.push(app.PackageFullName);
            this.packageFamilyNames.push(app.PackageFamilyName);

          });

          console.log("Device Details - this.data (in subscribe, after pipe)", data);

        } else {

          this.showDeviceDetailsSectionLoading = true;

        }

      } catch (error: any) {

        if (error instanceof TypeError) {

          console.log("Device Details - [Type Error] Subscription in interval getDeviceData", error.message);

          // this.cleanUpHLRefreshStream();
          this.statusNotificationService.logTask(this.deviceData, 'Stop Mixed Reality Capture', true);

        }else if (error instanceof DOMException){

          console.log("Device Details - [DOM Error] Subscription in interval getDeviceData", error.message);


        }

      }

    });

    // [HL File Uploader]
    this.hlFileUploaderForm.valueChanges.subscribe((formValue) => {

      console.log("hlFileUploaderForm input values - ", formValue);

      // Pass streaming form values to a class variables
      this.hlFileUploader = formValue;

      console.log("this.hlFileUploader input values - ", this.hlFileUploader);

    });

    this.appRemoveForm.valueChanges.subscribe((value) => {

      console.log("App Remove Form Group (value change) - ", value);

      this.appToRemove = value;

      console.log("App Remove Form Group (value change) - ", value);

    });

  }

  ngAfterViewInit(){




  }

  // [KIV] What to destroy when component is disposed?
  ngOnDestroy() {

    // this.cleanUpHLRefreshStream();
    // this.mrcStreamer.nativeElement.pause();
    // this.endMRCLivePreview();
    this.playMRCStream = false;
    this.hlDataRefreshStream.unsubscribe();
    console.log("[ngOnDestroy] Current Device Detail Page Disposed");

  }

  cleanUpHLRefreshStream() {

    this.hlDataRefreshStream.unsubscribe();

  }

  retrieveFileToUpload(event: any) {

    // Extract file blob info from event object (triggered on change in <input>)
    console.log("In Main Container - event", event.target.files[0]);
    console.log("In Main Container - onUpload", this.hlFileUploader.hlFileName);

    this.fileToUpload = event.target.files[0];
    console.log("In Main Container - this.fileToUpload", this.fileToUpload);

  }

  onInstall() {

    // Trigger loading during installation
    this.showAppInstallationLoading = true;

    console.log("Device Details - onUpload - this.hlAddress", this.hlAddress);
    console.log("Device Details - onUpload - this.deviceData.hostIP", this.deviceData.hostIP);

    // Extract file blob info from event object (triggered on change in <input>)
    this.hololensAPIService.installHLApp(this.fileToUpload, this.deviceData.hostIP).subscribe({

      next: (response: any) => {

        if(response){

          // When response is received, this signifies that installation is done
          this.showAppInstallationLoading = false;

          console.log("Install HL App Request Response:", response);

          // Create a fragment copy of Device Data (omit installedApp property as it is huge)
          var deviceData: Device = {
            id: this.data.id,
            hostIP: this.data.hostIP,
            hostComputerName: this.data.hostComputerName,
            deviceName: this.data.deviceName,
            battLife: this.data.battLife,
            isCharging: this.data.isCharging,
            isRegistered: this.data.isRegistered,
          };

          var appendedData: any = {
            ...deviceData,
            description: this.fileToUpload.name
          }

          this.statusNotificationService.setNotification(`Installation of ${this.fileToUpload.name} on ${this.data.deviceName} is successful. Reloading HoloHub to update changes...`);
          this.notification = this.statusNotificationService.getNotification();

          // Call service to dynamically render app
          this.statusNotificationService.renderToast(this.notification);

          this.statusNotificationService.logTask(appendedData, 'App Installation', true);



        }
        // this.data = response;
      },
      error: (errorMessage: any) => {
        console.log("Install HL App Request Error!:", errorMessage);
      }
    });

  }

  onUninstall() {

    this.showAppUninstallationLoading = true;

    // var pfn: any[] = this.packageFullNames.filter((appFullName, index) => {

    //   // Split '_' and join (because package display name has underscore)
    //   // [To do later once verification on other HL Apps Display Names are done]
    //   // var parsedString = this.appToRemove.appToRemove.split('_')[0];

    //   // let regExp = new RegExp(`${this.appToRemove.appToRemove.split('_')[0]}\\w+`, "gi");
    //   // console.log("Regex test?", regExp.test(appFullName), appFullName);
    //   console.log("Device Details - onUninstall - Package Family Name", this.packageFamilyNames[index]);

    //   return appFullName.includes(this.packageFamilyNames[index]);

    // });

    var pfn: any [] = this.hlInstalledApps.installedApps.filter((appObject:any) => {

      return appObject?.PackageDisplayName === this.appToRemove.appToRemove

    });

    console.log("Device Details - onUninstall - pfn[0]", pfn[0]);

    // Check if filtered result returns more than 1 versions of app
    if(pfn.length > 1){

      this.showAppUninstallationLoading = false;
      var emittedDialogValue: any = {}

      const dialogRef = this.dialog.open(UninstallVersionSelectionDialogComponent, {
        data: pfn
      });

      // Pipe dialogRef's afterClosed() output to a filtering function that filters
      // the specific version of app to be uninstalled
      // Finally, the output of the filtered app is passed to uninstallHLApp observable
      // which will also be subscribed
      dialogRef.afterClosed()
        .pipe(
          concatMap((emittedValue: any)=>{

            console.log("Device Details - onUninstall - dialog emittedValue", emittedValue);

            var filteredAppVersion = pfn.filter((appObject: any)=>{

              console.log("Device Details - onUninstall - appObject from pfn", appObject);

              return appObject.Version.Build == emittedValue.data.Build
                && appObject.Version.Major == emittedValue.data.Major
                && appObject.Version.Minor == emittedValue.data.Minor;

            });

            console.log("[CONCATMAP 1 | SELECTED VERSION] Device Details - onUninstall - filteredAppVersion", filteredAppVersion);

            return filteredAppVersion;

          }),
          concatMap((filteredAppVersion:any)=>{

            this.showAppUninstallationLoading = true;
            this.statusNotificationService.setNotification(`Uninstalling ${filteredAppVersion?.PackageDisplayName} from ${this.data.deviceName}, please wait...`);
            this.notification = this.statusNotificationService.getNotification();
            this.statusNotificationService.renderToast(this.notification);

            console.log("[CONCATMAP 2 | SELECTED VERSION] Uninstalling app:", filteredAppVersion);

            return this.hololensAPIService.uninstallHLApp(filteredAppVersion?.PackageFullName, this.data.hostIP);

          })
        )
        .subscribe({

          next: (res) => {

            // [NOTE] Successful uninstallation returns null,
            //        so we need to create a success status for clarity
            if (res?.uninstallAppSuccess) {

              this.showAppUninstallationLoading = false;

              let result = {
                Status: "Uninstallation Complete"
              }
              console.log("Device Details - [SUCCESSFUL | SELECTED VERSION] Uninstalling app:", result);

              this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} successful. Reloading HoloHub to update changes...`);

              this.notification = this.statusNotificationService.getNotification();
              this.statusNotificationService.renderToast(this.notification);

              this.statusNotificationService.logTask(appendedData, 'App Uninstallation', true);

            } else {

              console.log("Device Details - [FAILED  | SELECTED VERSION] Uninstalling app:", res);

              this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} failed: ${res.response}`);
              this.notification = this.statusNotificationService.getNotification();
              this.statusNotificationService.renderToast(this.notification);

              this.statusNotificationService.logTask(appendedData, 'App Uninstallation', false);

              this.showAppUninstallationLoading = false;

            }

          },
          error: (error) => {
            console.log("Device Details - [ERROR| SELECTED VERSION] Uninstalling app:", error);

            this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} failed: ${error}`);

            this.notification = this.statusNotificationService.getNotification();
            this.statusNotificationService.renderToast(this.notification);

            this.statusNotificationService.logTask(appendedData, 'App Uninstallation', false);

            this.showAppUninstallationLoading = false;


          },
          complete: () => {

            console.log("Device Details - [COMPLETE| SELECTED VERSION] Uninstalling app");

            this.showAppUninstallationLoading = false;

          }

        });

    }else{

      this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]?.PackageDisplayName} from ${this.data.deviceName}, please wait...`);
      this.notification = this.statusNotificationService.getNotification();
      this.statusNotificationService.renderToast(this.notification);

      // Create a fragment copy of Device Data (omit installedApp property as it is huge)
      var deviceData: Device = {
        id: this.data.id,
        hostIP: this.data.hostIP,
        hostComputerName: this.data.hostComputerName,
        deviceName: this.data.deviceName,
        battLife: this.data.battLife,
        isCharging: this.data.isCharging,
        isRegistered: this.data.isRegistered
      };

      var appendedData: any = {
        ...deviceData,
        appName: pfn[0]
      }

      this.hololensAPIService.uninstallHLApp(pfn[0]?.PackageFullName, this.data.hostIP).subscribe({

        next: (res) => {

          // [NOTE] Successful uninstallation returns null,
          //        so we need to create a success status for clarity
          if (res?.uninstallAppSuccess) {

            this.showAppUninstallationLoading = false;

            let result = {
              Status: "Uninstallation Complete"
            }
            console.log("[SUCCESSFUL] Uninstalling app:", result);

            this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} successful. Reloading HoloHub to update changes...`);

            this.notification = this.statusNotificationService.getNotification();
            this.statusNotificationService.renderToast(this.notification);

            this.statusNotificationService.logTask(appendedData, 'App Uninstallation', true);

          } else {

            console.log("[FAILED] Uninstalling app:", res);

            this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} failed: ${res.response}`);
            this.notification = this.statusNotificationService.getNotification();
            this.statusNotificationService.renderToast(this.notification);

            this.statusNotificationService.logTask(appendedData, 'App Uninstallation', false);

            this.showAppUninstallationLoading = false;

          }

        },
        error: (error) => {
          console.log("[ERROR] Uninstalling app:", error);

          this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} failed: ${error}`);

          this.notification = this.statusNotificationService.getNotification();
          this.statusNotificationService.renderToast(this.notification);

          this.statusNotificationService.logTask(appendedData, 'App Uninstallation', false);

          this.showAppUninstallationLoading = false;


        },
        complete: () => {

          console.log("[COMPLETE] Uninstalling app");

          this.showAppUninstallationLoading = false;

        }


      });


    }


    // this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]?.PackageDisplayName} from ${this.data.deviceName}, please wait...`);
    // this.notification = this.statusNotificationService.getNotification();
    // this.statusNotificationService.renderToast(this.notification);

    // // Create a fragment copy of Device Data (omit installedApp property as it is huge)
    // var deviceData: Device = {
    //   id: this.data.id,
    //   hostIP: this.data.hostIP,
    //   hostComputerName: this.data.hostComputerName,
    //   deviceName: this.data.deviceName,
    //   battLife: this.data.battLife,
    //   isCharging: this.data.isCharging,
    //   isRegistered: this.data.isRegistered
    // };

    // var appendedData: any = {
    //   ...deviceData,
    //   appName: pfn[0]
    // }

    // this.hololensAPIService.uninstallHLApp(pfn[0]?.PackageFullName, this.data.hostIP).subscribe({

    //   next: (res) => {

    //     // [NOTE] Successful uninstallation returns null,
    //     //        so we need to create a success status for clarity
    //     if (res?.uninstallAppSuccess) {

    //       this.showAppUninstallationLoading = false;

    //       let result = {
    //         Status: "Uninstallation Complete"
    //       }
    //       console.log("[SUCCESSFUL] Uninstalling app:", result);

    //       this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} successful. Reloading HoloHub to update changes...`);

    //       this.notification = this.statusNotificationService.getNotification();
    //       this.statusNotificationService.renderToast(this.notification);

    //       this.statusNotificationService.logTask(appendedData, 'App Uninstallation', true);

    //     } else {

    //       console.log("[FAILED] Uninstalling app:", res);

    //       this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} failed: ${res.response}`);
    //       this.notification = this.statusNotificationService.getNotification();
    //       this.statusNotificationService.renderToast(this.notification);

    //       this.statusNotificationService.logTask(appendedData, 'App Uninstallation', false);

    //       this.showAppUninstallationLoading = false;

    //     }

    //   },
    //   error: (error) => {
    //     console.log("[ERROR] Uninstalling app:", error);

    //     this.statusNotificationService.setNotification(`Uninstalling ${pfn[0]} from ${this.data.deviceName} failed: ${error}`);

    //     this.notification = this.statusNotificationService.getNotification();
    //     this.statusNotificationService.renderToast(this.notification);

    //     this.statusNotificationService.logTask(appendedData, 'App Uninstallation', false);

    //     this.showAppUninstallationLoading = false;


    //   },
    //   complete: () => {

    //     console.log("[COMPLETE] Uninstalling app");

    //     this.showAppUninstallationLoading = false;

    //   }


    // });

  }

  onClickRestart() {

    console.log("Device Details - Restart Clicked");

    this.showDeviceDetailsSectionLoading = true;

    this.statusNotificationService.setNotification(`${this.data.deviceName} is restarting, please wait...`);
    this.notification = this.statusNotificationService.getNotification();


    // Create a fragment copy of Device Data (omit installedApp property as it is huge)
    var deviceData: Device = {
      id: this.data.id,
      hostIP: this.data.hostIP,
      hostComputerName: this.data.hostComputerName,
      deviceName: this.data.deviceName,
      battLife: this.data.battLife,
      isCharging: this.data.isCharging,
      isRegistered: this.data.isRegistered
    };

    this.statusNotificationService.logTask(deviceData, 'Device Restart', true);

    this.hololensAPIService.restartHL(this.data.hostIP).subscribe(
      {
        next: (response: any) => {

          if(response){

            this.showDeviceDetailsSectionLoading = false;
            console.log("Device Panel - Restart Response:", response);
            this.statusNotificationService.renderToast(this.notification);

          }

        },
        error: (error: any) => {

          console.log("Device Panel - Restart Error:", error);

          this.statusNotificationService.setNotification(`${this.data.deviceName} restart failed`);
          this.notification = this.statusNotificationService.getNotification();

          this.statusNotificationService.logTask(deviceData, 'Device Restart', false);

        }
        // complete: (message)=>{
        //   console.log("Device Panel - Restart Complete:", complete);
        // }
      }
    );

  }

  onClickShutdown() {

    console.log("Device Details - Shutdown Clicked");
    this.showDeviceDetailsSectionLoading = true;

    this.statusNotificationService.setNotification(`${this.data.deviceName} is shutting down, please wait...`);
    this.notification = this.statusNotificationService.getNotification();

    // Create a fragment copy of Device Data (omit installedApp property as it is huge)
    var deviceData: Device = {
      id: this.data.id,
      hostIP: this.data.hostIP,
      hostComputerName: this.data.hostComputerName,
      deviceName: this.data.deviceName,
      battLife: this.data.battLife,
      isCharging: this.data.isCharging,
      isRegistered: this.data.isRegistered
    };

    this.hololensAPIService.shutdownHL(this.hlAddress).subscribe(
      {
        next: (response: any) => {

          if(response){

            this.showDeviceDetailsSectionLoading = false;
            console.log("Device Panel - Shut Down Response:", response);

            this.statusNotificationService.logTask(deviceData, 'Device Shutdown', true);

          }

        },
        error: (error: any) => {

          console.log("Device Panel - Shut Down Error:", error);

          this.statusNotificationService.setNotification(`${this.data.deviceName} shutdown failed`);
          this.notification = this.statusNotificationService.getNotification();

          this.statusNotificationService.logTask(deviceData, 'Device Shutdown', false);


        }
        // complete: (message)=>{
        //   console.log("Device Panel - Restart Complete:", complete);
        // }
      }
    );

  }

  startMRCLivePreview(): void{

    console.log("Device Details - startMRCLivePreview - mrcStreamer: ", this.mrcStreamer);

    // this.streamingResponse = response.data;
    // this.mrcStreamer.nativeElement.play();
    this.playMRCStream = true;

    try{

      this.dataToPassToVideoStreamer.next({

        playStream: this.playMRCStream,
        hlVideoStreamingUrl: this.hlVideoStreamingUrl,
        deviceData: this.deviceData,
        isLoading: true

      });

    }catch(e){

      if(e instanceof TypeError){

        console.log("Device Details - startMRCLivePreview - TypeError", e);

      }

    }

  }

  endMRCLivePreview(): void{

    // console.log("Device Details - startMRCLivePreview - Response: ", response);
    console.log("Device Details - endMRCLivePreview - mrcStreamer: ", this.mrcStreamer);

    // this.streamingResponse = response.data;
    // this.mrcStreamer.nativeElement.play();
    this.playMRCStream = false;

    try{

      // Obtain VideoStreamer Behavioral Subject from Service (by ID)
      this.dataToPassToVideoStreamer = this.videoStreamService.getVideoStreamerDataById(this.deviceData.id);

      // Set next streaming data to true (and finally pass to video-streamer component in template)
      this.dataToPassToVideoStreamer.next({

        playStream: this.playMRCStream,
        hlVideoStreamingUrl: this.hlVideoStreamingUrl,
        deviceData: this.deviceData,
        isLoading: true

      });

    }catch(e){

      console.log("Device Details - startMRCLivePreview - TypeError", e);

      if(e instanceof TypeError){

        console.log("Device Details - startMRCLivePreview - TypeError", e);

      }

    }

  }


}

