import { Directive, ViewContainerRef } from '@angular/core';

@Directive({
  selector: '[insertPlayHololensAppRow]'
})
export class InsertPlayHololensAppRowDirective {

  constructor( public viewContainerRef: ViewContainerRef) { }

}
