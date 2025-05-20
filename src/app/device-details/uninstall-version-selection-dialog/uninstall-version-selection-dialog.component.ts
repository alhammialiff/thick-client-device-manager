import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-uninstall-version-selection-dialog',
  templateUrl: './uninstall-version-selection-dialog.component.html',
  styleUrls: ['./uninstall-version-selection-dialog.component.scss']
})
export class UninstallVersionSelectionDialogComponent {

  selectedVersion: any = '';
  appVersionUninstallationForm: FormGroup = new FormGroup({
    appVersion: new FormControl(`Build: ${this.data[0].Version.Build} | Major: ${this.data[0].Version.Major} | Minor: ${this.data[0].Version.Minor}`)
  });

  constructor(public dialogRef: MatDialogRef<UninstallVersionSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any){}


  ngOnInit(){

    console.log("Uninstall Version Dialog Component - data - ", this.data);

    this.appVersionUninstallationForm.controls["appVersion"].setValue(`Build: ${this.data[0].Version.Build} | Major: ${this.data[0].Version.Major} | Minor: ${this.data[0].Version.Minor}`);


  }

  ngAfterViewInit(){

    this.appVersionUninstallationForm.valueChanges.subscribe((value)=> {

      console.log("Uninstall Version Dialog Component - form value - ", value)

      this.selectedVersion = value;

    });

  }

  onUninstall = () => {

    // Split form control values by '|', ':' and whitespace
    var parsedData = this.selectedVersion["appVersion"].split(/: | \| /);
    var constructedObject: any = {}

    parsedData.forEach((string:any, index:any)=>{

      if(index%2 == 0){

        constructedObject = {
          ...constructedObject,
          [string]: ""
        }

      }

    });

    // Populate constructed object with respective values
    constructedObject["Build"] = parsedData[1];
    constructedObject["Major"] = parsedData[3];
    constructedObject["Minor"] = parsedData[5];

    console.log("Uninstall Version Dialog Component - constructedObject ", constructedObject);

    this.dialogRef.close({
      data: constructedObject,
      proceedUninstallation: true
    });

  }

  onCancel = () =>{

    this.dialogRef.close({
      data: [],
      proceedUninstallation: false
    });

  }

}
