import { GeneralSettings } from "./general-settings.model";
import { NetworkSettings } from "./network-settings.model";
import { StorageSettings } from "./storage-settings.model";

export class Settings {

  generalSettings!: GeneralSettings | null;
  networkSettings!: NetworkSettings | null;
  storageSettings!: StorageSettings | null;

}
