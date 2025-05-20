import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHandler } from "@angular/common/http";
// import { OverviewPageComponent } from "./overview-page.component";
import { DevicePanelComponent } from "./device-panel.component";
import { HololensAPIService } from "src/app/services/hololens-api.service";
import { MatDialog, MatDialogModule } from "@angular/material/dialog";
import { MatIcon, MatIconModule } from "@angular/material/icon";

describe('DevicePanelComponent', ()=>{

  let resetDeviceData = {
      deviceName: '',
      hostIP: '',
      hostComputerName: '',
      battLife: 0,
      id: '',
      lowPowerState: false,
      updateFlash: true,
      deviceUpdateInterval: 0
    };

  let filledDeviceData = {
    deviceName: 'CypressLens',
    hostIP: '1.2.3.4',
    hostComputerName: 'CypressTest',
    battLife: 100,
    id: 'cypress-id',
    lowPowerState: false,
    updateFlash: true,
    deviceUpdateInterval: 10
  };

  let dummyDeviceName = '';

  // beforeEach(()=>{

  //   cy.fixture('/assets/images/hololens-2-side-view-shadow.png')

  // })

  // Mounting Test
  it('can mount',()=>{

    cy.mount(DevicePanelComponent,{
      componentProperties:{
        deviceData: filledDeviceData
      },
      providers:[
        HololensAPIService,
        HttpClient,
        HttpHandler,
        MatDialog,
        MatIcon
      ],
      imports:[
        MatDialogModule,
        MatIconModule
      ]
    });

    cy.clock(10000);

  });

});



