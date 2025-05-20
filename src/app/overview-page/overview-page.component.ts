import { WebSocketService } from './../services/web-socket.service';
import { ViewportScroller } from '@angular/common';
import { SettingsService } from 'src/app/services/settings.service';
import { Component, ViewChildren, Input, Type, ChangeDetectorRef, ViewChild, ElementRef, ViewContainerRef } from '@angular/core';
import { Subscription, Subject, interval, concatMap, filter } from 'rxjs';
import { HololensAPIService } from '../services/hololens-api.service';
import { Form, FormGroup, FormControl } from '@angular/forms';
import { InsertDevicePanelDirective } from '../directives/insert-device-panel.directive';
import { DevicePanelComponent } from '../reusable-components/device-panel/device-panel.component';
import { DevicesService } from '../services/devices.service';
import { DeviceDetailsComponent } from '../device-details/device-details.component';
import { StatusNotificationsService } from '../services/status-notifications.service';
import { Device } from '../models/device.model';
import { DEVICE_TASK_LIST } from '../models/device-task-list';
import { VideoStreamService } from '../services/video-stream.service';
import { InsertDeviceRowDirective } from '../directives/insert-device-row.directive';
import { DeviceRowComponent } from '../reusable-components/device-row/device-row.component';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Settings } from '../models/settings.model';
import { GeneralSettings } from '../models/general-settings.model';
import { MatDialog } from '@angular/material/dialog';
import { PopUpDeviceRegistrationDialogComponent } from '../reusable-components/pop-up-device-registration-dialog/pop-up-device-registration-dialog.component';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, NavigationStart, Router } from '@angular/router';

@Component({
  selector: 'app-overview-page',
  templateUrl: './overview-page.component.html',
  styleUrls: ['./overview-page.component.scss'],

  // [KIV ANIMATION WORKS - FINISH UP TOASTS FIRST]
  animations:[
    trigger('openClose', [

      state('open',
        style({
          opacity: 100
        })
      ),
      state('closed',
        style({
          opacity: 0
        })
      ),
      transition('open => closed', [
        animate('0.5s')
      ]),
      transition('closed => open', [
        animate('0.5s')
      ]),

    ])
  ]
})
export class OverviewPageComponent {

  @ViewChildren(InsertDevicePanelDirective) insertDevicePanel!: InsertDevicePanelDirective | any;
  @ViewChildren(InsertDeviceRowDirective) insertDeviceRow!: InsertDeviceRowDirective | any;
  @ViewChild('activityLogTable') activityLogTable!: ElementRef;

  // Class variable to store fetched data
  data: any = null;

  componentPanelRef!: any;
  componentRowRef!: any;
  viewContainerRefPanelRecord!: ViewContainerRef;
  viewContainerRefRowRecord!: ViewContainerRef;
  devicePanelOnlineEmitterSubscription!: Subscription;

  masterActivityLog: any[] | null = null;
  DEVICE_TASK_LIST: string[] = [];
  SETTINGS_CONFIG: Settings = {

    generalSettings: null,
    networkSettings: null,
    storageSettings: null

  };

  showLoading: boolean = false;
  // beautifiedData!: any;
  packageFullNames: any[] = [];
  packageDisplayNames: any[] = [];
  fileToUpload!: any;
  acOnline!: any;
  registrationPanelDisplayed: boolean = false;
  devicesToRegister: any = [];
  previousDevicesToRegisterState: any = [];
  deviceDataWithID!: any;
  hololensPowerStatusData: Device[] = [];
  numOfHololensOnline: number = 0;
  numOfHololensBattLow: number = 0;

  onlineHololensPercentage: number = 0;

  isListView: boolean = false;
  isPanelView: boolean = true;

  ascendingAlphaSorted: boolean = false;

  hlName!: any;
  hlHostAddress!: any;
  hlDeviceName!: any;
  hlOnlineStatus!: any;
  registrationSuccessful: boolean = false;
  notification: string = '';

  hlRegistration: any = {
    hlHostAddress: '172.16.2.106',
    hlDeviceName: ''
  }

  hlFileUploader: any = {
    hlFileName: ''
  };

  appToRemove: any = {
    appToRemove: ''
  }

  hlRegistrationForm: FormGroup = new FormGroup({
    hlHostAddress: new FormControl(this.hlRegistration.hlHostAddress),
    hlDeviceName: new FormControl(this.hlRegistration.hlDeviceName)
  })

  hlFileUploaderForm: FormGroup = new FormGroup({
    hlFileName: new FormControl(this.hlFileUploader.hlFileName)
  });

  appRemoveForm: FormGroup = new FormGroup({
    appToRemove: new FormControl(this.appToRemove.appToRemove)
  });

  errorMessage!: string;
  showToast: boolean = false;

  constructor(private hololensAPIService: HololensAPIService,
    private settingsService: SettingsService,
    private devicesService: DevicesService,
    private statusNotificationService: StatusNotificationsService,
    private changeDetectorRef: ChangeDetectorRef,
    private videoStreamService: VideoStreamService,
    private viewportScroller: ViewportScroller,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private webSocketService: WebSocketService) {

      route.paramMap.subscribe((value) => {
        // put the code from `ngOnInit` here

        // this.ngOnInit();

      });
    }

