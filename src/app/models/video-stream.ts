import { Device } from "./device.model";

export class VideoStream {

  deviceData!: Device;
  hlVideoStreamingUrl!: string;
  isLoading?: boolean;
  playStream!: boolean;

}
