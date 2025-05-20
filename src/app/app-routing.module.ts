import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DeviceDetailsComponent } from './device-details/device-details.component';
import { MainContainerComponent } from './main-container/main-container.component';
import { NotFoundComponent } from './reusable-components/not-found/not-found.component';
import { MixedRealityCapturePageComponent } from './mixed-reality-capture-page/mixed-reality-capture-page.component';
import { OverviewPageComponent } from './overview-page/overview-page.component';
import { VideoWindowComponent } from './reusable-components/video-window/video-window.component';
import { SettingsPageComponent } from './settings-page/settings-page.component';
import { GeneralSettingsComponent } from './settings-page/general-settings/general-settings.component';
import { NetworkSettingsComponent } from './settings-page/network-settings/network-settings.component';
import { StorageSettingsComponent } from './settings-page/storage-settings/storage-settings.component';
import { SessionSettingComponent } from './settings-page/session-setting/session-setting.component';
import { TrialExpiredPageComponent } from './trial-expired-page/trial-expired-page.component';
import { TestComponent } from './test/test.component';

const routes: Routes = [
  // Device detail route (param: device's ID)
  // Wildcard Route (Default Redirect)
  {
    path: 'started',
    component: MainContainerComponent,
    children: [
      {
        path: 'overview',
        component: OverviewPageComponent,
        children: [
          {
            path: ':id',
            component: DeviceDetailsComponent
          }
        ]
      },
      // MRC Page Route
      {
        path: 'mixed-reality-capture',
        component: MixedRealityCapturePageComponent
      },
      // Settings Page Route
      {
        path: 'settings',
        component: SettingsPageComponent,
        children: [
          {
            path: 'general',
            component: GeneralSettingsComponent
          },
          {
            path: 'network',
            component: NetworkSettingsComponent
          },
          {
            path: 'storage',
            component: StorageSettingsComponent
          },
          {
            path: 'session',
            component: SessionSettingComponent
          },
          {
            path: '',
            redirectTo: 'general',
            pathMatch: 'full'
          }
        ]
      },
      // Testbed Component for Jessen's Standalone Live Stream App
      {
        path: 'test',
        component: TestComponent
      },
      {
        path: '404',
        component: NotFoundComponent
      },
    ]
  },
  {
    path: 'video-window/:id',
    component: VideoWindowComponent
  },
  {
    path: '',
    redirectTo: 'started/overview',
    pathMatch: 'full'
  },
  {
    path:'trialexpired',
    component: TrialExpiredPageComponent
  },
  {
    path:'**',
    redirectTo:'/404',
    pathMatch: 'full'
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, {onSameUrlNavigation: 'reload'})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
