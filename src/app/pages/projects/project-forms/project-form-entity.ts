import { FormGroup, FormBuilder } from '@angular/forms';

import { Observable } from 'rxjs';

import { OnInit, Output, EventEmitter, Injector, AfterViewInit,ChangeDetectorRef, Component } from '@angular/core';
import { SummaryList } from '../project-detail/generic-summary-list/generic-summary-list.component';
import { DeleteConfirmDialogComponent } from 'src/app/components/dialogs/delete-confirm-dialog/delete-confirm-dialog.component';
import { EntitiesService } from 'src/app/services/entities/entities.service';
import { DialogService } from 'components';
import { ProjectsService } from 'src/app/services/projects.service';
import {MatRadioChange} from '@angular/material/radio';

export enum LoadingStatusEnum {
    Ready,
    Loading,
    Saving,
    Error
}

@Component({
    template: ''
})

// tslint:disable-next-line:component-class-suffix
export abstract class ProjectFormEntity implements OnInit, AfterViewInit {
    @Output() entityEvent = new EventEmitter<any>();

    entity: any = {};
    entityFormMap: any;
    formTitle = 'Project Form Entity';

    form: FormGroup;
    // formAlarm :  FormGroup;
    private originalValue = '{}';
    protected validationError = [];

    // the following 5 fields should implemented by a specific interface
    isProjectEntity = true;
    editMode = false;
    hideDelete = false;
    showSave = true;
    showCancel = false;
    formTemplateId = '';
    longDefinition = 'entity long definition';
    icon = '';
    summaryList: SummaryList;

    LoadingStatus = LoadingStatusEnum;
    loadingStatus = LoadingStatusEnum.Ready;

    unsavedChangesCallback;

    @Output() clickedTab: EventEmitter<any> = new EventEmitter();

    protected formBuilder: FormBuilder;
    protected dialog: DialogService;
    protected entitiesService: EntitiesService;
	protected projectsService: ProjectsService;

    constructor(
        injector: Injector,
        private cd:ChangeDetectorRef
    ) {
        this.formBuilder = injector.get(FormBuilder);
        this.entitiesService = injector.get(EntitiesService);
        this.dialog = injector.get(DialogService);
        this.form = this.formBuilder.group({});
        //this.formAlarm = this.formBuilder.group({});
		    this.projectsService = injector.get(ProjectsService);
    }

    ngOnInit() {
        this.entity = { ...this.newEntity() };
    }

    ngAfterViewInit(){
        this.cd.detectChanges();
        this.buildHintMessages();
    }

    canDeactivate(): Observable<any> | boolean {
        if (this.isDirty() && typeof this.unsavedChangesCallback === 'function') {
            return this.unsavedChangesCallback();
        }
        return true;
    }

    load(): void { }
    loadEmpty(): void { }
    save(successCallback: any, errorCallback: any): void { }
    delete(successCallback: any, errorCallback: any): void { }
    cancel(): void { }
    isNew() {
        return !this.entity || !this.entity.id;
    }

    edit(entity?: any, readyCallback?) {
        if (entity) {
            this.entity = { ...entity };
        }

        Object.keys(this.entityFormMap).forEach((key) => {
            if (this.form.get(key)) {
                // TODO: check why form control value inside the form control must be a string
                // it should accept other values
                const value = (this.entity[this.entityFormMap[key].field] != null && this.entity[this.entityFormMap[key].field] !== undefined)
                              ? (''+this.entity[this.entityFormMap[key].field]) : null;
                this.form.get(key).setValue(value);
            }
        });
        if (readyCallback) {
            readyCallback();
        }
        this.resetForm();
    }

    clone(entity?: any): any {
        const cloned = { ...entity } || this.entity;
        cloned.id = 0;
        cloned.entityVersion = 1;
        cloned.name = `${cloned.name} (copy)`;
        this.edit(cloned);
        this.originalValue = '';
        return cloned;
    }

    newEntity() {
        const entity = {};
        // create default entity object)
        if (this.entityFormMap) {
            const keys = Object.keys(this.entityFormMap);
            keys.map((k) => {
                const f = this.entityFormMap[k];
                if (f.field) {
                    entity[f.field] = f.default;
                }
            });
        }
        return entity;
    }

