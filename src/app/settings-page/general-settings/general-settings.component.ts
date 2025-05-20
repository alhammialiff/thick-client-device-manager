import { StatusNotificationsService } from './../../services/status-notifications.service';
import { GeneralSettings } from './../../models/general-settings.model';
import { SettingsService } from 'src/app/services/settings.service';
import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss']
})
export class GeneralSettingsComponent {

  generalSettingsForm: FormGroup = new FormGroup({

    deviceUpdateInterval: new FormControl(10),
    enableUpdateFlash: new FormControl('Enable'),
    deviceView: new FormControl('Panel')

  });

  deviceUpdateInterval: any = [
    10,
    20,
    30,
    40,
    50,
    60,
  ];

  enableUpdateFlash: any = [
    'Enable',
    'Disable',
  ];

  deviceView: any = [
    'Panel',
    'List',
  ];

  generalSettings: GeneralSettings = {
    deviceUpdateInterval: 10,
    enableUpdateFlash: true,
    deviceView: 'Panel'
  }

  notifications: string = '';

  constructor(private settingsService:SettingsService,
      private statusNotificationsService: StatusNotificationsService){}

  ngOnInit(){

    // Retrieve from cache (local storage)
    let cachedGeneralSettings = this.settingsService.retrieveSettingsConfigFromLocalStorage()?.generalSettings;

    // Store into component var if cached general settings exist
    this.generalSettings = cachedGeneralSettings? cachedGeneralSettings: this.generalSettings;

    // Set form control values with cache/new configs
    this.generalSettingsForm.controls["deviceUpdateInterval"].setValue(this.generalSettings.deviceUpdateInterval);
    this.generalSettingsForm.controls["enableUpdateFlash"].setValue(this.generalSettings.enableUpdateFlash?'Enable':'Disable');
    this.generalSettingsForm.controls["deviceView"].setValue(this.generalSettings.deviceView);


    console.log("General Settings - generalSettings from cache: ", this.generalSettings);

    // Listen to form value change
    this.generalSettingsForm.valueChanges.subscribe((value)=>{

      console.log("General Settings - value changes - value", value);

      this.generalSettings.deviceUpdateInterval = value?.deviceUpdateInterval;

      // Parse 'Enable'/'Disable' into boolean values
      this.generalSettings.enableUpdateFlash = value?.enableUpdateFlash === "Enable"? true: false;

      this.generalSettings.deviceView = value?.deviceView;

      console.log("General Settings - value changes - generalSettings", this.generalSettings);

    });


  }

  ngAfterViewInit(){



  }

  saveGeneralSettings = ()=>{

    this.settingsService.saveGeneralSettingsToMasterRecords(this.generalSettings);

    this.notifications = 'General Settings updated. Reloading app...'
    this.statusNotificationsService.renderToast(this.notifications);

    setTimeout(() => {

      location.reload();

    }, 5000);

  }

}
