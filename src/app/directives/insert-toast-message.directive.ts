import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[insertToastMessage]'
})
export class InsertToastMessageDirective {

  constructor(public viewContainerRef: ViewContainerRef) { }

}
