import { StatusNotificationsService } from './../../services/status-notifications.service';
import { Buffer } from 'buffer';
import { getDeviceData } from './../../states/devices.actions';
import { DevicesService } from './../../services/devices.service';
import { Observable } from 'rxjs';
import { Subscription } from 'rxjs';
import { Component, ChangeDetectorRef } from '@angular/core';
import { HololensAPIService } from 'src/app/services/hololens-api.service';
import { DeviceInstalledApps } from 'src/app/models/device-installed-apps.model';
import { Device } from 'src/app/models/device.model';
import { FormControl, FormGroup } from '@angular/forms';
import { SettingsService } from 'src/app/services/settings.service';
import { MatDialog } from '@angular/material/dialog';
import { PassphraseDialogComponent } from './passphrase-dialog/passphrase-dialog.component';
import { PopUpMessageDialogComponent } from 'src/app/reusable-components/pop-up-message-dialog/pop-up-message-dialog.component';

@Component({
  selector: 'app-network-settings',
  templateUrl: './network-settings.component.html',
  styleUrls: ['./network-settings.component.scss']
})
export class NetworkSettingsComponent {

  // Test var
  // hostIP: any = '172.16.2.129';

  deviceDropdownForm: FormGroup = new FormGroup({

    deviceIP: new FormControl('Select Active HoloLens')

  });

  selectedDevice: {deviceIP:string|null} = {
    deviceIP: null
  };
  selectedDeviceID!: any;

  wifiProfiles: any[] = [];
  availableNetworks!: any[];
  GUID!: any;
  showCloseButton: boolean = false;

  allDevicesData: Device[] = [];
  activeHololens!: Device[];

  notifications: string = '';
  isAvailableNetworkLoading: boolean = false;
  isWifiProfilesLoading: boolean = false;

  constructor(private hololens: HololensAPIService,
    private changeDetectorRef: ChangeDetectorRef,
    private devicesService: DevicesService,
    private settingsService: SettingsService,
    private statusNotificationsService:StatusNotificationsService,
    public dialog: MatDialog){}

  ngOnInit(){

    // If REGISTERED_DEVICES is empty (implying that user init app from this page)
    if(!this.devicesService.getRegisteredDevices().length){

      // Retrieve from browser cache
      this.allDevicesData = this.devicesService.retrieveRegisteredDeviceFromStorage();

    }else{

      // Retrieve REGISTERED_DEVICES
      this.allDevicesData = this.devicesService.getRegisteredDevices();

    }

    this.activeHololens = this.allDevicesData.filter((device) =>{

      return device.isOnline;

    });

    console.log("Network Settings - allDevicesData", this.activeHololens);

    // Set default values in component var and form control
    this.deviceDropdownForm.controls["deviceIP"].setValue(this.activeHololens[0].hostIP);
    console.log("Network Settings - Initial Form Control 'deviceIP'", this.deviceDropdownForm.controls["deviceIP"]);
    this.selectedDevice = {
      deviceIP: this.activeHololens[0].hostIP
    };

    this.deviceDropdownForm.valueChanges.subscribe((value)=>{

      console.log("Device Dropdown Form - valueChanges", value);

      this.selectedDevice = value;
      this.selectedDeviceID = this.allDevicesData.filter((deviceData)=>deviceData.hostIP === this.selectedDevice.deviceIP)[0]?.id;
      console.log("Network Settings - Changed Form Control 'deviceIP'", this.deviceDropdownForm.controls["deviceIP"]);


    });


  }

  ngAfterViewInit(){


  }

  ngOnDestroy(){

    console.log("Network Settings - [Ng On Destroy]");

  }

