import { StatusNotificationsService } from 'src/app/services/status-notifications.service';
import { Component, Type, ViewChild } from '@angular/core';
import { InsertToastMessageDirective } from '../directives/insert-toast-message.directive';
import { ToastMessageComponent } from '../reusable-components/toast-message/toast-message.component';

@Component({
  selector: 'app-top-nav',
  templateUrl: './top-nav.component.html',
  styleUrls: ['./top-nav.component.scss']
})
export class TopNavComponent {

  notification: any = '';
  showToast: boolean = false;
  @ViewChild(InsertToastMessageDirective) insertToastMessage!: InsertToastMessageDirective | any;

  constructor(private statusNotificationService: StatusNotificationsService){}


  ngOnInit(){


  }

  ngAfterViewInit(){

    this.statusNotificationService.toastMessageEmitter.subscribe((emittingValues:any)=>{

      console.log("Topnav - Toast Message Received", emittingValues);

      if(emittingValues){

        this.notification = emittingValues?.notification;

      }

      this.renderToastMessage();

      // If Installation/Uninstallation occurs, reload app
      if(this.notification.includes('Install') || this.notification.includes('Uninstall')){

        // Set some timeout for toast message to be displayed
        setTimeout(()=>{

          location.reload();

        }, 8000);

      }


    });


  }

  ngOnDestroy(){


  }

  // [Toast Test]
  testFunction(){

    // Dynamic Toast Rendering Test
    this.notification = 'Device Details Updated';
    console.log("Rendering Toast From Device Details - this.insertToastMessage", this.insertToastMessage);
    this.statusNotificationService.renderToast(this.notification);

  }

  // [Toast Test]
  testClick(){

    this.showToast = !this.showToast;

  }


  renderToastMessage(){

    const containerRef = this.insertToastMessage.viewContainerRef;

    const toastMessage = new ToastMessage(ToastMessageComponent, this.notification);

    const componentRef = containerRef.createComponent(toastMessage.component);
    componentRef.instance.notification = toastMessage.data;

    console.log("Topnav - Rendered Toast");

  }


}

class ToastMessage{

  constructor(
    public component: Type<any>,
    public data: any
  ){}

};
