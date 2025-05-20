import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-toast-message',
  templateUrl: './toast-message.component.html',
  styleUrls: ['./toast-message.component.scss']
})
export class ToastMessageComponent {

  @Input() notification!: any | null;
  showToast: boolean = false;

  constructor(){}

  ngOnInit(){

    console.log("[Toast] Message - ", this.notification);

    if(this.notification){

      this.displayToast();

    }

  }

  ngAfterViewInit(){



  }

  ngOnDestroy(){

    console.log("[Toast] Destroyed");

  }

  displayToast(){

    this.showToast = true;

    setTimeout(()=>{

      this.notification = null;
      this.showToast = false;
      // this.ngOnDestroy();

    },4000);

  }

}