  // ======================================================
  // Load Network Profiles of select device in 'Device Name' dropdown
  // & scan WiFi Networks
  // ======================================================
  loadNetworkConfig = () =>{

    this.isAvailableNetworkLoading = true;
    this.isWifiProfilesLoading = true;

    // [KIV for later dev]
    var cachedNetworkConfig = this.settingsService.retrieveSettingsConfigFromLocalStorage();
    console.log("Network Settings - loadNetworkConfig - cachedNetworkConfig - ", cachedNetworkConfig);
    console.log("Network Settings - loadNetworkConfig - selectedDeviceID - ", this.selectedDeviceID);

    try{

      // Clear wifiProfiles
      if(this.wifiProfiles.length > 1 || !this.wifiProfiles){

        this.wifiProfiles = [];

      }

      var selectedDeviceData = this.allDevicesData.filter((device)=> device.hostIP === this.selectedDevice.deviceIP);

      var dataToPass = {

        hostIP: this.selectedDevice.deviceIP,
        username: selectedDeviceData[0]?.username,
        password: selectedDeviceData[0]?.password

      }

      this.hololens.getWifiProfiles(dataToPass).subscribe({

        next: (response)=>{

          console.log("Network Settings - getWifiInfo - response", response);

          let httpResponse = response;
          if(response){

            if(response.fetchSuccess){

              if(response.hasOwnProperty('wifiInfo')){

                this.wifiProfiles = response.wifiInfo.Interfaces[0].ProfilesList;
                // this.GUID = response.wifiInfo.Interfaces[0].GUID;
                this.GUID = response.wifiInfo.Interfaces[0].GUID.slice(1,-1);
                this.scanWifiNetworks();

                this.changeDetectorRef.detectChanges();
                console.log("wifiprofile - ", this.wifiProfiles);
                // console.log("dataToPass - ", dataToPass);

                var dataToPass = {
                  id: this.selectedDeviceID,
                  ...httpResponse
                }

                this.isWifiProfilesLoading = false;

                // Save latest network settings (i.e WiFi profiles) to Master Records
                this.settingsService.saveWifiProfileToMasterRecords(dataToPass);

              }

            }else{

              this.notifications = `Fetch ${this.selectedDevice.deviceIP} network settings failed. Please try again`;
              this.statusNotificationsService.renderToast(this.notifications);
              this.isWifiProfilesLoading = false;
              this.isAvailableNetworkLoading = false;
              this.settingsService.saveWifiProfileToMasterRecords(dataToPass);


            }


          }

        },
        error: (error)=>{

          console.log("Network Settings - getWifiInfo - response error", error);


        },
        complete:()=>{

          console.log("Network Settings - getWifiInfo - response complete");

        }

      });

    }catch(error){

      console.log("Network Settings - check error messsage - ", error);

      if(error instanceof TypeError){

        // Render toast and reset loading flag
        this.notifications = `Failed to load Selected HoloLens network settings. Please check that HoloLens is powered up and online`
        this.statusNotificationsService.renderToast(this.notifications);
        this.isWifiProfilesLoading = false;
        this.isAvailableNetworkLoading = false;

      }

    }



  }

  // ======================================================
  // Delete Network Profile of select device in 'Existing WiFi Profiles' section
  // ======================================================
  deleteWifiProfileFromDevice = (emittedValue: any) => {

    console.log("Network Settings - deleteWifiProfileFromDevice - event", emittedValue);
    console.log("Network Settings - deleteWifiProfileFromDevice - this.selectedDeviceIP.deviceIP", this.selectedDevice.deviceIP);
    // console.log("Network Settings - deleteWifiProfileFromDevice - toString('base64')", Buffer.from(emittedValue,'base64'));
    console.log("Network Settings - deleteWifiProfileFromDevice - btoa", btoa(emittedValue));

    const dataToPass = {

      hlAddress: this.selectedDevice.deviceIP,
      GUID: this.GUID,
      // [09/10] WiFi Profile Name to be encoded to Base64
      wifiProfileName: btoa(emittedValue)

    };

    this.hololens.deleteWifiProfile(dataToPass).subscribe({

      next: (response) =>{

        if(response.deleteSuccess){

          console.log("Network Settings - deleteWifiProfile - [Success] response", response);

          let message = `WiFi profile ${emittedValue} successfully deleted. Registering network change...`;
          this.statusNotificationsService.setNotification(message);
          this.statusNotificationsService.renderToast(message);

          // Give some buffer to display toast notification before reloading app
          setTimeout(()=>{

            // location.reload();
            // Reload and rescan network to update changes on wifi profile list
            // and available network lists (i.e remove 'Profile Available' tag)
            this.loadNetworkConfig();
            this.scanWifiNetworks();
            this.changeDetectorRef.detectChanges();

          },3000);


        }else{

          console.log("Network Settings - deleteWifiProfile - [Failed] response", response);

          let message = `WiFi profile ${emittedValue} failed to be deleted. Please try again`;
          this.statusNotificationsService.setNotification(message);
          this.statusNotificationsService.renderToast(message);

        }

        // Refresh page
        // location.reload();

      },
      error: (error) =>{

        console.log("Network Settings - deleteWifiProfile - [Error] error", error);


      },
      complete: () =>{

      }


    })

  }

