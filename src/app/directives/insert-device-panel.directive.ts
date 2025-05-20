import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[insertDevicePanel]'
})
export class InsertDevicePanelDirective {

  constructor( public viewContainerRef: ViewContainerRef) { }

}
