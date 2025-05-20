import { createSelector } from "@ngrx/store";
import { MasterStateInterface } from "./master-state.interface";

export const selectFeature = (masterState: MasterStateInterface) => masterState.deviceData;

export const deviceDataIsLoading = createSelector(

    selectFeature,
    (state) => state.isLoading

)

export const deviceDataSelector = createSelector(
    
    selectFeature,
    (state) => state.deviceData

)

export const deviceDataError = createSelector(

    selectFeature,
    (state) => state.error

)