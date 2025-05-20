import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-wifi-profile-row',
  templateUrl: './wifi-profile-row.component.html',
  styleUrls: ['./wifi-profile-row.component.scss']
})
export class WifiProfileRowComponent {

  @Input() wifiProfile: any;
  @Output() deleteWifiProfileEvent = new EventEmitter();

  showCloseButton: boolean = false;

  ngOnInit(){

    console.log("Wifi Profile Row - wifiProfile", this.wifiProfile);

  }

  showRemoveButton(){

    // event?.preventDefault();
    this.showCloseButton = true;

  }

  hideRemoveButton(){

    this.showCloseButton = false;
    // event?.preventDefault();

  }

  deleteWiFiProfile = () => {

    this.deleteWifiProfileEvent.emit(
      this.wifiProfile.Name
    );

  }

}

