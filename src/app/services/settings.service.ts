import { DevicesService } from 'src/app/services/devices.service';
import { GeneralSettings } from './../models/general-settings.model';
import { Injectable } from '@angular/core';
import { Settings } from '../models/settings.model';
import { NetworkSettings } from '../models/network-settings.model';
import { SessionConfig } from '../models/session-config';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {

  SETTINGS_CONFIG: Settings = {

    generalSettings: null,
    networkSettings: null,
    storageSettings: null

  };
  NETWORK_SETTINGS: NetworkSettings = {

    wifiProfiles: []

  };
  GENERAL_SETTINGS: GeneralSettings | null = {

    deviceUpdateInterval: null,
    enableUpdateFlash: null,
    deviceView: null

  }
  MASTER_WIFI_PROFILES: any[] = [];

  // For manual backup and loading of Session Data
  SESSION_CONFIG: SessionConfig = {

    REGISTERED_DEVICES: {
      savedData: null
    },
    SETTINGS_CONFIG: null,
    CACHED_INSTALLED_APPS: null

  }



  constructor(private devicesService: DevicesService) {}

  saveSettingsConfigToLocalStorage = () => {

    console.log("Settings Service - saveWifiProfileToMasterRecords - MASTER", this.MASTER_WIFI_PROFILES);
    console.log("Settings Service - Saved Settings Data to Local Storage - SETTINGS_CONFIG - ", this.SETTINGS_CONFIG);

    localStorage.setItem('SETTINGS_CONFIG', JSON.stringify(this.SETTINGS_CONFIG));

  }

  // =================================================================
  // - This method serves to retrieve App Settings Config from cache.
  // See saveRegisteredDevicesIntoLocalStorage(...)
  // =================================================================
  retrieveSettingsConfigFromLocalStorage() {

    if (localStorage.length >= 1) {

      var retrievedData: Settings | any = localStorage.getItem('SETTINGS_CONFIG');

      this.SETTINGS_CONFIG = JSON.parse(retrievedData);

      // this.REGISTERED_DEVICES = test as Device[];

      console.log(
        'Settings Service - retrieve...FromStorage - test',
        JSON.parse(retrievedData)
      );

    }else{

      console.log(
        'Settings Service - retrieve...FromStorage - Nothing in Local Storage!'
      );


    }

    console.log(
      'Settings Service - retrieve - this.SETTINGS_CONFIG Settings before check for duplicate ',
      this.SETTINGS_CONFIG
    );

    // [KIV invocation for this Service] Set Device Registry to be unique (if there are duplicate entries)
    // this.checkForDuplicateEntries();

    // console.log(
    //   'Settings Service - retrieve - this.SETTINGS_CONFIG Settings after check for duplicate ',
    //   this.SETTINGS_CONFIG
    // );

    return this.SETTINGS_CONFIG;

  }

  saveWifiProfileToMasterRecords = (deviceWiFiProfile: any) => {

    var filteredIndex = 0;

    if(this.MASTER_WIFI_PROFILES.length < 1){

      this.MASTER_WIFI_PROFILES.push(deviceWiFiProfile);

    }else{

      var filteredWiFiProfile = this.MASTER_WIFI_PROFILES.filter((existingWifiProfile, index)=>{

        filteredIndex = index;

        console.log("Settings Service - saveWifiProfileToMasterRecords - filteredIndex", filteredIndex);

        return existingWifiProfile.id === deviceWiFiProfile.id;

      })[0];

      // Replace old entry with updated one
      this.MASTER_WIFI_PROFILES[filteredIndex] = deviceWiFiProfile;

    }

    this.deleteSettingsConfigToLocalStorage();
    this.updateWifiProfileInNetworkSettings();
    this.updateNetworkSettingsInSettingsConfig();
    this.saveSettingsConfigToLocalStorage();

    console.log("Settings Service - saveWifiProfileToMasterRecords - MASTER", this.MASTER_WIFI_PROFILES);

    // localStorage.setItem('SETTINGS_CONFIG', JSON.stringify(this.SETTINGS_CONFIG));

  }

  updateWifiProfileInNetworkSettings = ()=> {

    // Update Wifi Profiles in Network Settings
    this.NETWORK_SETTINGS.wifiProfiles = this.MASTER_WIFI_PROFILES;

    console.log("Settings Service - updateWifiProfileInNetworkSettings - MASTER", this.MASTER_WIFI_PROFILES);

  }

  updateNetworkSettingsInSettingsConfig = ()=> {

    this.SETTINGS_CONFIG.networkSettings = this.NETWORK_SETTINGS;

    console.log("Settings Service - updateNetworkSettingsInSettingsConfig - MASTER", this.MASTER_WIFI_PROFILES);

  }

  deleteSettingsConfigToLocalStorage = ()=> {

    localStorage.removeItem('SETTINGS_CONFIG');

    console.log("Settings Service - deleteSettingsConfigToLocalStorage - MASTER", this.MASTER_WIFI_PROFILES);

  }

  saveGeneralSettingsToMasterRecords= (generalSettings: GeneralSettings | null)=>{


    console.log("Settings Service - saveGeneralSettingsToMasterRecords - generalSettings", generalSettings);

    this.GENERAL_SETTINGS = generalSettings;

    this.SETTINGS_CONFIG.generalSettings = this.GENERAL_SETTINGS;

    console.log("Settings Service - saveGeneralSettingsToMasterRecords - GENERAL_SETTINGS", this.GENERAL_SETTINGS);
    console.log("Settings Service - saveGeneralSettingsToMasterRecords - SETTINGS_CONFIG", this.SETTINGS_CONFIG);

    this.saveSettingsConfigToLocalStorage();

  }

  getSettingsConfig = (): Settings => {

    return this.SETTINGS_CONFIG;

  }

  consolidateSessionConfig = (): SessionConfig => {


    // console.log("[consolidateSessionConfig] - ", this.devicesService.retrieveRegisteredDeviceFromStorage());

    var registeredDevicesToSave = this.devicesService.getRegisteredDevices();

    this.SESSION_CONFIG = {

      // Get REGISTERED DEVICE
      REGISTERED_DEVICES: {
        // savedData: this.devicesService.retrieveRegisteredDeviceFromStorage(),
        savedData: registeredDevicesToSave
      },
      // Get SETTINGS_CONFIG
      SETTINGS_CONFIG: this.retrieveSettingsConfigFromLocalStorage(),

      // GET CACHED_INSTALLED_APPS
      CACHED_INSTALLED_APPS: []

    }

    return this.SESSION_CONFIG;

  }

  // =============================================================================
  // WIP - This function serves to allow user to download and save to target folder
  // =============================================================================
  backupSessionConfigToFile = async (): Promise<any> => {

    // Instantiate date object
    var date = new Date();

    // Prepare datetime segment
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();
    var time = date.toLocaleTimeString('it-IT').split(':').reduce((string,acc)=> acc +=string);

    // Prepare Session Config metadata for blob conversion
    var fileName = `MDM-APP-SESSION-DATA_${day + month + year}_${time}.json`;
    var mimeType = 'application/json';

    // Serialise Session Config object into JSON
    var SessionDataJSON = JSON.stringify(await this.consolidateSessionConfig(), null, 4)

    // Convert JSON Session Data into Blob
    var blob = new Blob([SessionDataJSON], {type: mimeType});

    // Convert Blob into BlobURL to be fed into anchor element
    const fileUrl = window.URL.createObjectURL(blob);

    // [To study codes]
    // const downloadFile = await new File([jsonData], fileName, { type: mimeType });
    // await console.log("[Settings Service] downloadFile - ", blob);
    // window.open(url,'_blank');


    // Return File URL (Blob Url) and Session File Name
    return {

      fileUrl: fileUrl,
      fileName: fileName

    }

  }

}
