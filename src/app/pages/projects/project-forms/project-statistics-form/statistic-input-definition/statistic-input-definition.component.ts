import { Component, OnInit, OnChanges, Input,ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DialogService, SelectOption } from 'components';
import { Algorithm, HPacket, HPacketField, HpacketsService, HProject, HProjectAlgorithmConfig, HProjectAlgorithmInputField } from 'core';
import { resolve } from 'dns';
import { InputDefinitionModalComponent } from './input-definition-modal/input-definition-modal.component';
import { StatisticInputErrorComponent } from './statistic-input-error/statistic-input-error.component';
import { ScrollStrategyOptions } from '@angular/cdk/overlay';

interface StatisticInputForm {
  form: FormGroup;
  leafFieldList: HPacketField[];
}

interface FieldList {
  field: HPacketField;
  label: string;
}

@Component({
  selector: "hyt-statistic-input-definition",
  templateUrl: "./statistic-input-definition.component.html",
  styleUrls: ["./statistic-input-definition.component.scss"],
})
export class StatisticInputDefinitionComponent implements OnInit {
  @Input() project: HProject;
  @Input() algorithm: Algorithm;
  @Input() config: HProjectAlgorithmConfig;

  allPackets: HPacket[] = [];
  selectedPacketId: number;
  /**
   * This property contains leaf HPacketFields, i.e. HPacketFields with no inner fields
   */
  leafFieldList: HPacketField[] = [];
  fieldFlatList: FieldList[] = [];
  packetOptions: SelectOption[] = [];
  statisticInputForms: StatisticInputForm[] = [];

  private originalFormsValues = '{"packet":"","mappedInputList":"","groupBy":""}';

  /**
   * Updating is true when the rule-definition is loaded. It is used to avoid expressionchangedafterviewchecked (isDirty)
   * TODO remove aftersetRuleDefinition() rework.
   */
  updating = false;

  number_field_selected = 0;
  groupByAlgorithm : boolean = true;
  fieldsList : SelectOption[] = [];
  fieldsInputList : SelectOption[] = [];
  inputList: any[] = [];

  constructor(
    private hPacketsService: HpacketsService,
    public fb: FormBuilder,
    private dialogService: DialogService,
    private scrollStrategyOptions: ScrollStrategyOptions,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (this.packetOptions.length === 0) this.loadHPackets();
  }

  addStatisticInput() {
    this.statisticInputForms.push({
      form: this.fb.group({}),
      leafFieldList: [],
    });
  }

  canBindInputFields(leafFieldList: HPacketField[]): boolean {
    return leafFieldList.length > 0 && this.algorithm != null;
  }

  buildLeafFieldList(hPacket: HPacket): HPacketField[] {
    let fieldList: HPacketField[] = [];
    this.leafFieldList = [];
    this.fieldFlatList = [];
    fieldList = this.treefy(hPacket.fields);
    this.extractField(fieldList);
    return this.fieldFlatList
      .filter((f) => f.field.innerFields.length === 0)
      .map((f) => f.field);
  }

  extractField(fieldArr: HPacketField[], pre?: string) {
    fieldArr.forEach((f) => {
      const fieldName: string = pre ? pre + "." + f.name : f.name;
      this.fieldFlatList.push({ field: f, label: fieldName });
      if (f.innerFields) {
        this.extractField(f.innerFields, fieldName);
      }
    });
  }

  isDirty(): boolean {
    return this.getJsonForms() === "{}" || this.updating
      ? false
      : this.getJsonForms() !== this.originalFormsValues;
  }

  isFormInvalid(k: number): boolean {
    const valArr = this.statisticInputForms[k].form;
    return Object.entries(valArr.value).length === 0 || valArr.get("packet") === undefined || valArr.get("mappedInputList") === undefined
      ? true
      : valArr.get("packet").invalid || valArr.get("mappedInputList").invalid;
  }

  isInvalid(): boolean {
    for (let k = 0; k < this.statisticInputForms.length; k++) {
      if (this.isFormInvalid(k)) {
        return true;
      }
    }
    return false;
  }

  findParent(
    fieldList: HPacketField[],
    packetField: HPacketField
  ): HPacketField {
    const parent: HPacketField = fieldList.find((x) =>
      x.innerFields.some((y) => y.id === packetField.id)
    );
    if (parent) {
      return this.findParent(fieldList, parent);
    } else {
      return packetField;
    }
  }

  loadHPackets(): Promise<HPacket[]> {
    if (this.project) {
      return new Promise((resolve, reject) => {
        this.hPacketsService
          .findAllHPacketByProjectId(this.project.id)
          .toPromise()
          .then((res) => {
            this.allPackets = res;
            this.packetOptions = this.allPackets.map((p) => ({
              label: p.name,
              value: p.id,
            }));
            this.leafFieldList = [];
            this.cd.detectChanges();
            resolve(this.allPackets);
          });
      });
    } else {
      //return empty result
      return new Promise((resolve, reject) => {
        resolve([]);
      });
    }
  }