  ngOnInit() {

    console.log("Overview [Ng On Init]");

    // Retrieve Settings Config, for App General Settings
    // Update Flash to enable/disable flashing update animation,
    // and Update Duration are retrieved to pace device updates
    let cachedSettingsConfig = this.settingsService.retrieveSettingsConfigFromLocalStorage();
    this.SETTINGS_CONFIG = cachedSettingsConfig? cachedSettingsConfig: this.SETTINGS_CONFIG;
    console.log("Overview Page - OnInit - SETTINGS_CONFIG - ", this.SETTINGS_CONFIG);

    // Retrieve cached user-selected view preference
    if(this.SETTINGS_CONFIG.generalSettings?.deviceView === "List"){

      this.isListView = true;
      this.isPanelView = false;

    }else{

      this.isPanelView = true;
      this.isListView = false;

    }

    // Obtain list of device's task types
    this.DEVICE_TASK_LIST = DEVICE_TASK_LIST;

    console.log("Overview Page - isLoading", this.showLoading);
    console.log("Overview Page - DEVICE_TASK_LIST", this.DEVICE_TASK_LIST);
    console.log("Overview Page - devicesToRegister", this.devicesToRegister);

    // If REGISTERED_DEVICES array is empty
    if (this.devicesService.getRegisteredDevices().length < 1) {

      console.log("Overview Page - OnInit - REGISTERED_DEVICE is empty, checking Local Storage");

      // Retrieve registered device from local storage
      var persistedDataFromLocalStorage = this.devicesService.retrieveRegisteredDeviceFromStorage();


      console.log("Overview Page - OnInit - REGISTERED_DEVICE - ", persistedDataFromLocalStorage);

      // If data exists in local storage data array
      if (persistedDataFromLocalStorage.length > 0) {

        console.log("Overview Page - OnInit - persistedDataFromLocalStorage - ",persistedDataFromLocalStorage);

        // Push existing local storage data for registration again to re-render device panel component in view
        this.devicesToRegister.push(...persistedDataFromLocalStorage);

        // Set HL Power Statuses and Online Count from cached device data for a start
        // this.hololensPowerStatusData = this.devicesToRegister;
        // this.numOfHololensOnline = this.devicesToRegister.filter((deviceData:Device) => deviceData.isOnline).length;

        console.log("Overview Page - this.numOfHololensOnline - ", this.numOfHololensOnline);
        console.log("Overview Page - this.deviceToRegister - ", this.devicesToRegister);

      }

    }else{

      // Assign existing REGISTERED_DEVICES data for re-registration to re-render components in view
      // This is for when user re-enter of Overview Page from other routes
      this.devicesToRegister = this.devicesService.getRegisteredDevices();

      console.log("Overview Page - devicesToRegister - devicesService.getRegisteredDevice() not empty", this.devicesToRegister);

      // Retrieve HL Power Statuses and Online Count
      // this.hololensPowerStatusData = this.devicesToRegister;
      // this.numOfHololensOnline = this.devicesToRegister.filter((deviceData:Device)=>deviceData.isOnline).length;

    }


    // Sort devices based on Online, Sleep and Offline
    // This is for displaying of devices status' in Device Status tab
    var onlineDevices: Device[] = [];
    var sleepDevices: Device[] = [];
    var offlineDevices: Device[] = [];
    var sortedDevices: Device[] = [];


    onlineDevices = this.devicesToRegister.filter((device:Device)=> device.isOnline && !device.lowPowerState);
    sleepDevices = this.devicesToRegister.filter((device:Device)=> device.isOnline && device.lowPowerState);
    offlineDevices = this.devicesToRegister.filter((device:Device)=> !device.isOnline);

    console.log("Overview Page - sortByOnlineStatus - onlineDevices", onlineDevices);
    console.log("Overview Page - sortByOnlineStatus - sleepDevices", sleepDevices);
    console.log("Overview Page - sortByOnlineStatus - offlineDevices", offlineDevices);

    // Re-pack devices in this seq - online, sleep, offline
    sortedDevices.push(...onlineDevices,...sleepDevices,...offlineDevices);

    // Retrieve and initialise HL Power Statuses Online Count and Batt Low Count
    // this.hololensPowerStatusData = this.devicesToRegister;
    this.hololensPowerStatusData = sortedDevices;
    this.numOfHololensOnline = this.devicesToRegister.filter((deviceData:Device)=>deviceData.isOnline).length;
    this.numOfHololensBattLow = this.devicesToRegister.filter((deviceData:Device)=> deviceData.battLife < 25).length;

    console.log("Overview Page - OnInit - getAllVideoStreamerData", this.videoStreamService.getAllVideoStreamerData());
    const videoStreamerArrayLength = this.videoStreamService.getAllVideoStreamerData().length;
    console.log("Overview Page - OnInit - getAllVideoStreamerDataLength", videoStreamerArrayLength);

    // Invoke Video Stream Service to set Video Stream Data for later consumption
    if(videoStreamerArrayLength < 1){

      this.videoStreamService.setVideoStreamerData();

    }

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

    this.hlRegistrationForm.valueChanges.subscribe((value) => {

      console.log("HL Registration Form Group (value change) - ", value);

      this.hlRegistration = value;

      console.log("this.hlHostAddress (value change) - ", value);
      console.log("this.hlHostAddress (value change) - ", value);

    });

    this.statusNotificationService.getMasterTaskLog().subscribe((activityLogs:any)=>{

      this.masterActivityLog = activityLogs;

    });


    // Listen for changes in Hololens power status (this is for Devices Status Table)
    // Data flow: (1) Device Panel's interval-based refresh invokes Device Services' pushToOnlineHololensRecord(...)
    //            (2) In pushToOnlineHololensRecord(..), a storage array is updated based on status change
    //            (3) Emit updated hololens statuses out to this component
    // this.devicesService.devicePowerStatusEmitter
    //   .subscribe((deviceData:any)=>{

    //     console.log("Overview Page - devicePowerStatus emitter interval - deviceData", deviceData);

    //     if(deviceData !== undefined){

    //       this.hololensPowerStatusData = deviceData;
    //       console.log("Overview Page - devicePowerStatus emitter interval - deviceData (in if)", deviceData);

    //     }else{

    //       // this.hololensPowerStatusData = [];

    //     }

    //     this.changeDetectorRef.detectChanges();

    //   });


    // [REVISIT THIS FOR REMOVAL] Listen for Online Hololens Count event
    // Data flow: (1) Device Panel's interval-based refresh invokes Device Services' pushToOnlineHololensRecord(...)
    //            (2) In pushToOnlineHololensRecord(..), a storage array is updated based on status change
    //            (3) Emit updated count out to this component
    this.devicesService.onlineHololensCountEmitter.subscribe((updatedDeviceCount: any)=>{

      this.numOfHololensOnline = updatedDeviceCount;

    });

    // (WEBSOCKET) Send API request with START signal to initiate HoloLens poll
    this.hololensAPIService.startDataPolling().subscribe({
      next:(response:any)=>{

        console.log("[Overview Page] START DATA POLLING - response", response);

      },
      error:(error: any)=>{

        console.log("[Overview Page] START DATA POLLING - request complete",error);

      },
      complete:()=>{

        console.log("[Overview Page] START DATA POLLING - request complete");

      }

    });

    // Trigger websocket listening channel
    this.devicesService.listenToDeviceDataChange();

    // [Important Note] This subscription will enable page reload everytime user navigates.
    //                  Currently enabled because it allows proper refresh of data in Live Page
    //                  Without it, some rows in Play HoloLens App tend to be missing until user manually refreshes
    this.router.events.subscribe(async (event) => {

      console.log("[Overview Page] Route Events - ",event);

      // location.reload();

      // [Bug Resolved 15/05] This is to resolve a bug where if
      //                      MDM App is in empty state (eg. on first-ever runtime),
      //                      navigating to other pages causes reloading back to Overview Page

        // Reload page to synch if MDM App already has registered device (persisted in Local Storage or during runtime)
        if(await this.devicesService.retrieveRegisteredDeviceFromStorage().length > 0){

          // The event is and instance of NavigationEnd, get URL and
          if(event instanceof NavigationEnd &&
              (event?.url !== "/started/settings"
              && event?.url !== "/started/settings/general"
              && event?.url !== "/started/settings/network"
              && event?.url !== "/started/settings/session")){

            console.log("[Overview Page] Route Events (before reload) - ",event.url)

            location.reload();

          }

        }


    });


  }

