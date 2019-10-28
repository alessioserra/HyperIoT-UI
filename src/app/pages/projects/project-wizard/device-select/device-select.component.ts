import { Component, OnChanges, Input, EventEmitter, Output } from '@angular/core';
import { HDevice } from '@hyperiot/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { SelectOption } from '@hyperiot/components';

@Component({
  selector: 'hyt-device-select',
  templateUrl: './device-select.component.html',
  styleUrls: ['./device-select.component.scss']
})
export class DeviceSelectComponent implements OnChanges {

  @Input() hDevices: HDevice[];

  selectForm: FormGroup;

  devicesOptions: SelectOption[] = [];

  @Output() selectedDevice = new EventEmitter<HDevice>();

  constructor(
    private fb: FormBuilder
  ) {
    this.selectForm = this.fb.group({});
  }

  ngOnChanges(): void {
    this.devicesOptions = [];
    this.hDevices.forEach(device => {
      this.devicesOptions.push({
        value: device,
        label: device.deviceName
      })
    });
    this.autoSelect();
  }

  deviceChanged(event): void {
    console.log(event)
    this.selectedDevice.emit(event.value);
  }

  autoSelect(): void {
    if (this.devicesOptions.length != 0) {
      this.selectForm.get('selectDevice').setValue(this.devicesOptions[0].value);
      this.deviceChanged(this.devicesOptions[0]);
    }
    else
      this.selectedDevice.emit(null);
  }

  selectSpecific(deviceId: number): void {
    console.log(deviceId)
    let so: SelectOption = this.devicesOptions.find(x => x.value.id == deviceId);
    this.selectForm.get('selectDevice').setValue(so.value);
    this.deviceChanged(so);
  }

}