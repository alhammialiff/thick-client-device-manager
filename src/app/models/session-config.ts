import { Device } from "./device.model"
import { Settings } from "./settings.model";

export interface SessionConfig{
  // [Note to self] To remove savedData property and just go with an array of Device?
  REGISTERED_DEVICES?: {
    savedData?: Device[] | null;
  }
  SETTINGS_CONFIG?: Settings | null;
  CACHED_INSTALLED_APPS?: any[] | null;

}