  // ======================================================
  // Scan available WiFi Networks of select device in 'Available Network' section
  // ======================================================
  scanWifiNetworks = () =>{

    var selectedDeviceData = this.allDevicesData.filter((device)=> device.hostIP === this.selectedDevice.deviceIP);

    const dataToPass = {

      hostIP: this.selectedDevice.deviceIP,
      GUID: this.GUID,
      username: selectedDeviceData[0]?.username,
      password: selectedDeviceData[0]?.password

    };

    this.hololens.getWifiNetworks(dataToPass).subscribe({

      next: (response) => {

        try{

          if(response.fetchSuccess){

            // Obtain available networks while excluding hidden SSIDs
            this.availableNetworks = response.AvailableNetworks.filter((network:any)=> network.SSID !== "");
            // this.availableNetworks = this.pruneDuplicateAvailableNetworks(response.AvailableNetworks);

            console.log("AVAILABLE NETWORK - -", this.availableNetworks);
            console.log("Network Settings - scanWifiNetworks() - [Success] response", response);

          }else{

            console.log("Network Settings - scanWifiNetworks() - [Failed] response", response);

          }

          this.isAvailableNetworkLoading = false;

          // // [CSSSSSSSS]
          // const dialogRef = this.dialog.open(PopUpMessageDialogComponent, {
          //   data: `WiFi connection to TEST successful. Please switch this device to the new network to re-establish connection with HoloLens`
          // });

        }catch(e){

          if(e instanceof TypeError){

            console.log("Network Settings - scanWifiNetworks()", e);

          }


        }



      },
      error: (error)=> {

        console.log("Network Settings - scanWifiNetworks() - [Error] error", error);

      },
      complete: () => {

        console.log("Network Settings - scanWifiNetworks() - [Complete]");

      }


    });

  }

  // ======================================================
  // [KIV]: To decide whether to prune wifi network or not
  // The duplicated wifi network is not a bug, rather a true response
  // from HL.
  // Hypothesis: Might be 2.4GHz and 5GHz network, tho response doesn't provide
  // such freq channel info
  // ======================================================
  pruneDuplicateAvailableNetworks(availableNetworks: any[]){

    // Pruning algo here
    // xxx

  }

  // ======================================================
  // Connect device to selected corresponding Wifi Network
  // (emitted by available networks row)
  // ======================================================
  connectWifi = (emittedValue: any) =>{

    console.log("Network Settings - connectWifi() - emitted" , emittedValue);

    this.isAvailableNetworkLoading = true;

    var dataToPass = {

      hlAddress: this.selectedDevice.deviceIP,
      op: 'connect',
      GUID: `${this.GUID}`,
      SSID: btoa(emittedValue.SSID),
      // [KIV] Can't connect to WiFi network that hasn't been saved as profiles
      key: btoa(emittedValue.key),
      createProfile: true

    }


    // Call connectWiFi API
    this.hololens.connectWifi(dataToPass).subscribe({

      next: (response)=>{
        try{

          // Show loading on Available Network section to signify WiFi connection is in progress
          this.isAvailableNetworkLoading = false;

          if(response.connectSuccess){

            console.log("Available Networks Row Component - [Success] connectWifi -", response);

            // If ECONNRESET occurs, this signifies that HL has switched network
            if(response?.reason?.code === "ECONNRESET"){

              console.log("Available Networks Row COmponent - CONNRESET, wifi successful");

              // Open success dialog
              const dialogRef = this.dialog.open(PopUpMessageDialogComponent, {
                data: {
                  messageType: 'ordered-list',
                  message: [
                    `WiFi connection to ${emittedValue.SSID} successful. To re-establish connection with HoloLens:`,
                    `Switch this device to the new network`,
                    `Configure HoloLens new IP Address in Overview Page -> Device Settings`
                  ]
                }
              });


            }

          }else{

            console.log("Available Networks Row Component - [Failure] connectWifi -")

            // Open failure dialog
            const dialogRef = this.dialog.open(PopUpMessageDialogComponent, {
              data: {
                messageType: 'non-list',
                message: [`WiFi connection to ${emittedValue.SSID} failed. Please try again and ensure passphrase is correct`]
              }
            });

          }

        }catch(e){

          console.log("Available Networks Row Component - [Exception] connectWifi -", e);

        }

      },
      error: (error)=>{

        console.log("Available Networks Row Component - [Error] connectWifi -", error);

      },
      complete: ()=>{

        console.log("Available Networks Row Component - [Complete] connectWifi -")

      }

    });

  }


}