  ngAfterViewInit() {

    if (this.devicesToRegister.length > 0) {

      // Send initial device data (stored in devicesToRegister array) to respective panel/row
      this.devicesToRegister.forEach((device: any, index: any)=>{

        const dataToPass = {
          ...device,
          listIndex: index + 1

        }

        // Dynamically render panel
        this.renderDevicePanel(dataToPass);
        this.renderDeviceRow(dataToPass);

      });


    }

    // Listen to Device Deregistration Event, in which if there is, reload page
    this.devicesService.deviceDeregistrationEmitter.subscribe((emittedValue: any)=>{

      console.log("Overview Page - deviceDeregisterationEmitter - device is deregistered", emittedValue);

      if(emittedValue !== undefined){

        if(emittedValue.reloadPage){

          // console.log("Reloading pageeee")
          // Reload Overview Page with updated Device Panels
          location.reload();

        }

      }

    });

  }

  ngAfterViewChecked(){}

  ngDoCheck(){

    if(this.numOfHololensOnline !== this.devicesService.getHololensOnlineCount()){

      console.log("ONLINE COUNT CHANGED!");

      this.numOfHololensOnline = this.devicesService.getHololensOnlineCount();

    }

    if(this.numOfHololensBattLow !== this.devicesService.getBatteryLowCount()){

      console.log("BATT LOW CHANGED!");

      this.numOfHololensBattLow = this.devicesService.getBatteryLowCount();

    }

  }

