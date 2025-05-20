import { Dialog } from '@angular/cdk/dialog';
import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-passphrase-dialog',
  templateUrl: './passphrase-dialog.component.html',
  styleUrls: ['./passphrase-dialog.component.scss']
})
export class PassphraseDialogComponent {

  passPhraseForm: FormGroup = new FormGroup({
    passPhrase: new FormControl('')
  });

  capturedKey: string = '';

  constructor(
    public dialogRef: MatDialogRef<PassphraseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any){}

  ngOnInit(){

    console.log("Passphrase Dialog - data - ", this.data);

    // Subscribe to user input on form
    this.passPhraseForm.valueChanges.subscribe((value)=>{

      this.capturedKey = value;

    });

  }

  ngAfterViewInit(){}

  // Close this dialog (on user click 'cancel')
  closeDialog = () => {

    this.dialogRef.close();

  }

}
