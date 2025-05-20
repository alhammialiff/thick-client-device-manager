import { Device } from 'src/app/models/device.model';

export class NotificationLog {

  task!: string;
  lastUpdated?: any;
  id?: any;
  hostIP?: any;
  hostComputerName?: any;
  deviceName: any;
  isOnline?: boolean;
  battLife?: any;
  isCharging?: boolean | null;
  isRegistered?: boolean;
  installedApps?: any[];
  errorMessage?: any;
  effectiveHttpRequestCount?: number;
  loggedTime!: string;
  success?: boolean;
  description?: string;

}
