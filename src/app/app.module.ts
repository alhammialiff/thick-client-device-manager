import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';

import { HttpClientModule } from '@angular/common/http';

// NGRX
import { DeviceDataStateReducer } from './states/devices.reducer';
import { StoreModule } from '@ngrx/store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MainContainerComponent } from './main-container/main-container.component';

import { ReactiveFormsModule } from '@angular/forms';

// Angular Material Design imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatCardModule } from '@angular/material/card';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { LayoutModule } from '@angular/cdk/layout';
import { MatStepperModule } from '@angular/material/stepper';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DateAdapter, MatNativeDateModule, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatMomentDateModule, MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter, MomentDateModule } from '@angular/material-moment-adapter';
import { MatDialogModule } from '@angular/material/dialog';


import { HololensAPIService } from './services/hololens-api.service';
import { InsertDevicePanelDirective } from './directives/insert-device-panel.directive';
import { InsertPlayHololensAppRowDirective } from './directives/insert-play-hololens-app-row.directive';

import { DevicePanelComponent } from './reusable-components/device-panel/device-panel.component';
import { DeviceDetailsComponent } from './device-details/device-details.component';
import { NotFoundComponent } from './reusable-components/not-found/not-found.component';
import { TopNavComponent } from './top-nav/top-nav.component';
import { PlayHololensAppRowComponent } from './reusable-components/play-hololens-app-row/play-hololens-app-row.component';
import { MixedRealityCapturePageComponent } from './mixed-reality-capture-page/mixed-reality-capture-page.component';
import { OverviewPageComponent } from './overview-page/overview-page.component';
import { DeviceConfigComponent } from './reusable-components/device-config/device-config.component';
import { DeviceRowComponent } from './reusable-components/device-row/device-row.component';
import { InsertDeviceRowDirective } from './directives/insert-device-row.directive';
import { VideoWindowComponent } from './reusable-components/video-window/video-window.component';
import { ToastMessageComponent } from './reusable-components/toast-message/toast-message.component';
import { InsertToastMessageDirective } from './directives/insert-toast-message.directive';
import { SettingsPageComponent } from './settings-page/settings-page.component';
import { GeneralSettingsComponent } from './settings-page/general-settings/general-settings.component';
import { NetworkSettingsComponent } from './settings-page/network-settings/network-settings.component';
import { StorageSettingsComponent } from './settings-page/storage-settings/storage-settings.component';
import { WifiProfileRowComponent } from './settings-page/network-settings/wifi-profile-row/wifi-profile-row.component';
import { AvailableNetworksRowComponent } from './settings-page/network-settings/available-networks-row/available-networks-row.component';
import { PassphraseDialogComponent } from './settings-page/network-settings/passphrase-dialog/passphrase-dialog.component';
import { GridStreamRowComponent } from './reusable-components/grid-stream-row/grid-stream-row.component';
import { PopUpMessageDialogComponent } from './reusable-components/pop-up-message-dialog/pop-up-message-dialog.component';
import { PopUpDeviceRegistrationDialogComponent } from './reusable-components/pop-up-device-registration-dialog/pop-up-device-registration-dialog.component';
import { FooterComponent } from './footer/footer.component';
import { UninstallVersionSelectionDialogComponent } from './device-details/uninstall-version-selection-dialog/uninstall-version-selection-dialog.component';
import { SessionSettingComponent } from './settings-page/session-setting/session-setting.component';
import { WebSocketService } from './services/web-socket.service';
import { WrappedSocket } from 'ngx-socket-io/src/socket-io.service';
import { TrialExpiredPageComponent } from './trial-expired-page/trial-expired-page.component';
import { TestComponent } from './test/test.component';

@NgModule({
  declarations: [
    AppComponent,
    MainContainerComponent,
    InsertDevicePanelDirective,
    DevicePanelComponent,
    DeviceDetailsComponent,
    NotFoundComponent,
    TopNavComponent,
    PlayHololensAppRowComponent,
    MixedRealityCapturePageComponent,
    OverviewPageComponent,
    InsertPlayHololensAppRowDirective,
    DeviceConfigComponent,
    DeviceRowComponent,
    InsertDeviceRowDirective,
    VideoWindowComponent,
    ToastMessageComponent,
    InsertToastMessageDirective,
    SettingsPageComponent,
    GeneralSettingsComponent,
    NetworkSettingsComponent,
    StorageSettingsComponent,
    WifiProfileRowComponent,
    AvailableNetworksRowComponent,
    PassphraseDialogComponent,
    GridStreamRowComponent,
    PopUpMessageDialogComponent,
    PopUpDeviceRegistrationDialogComponent,
    FooterComponent,
    UninstallVersionSelectionDialogComponent,
    SessionSettingComponent,
    TrialExpiredPageComponent,
    TestComponent
  ],
  imports: [
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    BrowserModule,
    CommonModule,
    ReactiveFormsModule,
    BrowserAnimationsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatDatepickerModule,
    MatSlideToggleModule,
    MatNativeDateModule,
    MatMomentDateModule,
    MatSliderModule,
    MatTooltipModule,
    MatTabsModule,
    MatCardModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatToolbarModule,
    MatStepperModule,
    MatProgressSpinnerModule,
    LayoutModule,
    MatDialogModule,
    OverlayModule,
    PortalModule,
    StoreModule.forRoot({ deviceData: DeviceDataStateReducer }),
    EffectsModule.forRoot(),
    StoreDevtoolsModule.instrument({
      maxAge: 25,
      logOnly: true
    }),
  ],
  providers: [
    HololensAPIService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