  ngOnDestroy() {

    console.log("Overview [Ng On Destroy]");
    this.devicePanelOnlineEmitterSubscription.unsubscribe();
    // this.devicesService.unsubscribeToDeviceDataChange();

    // [!!!] Reload on page change. Bugged out because websocket connection will be lost when new route reloads
    // window.location.reload();
    this.hololensAPIService.stopDataPolling('overview-page').subscribe({
      next: (response)=>{

        console.log("[Overview Page] STOP DATA POLLING - response", response);


      },
      error: (error)=>{

        console.log("[Overview Page] STOP DATA POLLING - request error");

      },
      complete: ()=>{

        console.log("[Overview Page] STOP DATA POLLING - request complete");

      },


    });

  }

  displayRegistrationPanel() {

    this.showLoading = false;
    this.registrationPanelDisplayed = !this.registrationPanelDisplayed;

  }

  displayPopUpRegistrationPanel(){

    var registrationResult;
    var parsedResult;

    let popUpRegistrationPanelRef = this.dialog.open(PopUpDeviceRegistrationDialogComponent, {

      width: '550px',
      height: '650px'

    });

    popUpRegistrationPanelRef.componentInstance.hlRegistrationForm = this.hlRegistrationForm;

    // Retrieve results of user-input from pop-up dialog
    popUpRegistrationPanelRef.afterClosed().subscribe(result=>{

      registrationResult = result;
      console.log("Overview - disp  layPopUpRegistrationPanel - result from dialog", result);
      // console.log("Overview - disp  layPopUpRegistrationPanel - result from dialog", registrationResult);

      // Prepare device registration input result
      parsedResult = {
        hostIP: registrationResult.deviceToRegister.hostIP,
        deviceName: registrationResult.deviceToRegister.deviceName,
        username: registrationResult.deviceToRegister.username,
        password: registrationResult.deviceToRegister.password
      }

      console.log("Overview - disp  layPopUpRegistrationPanel - result from dialog", parsedResult);

      this.onSubmitRegistration(parsedResult);

    });

  }

  // ====================================================================
  // This function sets flag to false when 'Cancel' button in registration
  // window is pressed
  // ====================================================================
  cancelRegistration() {

    this.registrationPanelDisplayed = false;

  }