  inputHaveBeenBounded(i: number): boolean {
    return this.statisticInputForms[i].form.get("mappedInputList").valid;
  }

  loadInputFields(i: number) {
    const leafFieldList: HPacketField[] =
      this.statisticInputForms[i].leafFieldList;
    const mappedInputList =
      this.statisticInputForms[i].form.value.mappedInputList;
    const currentPacketId = this.statisticInputForms[i].form.value.packet;
    const data = {
      hPacketFieldList: leafFieldList,
      algorithm: this.algorithm,
      mappedInputList,
    };

    this.populateInputList(data.algorithm);
    this.populateFieldsList(data.hPacketFieldList);
  }

  populateFieldsList(data: HPacketField[]){
    this.fieldsList = [];
    data.forEach(el => {
      this.fieldsList.push({'value': el, 'label': el.name, 'disabled':false});
      this.fieldsInputList.push({'value': el, 'label': el.name, 'disabled':false});
    });
  }

  populateInputList(algorithm){
    this.inputList = [];
    let algorithmBaseConfig = JSON.parse(algorithm.baseConfig);
    let inputs = algorithmBaseConfig.input;
    inputs.forEach(el => {
      this.inputList.push({'value': el, 'label': el.name})
    });
  }

  originalValueUpdate() {
    this.originalFormsValues = this.getJsonForms();
  }

  private getJsonForms() {
    let currentValue = "";
    this.statisticInputForms.map(
      (rf) => (currentValue += JSON.stringify(rf.form.value))
    );
    return currentValue;
  }

  packetChanged(event: any, index: number) {
    this.loadHPackets().then((packets) => {
      this.selectedPacketId = event;
      this.statisticInputForms[index].leafFieldList = this.buildLeafFieldList(
        packets.find((y) => y.id === event)
      );
      this.config.input.splice(index, 1);
      this.statisticInputForms[index].form.value.mappedInputList = "";
      const mappedInputList =
        this.statisticInputForms[index].form.get("mappedInputList");
      if (mappedInputList) {
        mappedInputList.setValue("");
      }

      // update fields 
      this.loadInputFields(index);
    });    
  }

  groupByChanged(event: any, index: number) {
    this.number_field_selected = event.value.length;    
  }

  inputChanged(event: any, index: number) {
    const selectedValue = event.value;
    this.fieldsInputList.forEach(option => {
      option.disabled = (option.value === selectedValue);
    });
  }

  removeStatisticInput(index: number) {
    this.statisticInputForms.splice(index, 1);
    this.config.input.splice(index, 1);
  }

  resetRuleDefinition(): void {
    this.statisticInputForms = [
      {
        form: this.fb.group({}),
        leafFieldList: [],
      },
    ];
    this.originalFormsValues = '{"packet":"","mappedInputList":"", "groupBy":""}';
  }

  setInputConfigDefinition(input: HProjectAlgorithmInputField[]): void {
    this.updating = true;
    this.loadHPackets().then(packets => {
        if (input && input.length !== 0) {
          this.statisticInputForms = [];

          for (let k = 0; k < input.length; k++) {
            const currentPacket: HPacket = packets.find(
              (p) => p.id === input[k].packetId
            );
            if (!currentPacket) {
              this.dialogService.open(StatisticInputErrorComponent, { backgroundClosable: true });
              this.resetRuleDefinition();
              return;
            }

            const fields: HPacketField[] =
              this.buildLeafFieldList(currentPacket);
            // check if all fields still exist
            input[k].mappedInputList.forEach((mappedInput) => {
              if (!fields.find((f) => f.id === mappedInput.packetFieldId)) {
                this.dialogService.open(StatisticInputErrorComponent, { backgroundClosable: true });
                this.resetRuleDefinition();
                return;
              }
            });

            this.statisticInputForms.push({
              form: this.fb.group({}),
              leafFieldList: fields,
            });

            this.cd.detectChanges();

            const packet = this.statisticInputForms[k].form.get("packet");
            if (packet) {
              packet.setValue(currentPacket.id);
            }
            const mappedInputList =
              this.statisticInputForms[k].form.get("mappedInputList");
            if (mappedInputList) {
              mappedInputList.setValue(
                JSON.stringify(input[k].mappedInputList)
              );
            }
            if (k === this.statisticInputForms.length - 1) {
              this.originalValueUpdate();
              this.updating = false;
            }
          }
        } else {
          this.resetRuleDefinition();
        }
    })
  }

  setConfigDefinition(configDefinition: string) {
    const config: HProjectAlgorithmConfig = JSON.parse(configDefinition);
    this.setInputConfigDefinition(config.input);
  }

  treefy(fieldList: HPacketField[]): HPacketField[] {
    const treefiedFields = [];
    fieldList.forEach((x) => {
      const parent: HPacketField = this.findParent(fieldList, x);
      if (parent && !treefiedFields.some((y) => y.id === parent.id)) {
        treefiedFields.push(parent);
      }
    });
    return treefiedFields;
  }
}
