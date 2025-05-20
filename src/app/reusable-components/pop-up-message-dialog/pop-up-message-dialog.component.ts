import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-pop-up-message-dialog',
  templateUrl: './pop-up-message-dialog.component.html',
  styleUrls: ['./pop-up-message-dialog.component.scss']
})
export class PopUpMessageDialogComponent {

  constructor(public dialogRef: MatDialogRef<PopUpMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any){}


  ngOnInit(){

    console.log("Pop Up Message Dialog - data - ", this.data);

  }

  closeDialog = () => {

    this.dialogRef.close();

  }

}
