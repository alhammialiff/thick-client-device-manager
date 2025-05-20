import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[insertDeviceRow]'
})
export class InsertDeviceRowDirective {

  constructor(public viewContainerRef: ViewContainerRef) { }

}
