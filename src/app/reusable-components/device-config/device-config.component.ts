import { HololensAPIService } from 'src/app/services/hololens-api.service';
import { WebSocketService } from './../../services/web-socket.service';
import { StatusNotificationsService } from 'src/app/services/status-notifications.service';
import { DevicesService } from 'src/app/services/devices.service';
import { Component, Inject, Input } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-device-config',
  templateUrl: './device-config.component.html',
  styleUrls: ['./device-config.component.scss']
})
export class DeviceConfigComponent {

  deviceData: any;
  ipFirstOctet: any;
  ipSecondOctet: any;
  ipThirdOctet: any;
  ipFourthOctet: any;
  notification: any = '';

  deviceConfigForm: FormGroup = new FormGroup({

    deviceName: new FormControl(''),
    deviceIP_o1: new FormControl('', [
      Validators.required,
      Validators.pattern("^[0-9]*$")
    ]),
    deviceIP_o2: new FormControl('',[
      Validators.required,
      Validators.pattern("^[0-9]*$")
    ]),
    deviceIP_o3: new FormControl('',[
      Validators.required,
      Validators.pattern("^[0-9]*$")
    ]),
    deviceIP_o4: new FormControl('',[
      Validators.required,
      Validators.pattern("^[0-9]*$")
    ]),
    hostIP: new FormControl(''),
    refreshRate: new FormControl(''),
    username: new FormControl(''),
    password: new FormControl('')

  });

  // wdpCredentialsForm: FormGroup = new FormGroup({
  //   username: new FormControl(''),
  //   password: new FormControl('')
  // });

  // Restitching IP Octets because we are using separate input tags (for aesthetics)
  deviceConfigFormControls: any = this.deviceConfigForm.controls;
  // wdpCredentialsFormControls: any = this.wdpCredentialsForm.controls;
  updatedDeviceIP: any;
  deviceConfigFinalFormResult: any;
  wdpCredentialsFinalFormResult: any;

  constructor(private devicesService: DevicesService,
    private hololensAPIService: HololensAPIService,
    private dialogRef: MatDialogRef<DeviceConfigComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private statusNotificationsService: StatusNotificationsService,
    private webSocketService: WebSocketService){}

  ngOnInit(){

    // Disconnect first so that REGISTERED_DEVICE stops updating to make way for user-input config update
    // this.webSocketService.disconnectSocket();

    this.hololensAPIService.stopDataPolling('device-config-page').subscribe({
      next: (response)=>{

        console.log("[Device Config Page] STOP DATA POLLING - response", response);


      },
      error: (error)=>{

        console.log("[Device Config Page] STOP DATA POLLING - request error");

      },
      complete: ()=>{

        console.log("[Device Config Page] STOP DATA POLLING - request complete");

      },


    });

    console.log("Device Config - device data - ", this.deviceData);

    console.log("Device Config - device IP - ", this.deviceData.hostIP.split('.'));

    // Split IP into individual octets
    var splitIPOctets = this.deviceData.hostIP.split('.');

    // Assign each octet to respective global var (to be used in template as placeholder)
    this.ipFirstOctet  = splitIPOctets[0];
    this.ipSecondOctet = splitIPOctets[1];
    this.ipThirdOctet  = splitIPOctets[2];
    this.ipFourthOctet = splitIPOctets[3];

    this.deviceConfigForm.controls['deviceIP_o1'].setValue(this.ipFirstOctet);
    this.deviceConfigForm.controls['deviceIP_o2'].setValue(this.ipSecondOctet);
    this.deviceConfigForm.controls['deviceIP_o3'].setValue(this.ipThirdOctet);
    this.deviceConfigForm.controls['deviceIP_o4'].setValue(this.ipFourthOctet);


    this.devicesService.deviceDeregistrationEmitter.subscribe((emittedValues: any)=>{

      console.log("Device Configs - emittedValues", emittedValues);

    });

  }

