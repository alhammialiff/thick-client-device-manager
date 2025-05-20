import { createReducer, on } from "@ngrx/store";
import { DeviceData } from "./devices.interface";
import * as DeviceDataStateActions from './devices.actions';

// Initial State
export const initialState: DeviceData = {

    isLoading: false,
    deviceData: {

        id: '',
        hostIP: '',
        hostComputerName: '',
        deviceName: '',
        isOnline: false,
        battLife: '',
        isCharging: false,
        isRegistered: false


    },
    error: null

}

export const DeviceDataStateReducer = createReducer(

    initialState,

    on(DeviceDataStateActions.getDeviceData,(state)=>({
        ...state,
        isLoading: true
    })),
    on(DeviceDataStateActions.getDeviceDataSuccess, (state, action)=>({
        ...state,
        isLoading: false,
        deviceData: action.deviceData
    })),
    on(DeviceDataStateActions.getDeviceDataFailure, (state, action)=>({
        ...state,
        isLoading: false,
        error: action.error
    })),


)