  // ====================================================================
  // This function serves to send registration values back to NG service
  // for further processing, and obtain HTTP response from /register call
  // ====================================================================
  onSubmitRegistration(popUpDialogResults = {
    hostIP: null,
    deviceName: null,
    username: null,
    password: null
  }) {

    console.log("Overview Page - Pop Up Dialog Result - ", popUpDialogResults);

    // This condition is to set apart registration via Registration Panel and Pop-up Registration Dialog
    // [DELETE PANEL AFTER POP-UP REGISTRATION REWORK]
    if(this.hlRegistration.hlHostAddress.length > 1 && this.hlRegistration.hlDeviceName.length > 1){

      this.hlHostAddress = this.hlRegistration.hlHostAddress;
      this.hlDeviceName = this.hlRegistration.hlDeviceName;

    // Otherwise, use form results retrieved from Pop-up Registration Dialog
    }else{

      this.hlHostAddress = popUpDialogResults.hostIP;
      this.hlDeviceName = popUpDialogResults.deviceName;

    }

    this.showLoading = true;

    console.log("Overview Page - onSubmitReg...() - this.hlHostAddress", this.hlHostAddress);

    // Validate Registering IP Address
    var ipAddressIsDuplicateRecord: Device[] | null = this.registeringIPAddressIsDuplicate(this.hlHostAddress);
    var ipAddressIsDuplicate = !ipAddressIsDuplicateRecord?false:true;

    // If duplicate is found (typically by DHCP operation), warn user. Otherwise, start registration
    if(ipAddressIsDuplicate){

      this.statusNotificationService.renderToast(`IP Address is duplicate with ${(ipAddressIsDuplicateRecord as Device[])[0].deviceName}. If this might be the works of your DHCP Server, please de-conflict IP Address by unassigning ${(ipAddressIsDuplicateRecord as Device[])[0].hostIP} from ${(ipAddressIsDuplicateRecord as Device[])[0].deviceName}`);

    }else{

      // Invoke registerHololens observable
      this.hololensAPIService.registerHololens(popUpDialogResults).subscribe({

        next: (response: any) => {

          console.log("Overview - [Registration] - Authentication Response:", response);
          this.data = response;
          // const allCallsContainErrorMessage:boolean = this.data[0].value.hasOwnProperty('errorMessage')
          //   && this.data[1].value.hasOwnProperty('errorMessage')
          //   && this.data[2].value.hasOwnProperty('errorMessage')
          //   && this.data[3].value.hasOwnProperty('errorMessage');


          // [27/11 STOP HERE]: REFACTORING BACKEND REGISRATION API ONGOING
          //              READ THIS BLOCK OF CODES BELOW AND REFACTOR
          const allCallsContainErrorMessage:boolean = !this.data[0].value.fetchSuccess
                                                  && !this.data[1].value.fetchSuccess
                                                  && !this.data[2].value.fetchSuccess
                                                  && !this.data[3].value.fetchSuccess;

          // const allCallsContainErrorMessage:boolean = !this.data.value.fetchSuccess;

          if(allCallsContainErrorMessage){

            var errorRegisterDeviceMetaData: Device = {

              id: null,
              hostIP: this.hlHostAddress,
              hostComputerName: null,
              deviceName: this.hlDeviceName,
              isOnline: false,
              battLife: null,
              isCharging: null,
              isRegistered: false

            }

            this.statusNotificationService.logTask(errorRegisterDeviceMetaData, 'Device Registration', true);
            this.registrationSuccessful = false;
            this.showLoading = false;
            this.statusNotificationService.setNotification(`'${this.hlDeviceName}' registration failed. Error: ${this.data[0].value?.errorMessage?.errno}`);
            let message = this.statusNotificationService.getNotification();
            this.statusNotificationService.renderToast(message);

          }else{

            if (this.data) {

              this.showLoading = false;

            }

            // If response return Computer Name (i.e OS Name), device is implied
            // to exist and may establish connection
            if (this.data[3].status === "fulfilled" && this.data[3].hasOwnProperty('value')) {

              // Parse and store HL's OS Name
              this.hlName = this.data[3].value.ComputerName;

              // Retrieve Package Full Names and Package Display Names from HL
              if (this.data[0].status === "fulfilled" && this.data[0].hasOwnProperty('value')) {

                console.log("------------------------------------ this.data[0]", this.data[0]);
                let installedPackages: any = this.data[0].value.InstalledPackages;

                installedPackages.forEach((app: any) => {
                  // console.log(app.PackageFullName);

                  // Parse and store HL App's Package Full Name and Package Display Name into arrays
                  this.packageFullNames.push(app.PackageFullName);
                  this.packageDisplayNames.push(app.PackageDisplayName);

                });

                // [DEBUG]
                // console.log(this.packageFullNames);
                // console.log(this.packageDisplayNames);

              }

              // Re-calculate HL's Battery Life
              var batteryLifePercentage
                = Math.floor((response[1].value.RemainingCapacity / response[1].value.MaximumCapacity) * 100);

              // Cap batt at 100 as sometimes reponse from HoloLens strangely produces more than 100% batt life
              if(batteryLifePercentage > 100){

                batteryLifePercentage = 100;

              }

              console.log("Overview Page - onSubmitRegistration - batteryLifePercentage", batteryLifePercentage)
              console.log("Overview Page - onSubmitRegistration - this.hlDeviceName", this.hlDeviceName)

              // Create Device Metadata for the newly registered device
              var registeredDeviceMetaData: Device = {
                id: response.deviceId,
                hostIP: this.hlHostAddress,
                hostComputerName: this.hlName,
                deviceName: this.hlDeviceName,
                isOnline: true,
                battLife: batteryLifePercentage,
                isCharging: this.data[1].value.acOnline,
                isRegistered: true,
                installedApps: this.packageDisplayNames,
                username: popUpDialogResults.username,
                password: popUpDialogResults.password
              }

              console.log("Overview Page - onSubmitRegistration - deviceDataWithID - filter", this.devicesToRegister.filter((device: Device) => device.id)[0]);

              // [2606] STOP HERE - Refine this dodgy condition SDASDFSAFADSFDSAFSAFADSFA
              // [130324] What I meant to do is if registeredDeviceMetaData is not in record, append it with an ID
              if(this.devicesToRegister.filter((device: Device) => device.id)[0] !== registeredDeviceMetaData){

                // Obtain Device Metadata appended with ID generated by Devices Service
                // [130324] When setDeviceMetaData is invoked, registeredDeviceMetaData (with ID) is
                //          added into REGISTERED_DEVICES at the same time
                this.deviceDataWithID = this.devicesService.setDeviceMetaData(registeredDeviceMetaData);
                console.log("Overview Page - onSubmitRegistration - deviceDataWithID - ", this.deviceDataWithID);

                // Push to device to array
                this.devicesToRegister.push(this.deviceDataWithID);
              }

              console.log("Overview Page - deviceToRegister - ", this.devicesToRegister);
              console.log("Overview Page - deviceToRegister (sliced last) - ", this.devicesToRegister.slice(-1)[0]);

              // Render Device Panel and Device Row after Hololens data is set
              this.renderDevicePanel(this.deviceDataWithID);
              this.renderDeviceRow(this.deviceDataWithID);

              // Record registration
              this.statusNotificationService.logTask(registeredDeviceMetaData, 'Device Registration', true);
              this.registrationSuccessful = true;
              let message = `'${this.hlDeviceName}' successfully registered`;

              //  Why? Because in cases where MDM App is run the first time, REGISTERED_DEVICES key may
              //       not be found in Local Storage. Registering a HoloLens the first time will not persist
              //       This will cause app to be unstable
              this.devicesService.saveRegisteredDevicesRecordIntoLocalStorage();

              // Log notification and render toast message
              this.statusNotificationService.setNotification(message);
              this.statusNotificationService.renderToast(message);

            // Otherwise, device is deemed to not exist and connection cannot be established
            } else {

              var unregisteredDeviceMetaData: Device = {

                id: null,
                hostIP: this.hlHostAddress,
                deviceName: this.hlName

              }

              // Record registration
              this.statusNotificationService.logTask(unregisteredDeviceMetaData, 'Device Registration', false);
              this.registrationSuccessful = false;

              // Prompt text stating device is not found in the network, log and send message to Toast Message
              let message = `Registration failure. '${this.hlDeviceName}' is not found in the network`;
              this.statusNotificationService.setNotification(`Registration failure. '${this.hlDeviceName}' is not found in the network. Please verify HoloLens IP Address is correct or HoloLens is powered on.`);
              this.statusNotificationService.renderToast(message);

            }

            this.notification = this.statusNotificationService.getNotification();

          }


        },

        error: (errorMessage: any) => {

          console.log("Overview - [Registration] - Error!:", errorMessage);
          this.showLoading = false;

          this.statusNotificationService.setNotification(`'${this.hlDeviceName}' registration failed. Please verify HoloLens IP Address is correct or HoloLens is powered on.`);
          let message = this.statusNotificationService.getNotification();
          this.statusNotificationService.renderToast(message);

        },


      });

    }

  }

