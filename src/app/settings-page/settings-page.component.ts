import { UninstallVersionSelectionDialogComponent } from './../device-details/uninstall-version-selection-dialog/uninstall-version-selection-dialog.component';
import { WebSocketService } from './../services/web-socket.service';
import { Component } from '@angular/core';

@Component({
  selector: 'app-settings-page',
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent {

  constructor(private webSocketService: WebSocketService){}

  ngOnInit(){

    this.webSocketService.disconnectSocket();

  }

  ngAfterViewInit(){

  }

  ngOnDestroy(){

    console.log("Settings Page - ngOnDestroy - reload page");

    // Upon component destroy, reload page (for reloading of data on change route)
    window.location.reload();

  }



}