  ngAfterViewInit(){

    // Listen to Device Configurations Form value change
    this.deviceConfigForm.valueChanges
      .pipe(

        // Take original value change from reactive form and concat. IP Address
        map((value: any)=>{

          this.deviceConfigFormControls['hostIP'].value = `${this.deviceConfigFormControls['deviceIP_o1'].value}.${this.deviceConfigFormControls['deviceIP_o2'].value}.${this.deviceConfigFormControls['deviceIP_o3'].value}.${this.deviceConfigFormControls['deviceIP_o4'].value}`;
          // console.log("Device Config - in map - value", value);
          // console.log("Device Config - in map - his.deviceConfigFormControls", this.deviceConfigFormControls);
          return this.deviceConfigFormControls;

        }),

        // Rework form result with concatenated IP Address
        map(()=>{

          return this.reworkFormResult();

        })
      )
      .subscribe((formResult)=>{

        console.log("Device Config - deviceConfigFinalFormResult - subscribe", formResult);
        this.deviceConfigFinalFormResult = formResult;

      });

    // Listen to WDP Credentials Form value change
    // this.wdpCredentialsForm.valueChanges
    //   .subscribe((formResult)=>{

    //     console.log("Device Config - wdpCredentialsFinalFormResult - subscribe", formResult);
    //     this.wdpCredentialsFinalFormResult = formResult;

    //   });

  }

  ngOnDestroy(){

    // Restart Websocket Listening (because websocket was terminated when this page is spawned)
    // this.devicesService.listenToDeviceDataChange();

    // Restart Poll Hololens (because websocket was terminated when this page is spawned)
    this.hololensAPIService.startDataPolling().subscribe({
      next: (response)=>{

        console.log("[Device Config Page] STOP DATA POLLING - response", response);


      },
      error: (error)=>{

        console.log("[Device Config Page] STOP DATA POLLING - request error");

      },
      complete: ()=>{

        console.log("[Device Config Page] STOP DATA POLLING - request complete");

      },

    });

  }

  // This is necessary because valueChange does not fire on IP Address's last octet number
  // A workaround is to stitch the Octets and concatenate form input result manually
  reworkFormResult(){

    var reworkedFormValue: any = {};

    for(const [key,value] of Object.entries(this.deviceConfigFormControls)){

      if(value instanceof FormControl){

        // Iteratively restitch form control values into a single object
        reworkedFormValue = {

          ...reworkedFormValue,
          [key]: value["value"]

        };

      }

    };

    console.log("Device Config - reworkedFormValue - ", reworkedFormValue);

    return reworkedFormValue

  }

  saveUpdatedConfig(){

    // Send STOP Signal to backend to exit from refresh device data loop
    // Pass ID and changes made to Device Service
    this.devicesService.updateDeviceMetaData(this.deviceData.id, this.deviceConfigFinalFormResult);
    this.notification = `${this.deviceData.deviceName} successfully updated`;
    this.statusNotificationsService.renderToast(this.notification);

    setTimeout(()=>{

      // Close page
      this.closeConfigPage();

      // Reload new configs into app
      // location.reload();

    }, 3000);



  }

  closeConfigPage(){

    // Call Modal Service and close
    this.dialogRef.close();

  }

  deleteDevice(){

    console.log("Device Config - Delete Device is triggered");

    // Pass this device's ID to corresponding service method
    this.devicesService.deleteDeviceProfile(this.deviceData.id);

    this.notification = `Deleting ${this.deviceData.deviceName} profile`;
    this.statusNotificationsService.renderToast(this.notification);

  }

  selectAllExistingText = (event: any) => {

    return event.target?.select();

  }

  get deviceIP_o1(){

    return this.deviceConfigForm.get('deviceIP_o1')!;

  }

  get deviceIP_o2(){

    return this.deviceConfigForm.get('deviceIP_o2')!;

  }

  get deviceIP_o3(){

    return this.deviceConfigForm.get('deviceIP_o3')!;

  }

  get deviceIP_o4(){

    return this.deviceConfigForm.get('deviceIP_o4')!;

  }

}