  // ====================================================================
  // This function serves to check if registering HoloLens has a duplicate address
  // with registered ones
  // ====================================================================
  registeringIPAddressIsDuplicate = (registeringIPAddress: string) =>{

    var duplicateArr: Device[] = [];

    this.devicesToRegister.forEach((device:Device)=>{

      if(device.hostIP === registeringIPAddress){

        duplicateArr.push(device);

      }

    });

    console.log("[registeringIPAddressIsDuplicate] isDuplicate", duplicateArr);

    if(duplicateArr.length > 0){

      return duplicateArr;

    }

    return null;

  }

  // ====================================================================
  // This function serves to render Device Panel (In device panel view)
  // ====================================================================
  renderDevicePanel(deviceData: Device) {

    console.log("Overview Page - In Render Device Panel");

    const formContainerReferences = this.insertDevicePanel["_results"];

    console.log("Overview Page - In Render Device Panel - formContainerReferences - ", formContainerReferences);

    // Iterate formContainerReferences
    // ViewChildren class reference is used for the Container References
    // to plan ahead for future scale-up on Multiple Device Registration
    formContainerReferences.forEach((child: any, index: any) => {

      var dataToPass = {}

      const insertDevicePanelContainer = child.viewContainerRef;

      // [SORTING DEV]
      this.viewContainerRefPanelRecord = insertDevicePanelContainer;
      // this.viewContainerRefRecord.push(insertDevicePanelContainer);

      // Filter the device's metadata to be registered from devicesToRegister array
      // var dataToPass = this.devicesToRegister.filter((device: any) => device.deviceName === this.hlDeviceName)[0];
      console.log("Overview Page - In Render Device Panel - deviceData - ", deviceData);

      // Concat deviceData and Settings Configs (to be passed to respective Device Panels)
      dataToPass = {

        ...deviceData,
        updateFlash: this.SETTINGS_CONFIG.generalSettings?.enableUpdateFlash,
        deviceUpdateInterval: this.SETTINGS_CONFIG.generalSettings?.deviceUpdateInterval

      }

      // Create an instance of DevicePanel
      const devicePanel = new DevicePanel(DevicePanelComponent, dataToPass);

      // Create device panel instance and push each device data object into each formViewContainer
      this.componentPanelRef = insertDevicePanelContainer.createComponent(devicePanel.component);

      // Pass device data (deviceData) to this instance of Device Panel
      this.componentPanelRef.instance.deviceData = devicePanel.data;

      console.log("Overview Page - In Render Device Panel - insertDevicePanel (after panel render) - ", this.componentPanelRef.instance);

    });

    // Subscribe to Device Panel Component (Online Event) output
    this.devicePanelOnlineEmitterSubscription = this.componentPanelRef.instance.onlineEvent.subscribe((dataFromDevicePanel:any)=>{

      console.log("Overview Page - In Render Device Panel - dataFromDevicePanel - ", dataFromDevicePanel);

      // [TESTING IN PROGRESS] If TypeError: isOnline is undefined within if-block,
      // change if-block condition to dataFromDevicePanel typeof undefined, and test again
      if(dataFromDevicePanel !== undefined){

        var index: any = 0;
        var filteredDeviceData: any = this.hololensPowerStatusData.filter((deviceData, idx)=>{

          if(deviceData.id === dataFromDevicePanel.id){

            index = idx;

          };

        })[0];

        console.log("Overview Page - In Render Device Panel - this.hololensPowerStatusData - ", this.hololensPowerStatusData);
        console.log("Overview Page - In Render Device Panel - filteredDeviceData - ", filteredDeviceData);
        console.log("Overview Page - In Render Device Panel - index - ", index);

        if(this.hololensPowerStatusData.length > 0){

          this.hololensPowerStatusData[index].isOnline = dataFromDevicePanel.isOnline;
          this.hololensPowerStatusData[index].lowPowerState = dataFromDevicePanel.lowPowerState;
          // this.hololensPowerStatusData[index].battLife = dataFromDevicePanel.battLife;

        }else{

          // [03/10 TO RESOLVE]
          console.log("Hololens Power Status Data is empty, to resolve in future dev");

        }

      }


    });

    // [STOP HERE 27/09] TO RESOLVE OFFLINE TRIGGER ON HL ONLINE COUNTER WFH
    // Subscribe to Device Panel Component (Offline Event) output
    this.componentPanelRef.instance.offlineEvent.subscribe((dataFromDevicePanel:any)=>{

      console.log("Overview Page - In Render Device Panel - dataFromDevicePanel - ", dataFromDevicePanel);

    });

    this.componentPanelRef.instance.deviceDetailsNavEvent.subscribe((dataFromDevicePanel: any)=>{


      if(dataFromDevicePanel){

        if(dataFromDevicePanel.nav){

          this.viewportScroller.scrollToAnchor('footer');

        }

      }

    })

  }

