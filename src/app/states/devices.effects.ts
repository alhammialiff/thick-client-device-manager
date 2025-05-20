import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, tap } from 'rxjs';
import { DevicesService } from '../services/devices.service';
import * as DeviceDataStateActions from './devices.actions';

@Injectable()
export class DeviceDataStateEffect {

    constructor(private actions$: Actions, private devicesService: DevicesService){}
    
    message: any;

    getDeviceData$ = createEffect(

        () => this.actions$.pipe(

            ofType(DeviceDataStateActions.getDeviceData),

            mergeMap(()=>{

                return this.devicesService.refreshHLData.pipe(

                    tap((response) => console.log("[NGRX Effect | getDeviceData$] response", response)),

                    map((deviceDataResposne) => {

                        console.log("[NGRX Effect | getDeviceData$] deviceData (in map)", deviceData);

                        return DeviceDataStateActions.getDeviceDataSuccess({ deviceData: deviceDataReponse})

                    }),

                    catchError((error)=> 

                        of(DeviceDataStateActions.getDeviceDataFailure({error: error.message}))

                    )

                );

            })

        )
    )

}
