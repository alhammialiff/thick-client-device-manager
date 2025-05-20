export class Device {
    lastUpdated?: any;
    id!: any;
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
    lowPowerState?: boolean;
    lowPowerStateAvailable?: boolean;
    playingApp?: string;
    username?: string | null;
    password?: string | null;
}