  // ====================================================================
  // This function serves to render row of the Device List View
  // ====================================================================
  renderDeviceRow(deviceData: Device){

    var dataToPass = {}

    console.log("Overview Page - In Render Device Row");

    const formContainerReferences = this.insertDeviceRow["_results"];


    console.log("Overview Page - In Render Device Row - formContainerReferences - ", formContainerReferences);

    // Concat deviceData and Settings Configs (to be passed to respective Device Panels)
    dataToPass = {

      ...deviceData,
      updateFlash: this.SETTINGS_CONFIG.generalSettings?.enableUpdateFlash,
      deviceUpdateInterval: this.SETTINGS_CONFIG.generalSettings?.deviceUpdateInterval

    }

    // Iterate formContainerReferences
    // ViewChildren class reference is used for the Container References
    // to plan ahead for future scale-up on Multiple Device Registration
    formContainerReferences.forEach((child: any, index: any) => {

      const insertDeviceRowContainer = child.viewContainerRef;
      this.viewContainerRefRowRecord = insertDeviceRowContainer;


      // Filter the device's metadata to be registered from devicesToRegister array
      // var dataToPass = this.devicesToRegister.filter((device: any) => device.deviceName === this.hlDeviceName)[0];
      console.log("Overview Page - In Render Device Row - deviceData - ", deviceData);

      // Create an instance of DevicePanel
      const devicePanel = new DevicePanel(DeviceRowComponent, dataToPass);

      // Create device panel instance and push each device data object into each formViewContainer
      this.componentRowRef = insertDeviceRowContainer.createComponent(devicePanel.component);

      // Pass device data (deviceData) to this instance of Device Row
      this.componentRowRef.instance.deviceData = devicePanel.data;

      console.log("Overview Page - In Render Device Row - insertDevicePanel (after panel render) - ", this.componentPanelRef.instance);

    });

    // Subscribe to Device Panel Component (Online Event) output
    this.componentRowRef.instance.onlineEvent.subscribe((dataFromDeviceRow:any)=>{

      console.log("Overview Page - In Render Device Row - dataFromDevicePanel - ", dataFromDeviceRow);

    });

  }


  // ====================================================================
  // This function serves to ... [KIV WIP]
  // ====================================================================
  onActivate(component: DeviceDetailsComponent) {


    console.log("Router Outlet Activated -", component);

    // if (this.deviceData) {

    //   component.deviceData = this.deviceData;

    // }

  }

  // ====================================================================
  // This function serves to toggle UI views (Panel/List & Sort Viewing Options)
  // ====================================================================
  switchToListView(){

    // Set view flag (List true)
    this.isListView = true;
    this.isPanelView = false;

    // Mutate existing General Settings model to update state of view
    const generalSettings: GeneralSettings = {
      ...this.SETTINGS_CONFIG.generalSettings
    }
    Object.assign(generalSettings, {
      deviceView: 'List'
    });
    this.settingsService.saveGeneralSettingsToMasterRecords(generalSettings);

    this.changeDetectorRef.detectChanges();

  }

  switchToPanelView(){

    // Set view flag (Panel true)
    this.isListView = false;
    this.isPanelView = true;

    // Mutate existing General Settings model to update state of view
    const generalSettings: GeneralSettings = {
      ...this.SETTINGS_CONFIG.generalSettings
    }
    Object.assign(generalSettings, {
      deviceView: 'Panel'
    });
    this.settingsService.saveGeneralSettingsToMasterRecords(generalSettings);

    this.changeDetectorRef.detectChanges();

  }


