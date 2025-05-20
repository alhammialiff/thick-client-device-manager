import { createAction, props } from "@ngrx/store";
import { Device } from '../models/device.model';

export const getDeviceData = createAction('[Devices] Get Device Data');

export const getDeviceDataSuccess = createAction('[Devices|Success] Get Device Data',
    props<{deviceData: any}>()
);

export const getDeviceDataFailure = createAction('[Devices|Failure] Get Device Data',
    props<{error: string}>()
);

