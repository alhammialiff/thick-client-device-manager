import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DevicePanelOverlayMouseTrackerService {

  constructor() { }

  mouseLocation: {
    isInsidePanel: boolean,
    isInsideOverlay: boolean,
    id: string
  } = {

    isInsidePanel: false,
    isInsideOverlay: false,
    id: ''

  }

  // 1. Prep two things to emit: insidePanel, insideOverlay
  // insidePanelEmitter: EventEmitter<any> = new EventEmitter();
  // insideOverlayEmitter: EventEmitter<any> = new EventEmitter();
  mouseLocationEmitter: EventEmitter<any> = new EventEmitter();


  // 2. Emit these two data to both Device Panel & Device Panel Overlay components
  raiseMouseLocationEvent(){

    console.log("MOUSE POSITION IN SERVICE", this.mouseLocation);

    this.mouseLocationEmitter.emit(this.mouseLocation);

  }

  // =========================================================
  // 'Inside Panel' setter
  // =========================================================
  setInsidePanelFlagToTrue(id: string){

    const updatedLocation = {

      id: id,
      isInsidePanel: true,
      isInsideOverlay: this.mouseLocation.isInsideOverlay,

    }

    this.mouseLocation = updatedLocation;

    // this.raiseMouseLocationEvent();
    this.mouseLocationEmitter.emit(this.mouseLocation);

  }

  setInsidePanelFlagToFalse(id: string){


    const updatedLocation = {
      id: id,
      isInsidePanel: false,
      isInsideOverlay: this.mouseLocation.isInsideOverlay,

    }

    this.mouseLocation = updatedLocation;


    // this.raiseMouseLocationEvent();
    this.mouseLocationEmitter.emit(this.mouseLocation);

  }

  // =========================================================
  // 'Inside Overlay' setter
  // =========================================================
  setInsideOverlayFlagToTrue(id: string){

    const updatedLocation = {

      id: id,
      isInsidePanel: true,
      isInsideOverlay: true,

    }

    this.mouseLocation = updatedLocation;

    // this.raiseMouseLocationEvent();
    this.mouseLocationEmitter.emit(this.mouseLocation);

  }

  setInsideOverlayFlagToFalse(id: string){

    const updatedLocation = {

      id: id,
      isInsidePanel: this.mouseLocation.isInsidePanel,
      isInsideOverlay: false,

    }

    this.mouseLocation = updatedLocation;

    console.log("MOUSE POSITION IN SERVICE setInsideOverlayFlagToFalse", this.mouseLocation);

    // this.raiseMouseLocationEvent();
    this.mouseLocationEmitter.emit(this.mouseLocation);

  }



}
