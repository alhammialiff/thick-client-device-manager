import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HololensAPIService } from 'src/app/services/hololens-api.service';
import { PassphraseDialogComponent } from '../passphrase-dialog/passphrase-dialog.component';

@Component({
  selector: 'app-available-networks-row',
  templateUrl: './available-networks-row.component.html',
  styleUrls: ['./available-networks-row.component.scss']
})
export class AvailableNetworksRowComponent {

  @Input() wifiNetwork: any;
  @Output() wifiNetworkEvent = new EventEmitter();

  showCloseButton: boolean = false;

  constructor(private hololens: HololensAPIService,
    public dialog: MatDialog){}

  ngOnInit(){

    console.log("Available Networks Row Component - wifiNetwork", this.wifiNetwork);

  }

  ngAfterViewInit(){


  }

  connectWifi = (passPhrase: any)=> {

    console.log("Available Networks Row - connectWifi() - ");

    this.wifiNetworkEvent.emit({
      ...this.wifiNetwork,
      key: passPhrase
    });

  }

  disconnectWifi(){

    console.log("Available Networks Row - disconnectWifi() - ");

  }

  showRemoveButton(){

    // event?.preventDefault();
    this.showCloseButton = true;

  }

  hideRemoveButton(){

    this.showCloseButton = false;
    // event?.preventDefault();

  }

  openPassPhraseDialog = () => {

    const dialogRef = this.dialog.open(PassphraseDialogComponent, {
      data: this.wifiNetwork.SSID
    });

    dialogRef.afterClosed().subscribe(result=>{

      console.log("Available Networks Row - openPassPhraseDialog - close - result - ", result);

      if(result?.passPhrase.length){

        // Invoke method to emit user-input auth data back to Network Settings
        this.connectWifi(result.passPhrase);

      }

    });

  }


}
