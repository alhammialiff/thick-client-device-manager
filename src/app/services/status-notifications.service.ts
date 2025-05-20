import { NotificationLog } from './../models/notification-log';
import { EventEmitter, Injectable, Type, ViewContainerRef } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Device } from '../models/device.model';
import { InsertToastMessageDirective } from '../directives/insert-toast-message.directive';
import { ToastMessageComponent } from '../reusable-components/toast-message/toast-message.component';

@Injectable({
  providedIn: 'root'
})
export class StatusNotificationsService {

  MASTER_NOTIFICATION_LOGS: NotificationLog[] = [];
  registrationLogs: Object[] = [];
  registrationSuccess: boolean = false;
  refreshSuccess: boolean = false;
  notification: string = '';

  toastMessageEmitter: any = new EventEmitter();

  constructor() { }

  setNotification(message: string): void{

    this.notification = message;

  }

  getNotification(): string{

    return this.notification;

  }

  getMasterTaskLog(): Observable<any>{

    return of(this.MASTER_NOTIFICATION_LOGS);

  }

  logTask(deviceData: Device, taskName: string , status?: boolean): void{

    console.log("Status Notification Service - Log Task -", deviceData);
    // Insert datetime
    const datetime = new Date();

    var currentLog: NotificationLog = {
      loggedTime: datetime.toLocaleString(),
      ...deviceData,
      task: taskName,
      success: status
    }

    this.MASTER_NOTIFICATION_LOGS.push(currentLog);

    // If logs hit 200 entries, save log to Local Storage and reset Logs (to avoid performance degradation)
    if(this.MASTER_NOTIFICATION_LOGS.length > 200) {

    console.log(`Status Notification Service - logActivity - Hit 200 Limit - Storing in Local Storage - `);

      const logToSave = this.MASTER_NOTIFICATION_LOGS.slice(0,200);

      this.saveLogToLocalStorage(logToSave);

      this.MASTER_NOTIFICATION_LOGS = [];

    }


    console.log(`Status Notification Service - logActivity - [${taskName}] added - ` , this.MASTER_NOTIFICATION_LOGS);

  }

  saveLogToLocalStorage = (logToSave: NotificationLog[]) => {

    const datetime = new Date();
    const day = datetime.getUTCDay();
    const month = datetime.getUTCMonth();
    const year = datetime.getUTCFullYear();

    const hour = datetime.getUTCHours();
    const minutes = datetime.getUTCMinutes;
    const seconds = datetime.getUTCHours;

    localStorage.setItem(`ACTIVITY_LOG_${day}${month}${year}_${hour}${minutes}${seconds}hr`, JSON.stringify(logToSave));

  }

  renderToast(notification: any){

    // console.log("Status Notif. Service - Rendering Toast Message", containerRef);
    console.log("Status Notif. Service - toast notification", notification);

    const dataToPass = {

      // containerRef: containerRef,
      notification: notification

    }

    this.toastMessageEmitter.emit(dataToPass);

    // const toastMessage = new ToastMessage(ToastMessageComponent, notification);

    // const componentRef = containerRef.createComponent(toastMessage.component);
    // componentRef.instance.notification = toastMessage.data;

  }

}

class ToastMessage{

  constructor(
    public component: Type<any>,
    public data: any
  ){}

};
