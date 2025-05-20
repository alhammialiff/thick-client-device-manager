import { Component, Input } from '@angular/core';
import { StatusNotificationsService } from 'src/app/services/status-notifications.service';
import { DevicesService } from 'src/app/services/devices.service';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-pop-up-device-registration-dialog',
  templateUrl: './pop-up-device-registration-dialog.component.html',
  styleUrls: ['./pop-up-device-registration-dialog.component.scss']
})
export class PopUpDeviceRegistrationDialogComponent {

  hlRegistrationForm!: FormGroup;

  deviceData: any;
  ipFirstOctet: any;
  ipSecondOctet: any;
  ipThirdOctet: any;
  ipFourthOctet: any;
  notification: any = '';

  deviceRegistrationForm: FormGroup = new FormGroup({

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
    username: new FormControl('ioxpCustomer_4g01_1', [
      Validators.required
    ]),
    password: new FormControl('stk@AR-4650',[
      Validators.required
    ])

  });

  // Restitching IP Octets because we are using separate input tags (for aesthetics)
  deviceRegistrationFormControls: any | null = this.deviceRegistrationForm.controls;
  updatedDeviceIP: any;
  finalFormResult: any;

  constructor(private devicesService: DevicesService,
    private dialogRef: MatDialogRef<PopUpDeviceRegistrationDialogComponent>,
    private statusNotificationsService: StatusNotificationsService){}

  ngOnInit(){

    // console.log("Device Config - device data - ", this.deviceData);

    // console.log("Device Config - device IP - ", this.deviceData.hostIP.split('.'));

    // Split IP into individual octets
    // var splitIPOctets = this.deviceData.hostIP.split('.');

    // Assign each octet to respective global var (to be used in template as placeholder)
    // this.ipFirstOctet  = splitIPOctets[0];
    // this.ipSecondOctet = splitIPOctets[1];
    // this.ipThirdOctet  = splitIPOctets[2];
    // this.ipFourthOctet = splitIPOctets[3];

    // this.deviceRegistrationForm.controls['deviceIP_o1'].setValue(this.ipFirstOctet);
    // this.deviceRegistrationForm.controls['deviceIP_o2'].setValue(this.ipSecondOctet);
    // this.deviceRegistrationForm.controls['deviceIP_o3'].setValue(this.ipThirdOctet);
    // this.deviceRegistrationForm.controls['deviceIP_o4'].setValue(this.ipFourthOctet);


    // this.devicesService.deviceDeregistrationEmitter.subscribe((emittedValues: any)=>{

    //   console.log("Device Configs - emittedValues", emittedValues);

    // });

  }

  ngAfterViewInit(){

    this.deviceRegistrationForm.valueChanges
      .pipe(

        // Take original value change from reactive form and concat. IP Address
        map((value: any)=>{

          this.deviceRegistrationFormControls['hostIP'].value = `${this.deviceRegistrationFormControls['deviceIP_o1'].value}.${this.deviceRegistrationFormControls['deviceIP_o2'].value}.${this.deviceRegistrationFormControls['deviceIP_o3'].value}.${this.deviceRegistrationFormControls['deviceIP_o4'].value}`;
          // console.log("Device Config - in map - value", value);
          // console.log("Device Config - in map - his.deviceConfigFormControls", this.deviceConfigFormControls);
          return this.deviceRegistrationFormControls;

        }),

        // Rework form result with concatenated IP Address
        map(()=>{

          return this.reworkFormResult();

        })
      )
      .subscribe((formResult)=>{

        console.log("Device Config - subscribe", formResult);
        this.finalFormResult = formResult;

      });

  }

  // This is necessary because valueChange does not fire on IP Address's last octet number
  // A workaround is to stitch the Octets and concatenate form input result manually
  reworkFormResult(){

    var reworkedFormValue: any = {};

    for(const [key,value] of Object.entries(this.deviceRegistrationFormControls)){

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

  onSubmitRegistration(){

    this.dialogRef.close({

      deviceToRegister: this.finalFormResult

    });

  }

  closeConfigPage(){

    // Restart Poll Hololens (because websocket was terminated when this page is spawned)
    // this.devicesService.listenToDeviceDataChange();

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

    return this.deviceRegistrationForm.get('deviceIP_o1')!;

  }

  get deviceIP_o2(){

    return this.deviceRegistrationForm.get('deviceIP_o2')!;

  }

  get deviceIP_o3(){

    return this.deviceRegistrationForm.get('deviceIP_o3')!;

  }

  get deviceIP_o4(){

    return this.deviceRegistrationForm.get('deviceIP_o4')!;

  }

  get username(){

    return this.deviceRegistrationForm.get('username');

  }

  get password(){

    return this.deviceRegistrationForm.get('password');

  }

}