  // =========================================
  // Sorting Functions
  // =========================================

  toggleAlphaSort(){

    if(!this.ascendingAlphaSorted){

      this.sortByAscendingAlpha();

      this.ascendingAlphaSorted = true;

    }else{

      this.sortByDescendingAlpha();
      this.ascendingAlphaSorted = false;

    }


  }

  // Sorting By Initial
  sortByAscendingAlpha(){

    console.log("Overview Page - (BEFORE SORTING ALPHA ASC)", this.devicesToRegister);

    var sortedDevices: Device[] = this.devicesToRegister.sort((a: Device,b:Device)=>{


      console.log("Overview Page - (Comparing sort)", a.deviceName - b.deviceName);

      // return a.deviceName - b.deviceName
      return a.deviceName.localeCompare(b.deviceName);

    });

    console.log("Overview Page - (AFTER SORTING ALPHA ASC)", sortedDevices);

    // Destroy existing Dynamic Panels/Rows by destroying View Container Ref and invoking Component Ref
    this.viewContainerRefPanelRecord.clear();
    this.viewContainerRefRowRecord.clear();
    this.componentPanelRef.destroy();
    this.componentRowRef.destroy();

    // Send initial device data (stored in devicesToRegister array) to respective panel/row
    // and re-render panels and row
    sortedDevices.forEach((device: any, index: any)=>{

      const dataToPass = {
        ...device,
        listIndex: index + 1

      }

      console.log("this.componentref (sorting dev)", this.componentPanelRef);

      this.renderDevicePanel(dataToPass);
      this.changeDetectorRef.detectChanges();
      this.renderDeviceRow(dataToPass);

    });


  }

  // Sorting By Initial
  sortByDescendingAlpha(){

    console.log("Overview Page - (BEFORE SORTING ALPHA ASC)", this.devicesToRegister);

    var sortedDevices: Device[] = this.devicesToRegister.reverse((a: Device,b:Device)=>{


      console.log("Overview Page - (Comparing sort)", a.deviceName - b.deviceName);

      // return a.deviceName - b.deviceName
      return a.deviceName.localeCompare(b.deviceName);

    });

    console.log("Overview Page - (AFTER SORTING ALPHA ASC)", sortedDevices);

    // Destroy existing Dynamic Panels/Rows by destroying View Container Ref and invoking Component Ref
    this.viewContainerRefPanelRecord.clear();
    this.viewContainerRefRowRecord.clear();
    this.componentPanelRef.destroy();
    this.componentRowRef.destroy();


    // Send initial device data (stored in devicesToRegister array) to respective panel/row
    // and re-render panels and row
    sortedDevices.forEach((device: any, index: any)=>{

      const dataToPass = {
        ...device,
        listIndex: index + 1

      }

      this.renderDevicePanel(dataToPass);
      this.renderDeviceRow(dataToPass);

    });

  }

  // Sorting By Online Status
  sortByOnlineStatus(){

    console.log("Overview Page - (BEFORE SORTING ONLINE)", this.devicesToRegister);

    var onlineDevices: Device[] = [];
    var sleepDevices: Device[] = [];
    var offlineDevices: Device[] = [];
    var sortedDevices: Device[] = [];


    onlineDevices = this.devicesToRegister.filter((device:Device)=> device.isOnline && !device.lowPowerState);
    sleepDevices = this.devicesToRegister.filter((device:Device)=> device.isOnline && device.lowPowerState);
    offlineDevices = this.devicesToRegister.filter((device:Device)=> !device.isOnline);

    console.log("Overview Page - sortByOnlineStatus - onlineDevices", onlineDevices);
    console.log("Overview Page - sortByOnlineStatus - sleepDevices", sleepDevices);
    console.log("Overview Page - sortByOnlineStatus - offlineDevices", offlineDevices);

    sortedDevices.push(...onlineDevices,...sleepDevices,...offlineDevices);

    console.log("Overview Page - (AFTER SORTING ONLINE ASC)", sortedDevices);

    // Destroy existing Dynamic Panels/Rows by destroying View Container Ref and invoking Component Ref
    this.viewContainerRefPanelRecord.clear();
    this.viewContainerRefRowRecord.clear();
    this.componentPanelRef.destroy();
    this.componentRowRef.destroy();


    // Send initial device data (stored in devicesToRegister array) to respective panel/row
    // and re-render panels and row
    sortedDevices.forEach((device: any, index: any)=>{

      const dataToPass = {
        ...device,
        listIndex: index + 1

      }

      this.renderDevicePanel(dataToPass);
      this.renderDeviceRow(dataToPass);

    });

  }

  trackDeviceListByName(index:number,item:Device){

    // console.log("trackDeviceListByName - item",item);

    // If device name is diff or
    //    device IP   is diff or
    //    device Power Status is diff
    //    return true

    // return null;

  }

}


// Device Panel Component Model - To modularize into a separate model file later
class DevicePanel {
  constructor(
    public component: Type<any>,
    public data: any
  ) { }
}
