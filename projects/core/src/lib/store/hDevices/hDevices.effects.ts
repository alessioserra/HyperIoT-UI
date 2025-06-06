import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { HdevicesService } from '../../hyperiot-client/h-device-client/api-module/api/hdevices.service';
import { of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { HDeviceActions } from './hDevices.actions';
 
@Injectable()
export class HDevicesEffects {

  load$ = createEffect(() => this.actions$.pipe(
    ofType(HDeviceActions.loadHDevices),
    mergeMap(() => this.hDevicesService.findAllHDevice()
      .pipe(
        map(hDevices => {
          return HDeviceActions.loadHDevicesSuccess({ hDevices });
        }),
        catchError((err) => {
          return of(HDeviceActions.loadHDevicesFailure({ error: err }));
        }),
      ))
    ) 
  );

  constructor(
    private actions$: Actions,
    private hDevicesService: HdevicesService
  ) { }
}