    isValid(): boolean {
        let invalid = false;
        Object.keys(this.form.controls).forEach((field) => {
            invalid = invalid || this.form.get(field).invalid;
        });
        return !invalid;
    }
    isDirty(): boolean {
        return (this.originalValue === '{}') ? false : this.serialize() !== this.originalValue;
    }

    getError(field) {
        const err = this.validationError.find((e) => e.field == field);
        return err && err.message;
    }
    setErrors(err) {
        if (err.error && err.error.validationErrors) {
            this.validationError = err.error.validationErrors;
            this.validationError.map((e) => {
                // TODO: this is a temporary patch to deal
                // TODO: with wrong field names in error response
                if (this.entityFormMap) {
                    const keys = Object.keys(this.entityFormMap);
                    for (let k of keys) {
                        if (this.entityFormMap[k].field === e.field) {
                            e.field = k;
                            break;
                        }
                    }
                }
                // ^^^^^^
                this.form.get(e.field).setErrors({
                    validateInjectedError: {
                        valid: false
                    }
                });
            });
            this.loadingStatus = LoadingStatusEnum.Ready;
        } else {
            this.loadingStatus = LoadingStatusEnum.Error;
        }
    }
    resetErrors() {
        this.validationError = [];
    }

    resetForm() {
      this.originalValue = this.serialize();
    }

    private serialize() {
      const keys = Object.keys(this.form.value);
      keys.sort((a, b) => {
          return a > b ? 1 : (a === b ? 0 : -1);
      });
      const copy = {};
      keys.forEach((k) => {
          copy[k] = this.form.value[k];
      });
      return JSON.stringify(copy, this.circularFix);
    }

    private buildHintMessages() {
        const hintElements =
            // (this.formView.nativeElement as Element)
            document.querySelectorAll(`#${this.formTemplateId} [hintMessage]`);
        hintElements.forEach((el: Element) => {
            const message = el.getAttribute('hintMessage');
            const tmp = el.querySelector('.hyt-input,mat-select');
            if (tmp == null) {
                return;
            }
            el = tmp;
            el.addEventListener('focus', () => {
                this.entityEvent.emit({
                    event: 'hint:show',
                    message
                });
            });
            el.addEventListener('blur', () => {
                this.entityEvent.emit({
                    event: 'hint:hide'
                });
            });
            // TODO: remove listeners on ngOnDestroy()
            // TODO: remove listeners on ngOnDestroy()
            // TODO: remove listeners on ngOnDestroy()
            // TODO: remove listeners on ngOnDestroy()
        });
    }

    protected circularFix = (key: any, value: any) => {
        if (value instanceof MatRadioChange) {
            // TODO: maybe this should be fixed in HyperIoT components library (hyt-radio-button)
            return value.value || value;
        }
        return value;
    }

    protected getUser = () => {
        let currentUser;
        if (localStorage.getItem('user')) {
            currentUser = JSON.parse(localStorage.getItem('user'));
        }
        return { id: currentUser.id, entityVersion: currentUser.entityVersion };
    }

    openDeleteDialog(successCallback?: any, errorCallback?: any) {

        let textDialog: { title: string; message: string; };
        // Packet case
        if (this.entity.trafficPlan && this.entity.type) textDialog = { title: $localize`:@@HYT_packet_delete_packet_question:Do you really want to delete this packet?`, message: $localize`:@@HYT_packet_operation_cannot_be_undone:If you delete the packet, any configurations inside the widgets will be reset and will have to be set again.`}
        // All other cases
        else textDialog = { title: $localize`:@@HYT_delete_item_question:Do you really want to delete this item?`, message: $localize`:@@HYT_operation_cannot_be_undone:This operation cannot be undone`}

        const dialogRef = this.dialog.open(DeleteConfirmDialogComponent, {
            data: textDialog
        });
        dialogRef.dialogRef.afterClosed().subscribe((result) => {
            if (result === 'delete') {
                this.delete(successCallback, errorCallback);
            }
        });
    }

}

