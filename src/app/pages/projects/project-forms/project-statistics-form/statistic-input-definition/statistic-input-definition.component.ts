import { Component, OnInit, SimpleChanges, Input,ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { DialogService, SelectOption } from 'components';
import { Algorithm, HPacket, HPacketField, HpacketsService, HProject, HProjectAlgorithmConfig, HProjectAlgorithmInputField } from 'core';
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
  groupByAlgorithm : boolean = false;
  fieldsList : SelectOption[] = []; // multi-select for GroupBy
  fieldsInputList : SelectOption[] = []; // solo-select for other inputs
  inputList: any[] = [];
  selectedArray = [];
  selectedGroupBy = [];

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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['algorithm']) {
      // reset all input fields when algorithm selected changes
      this.resetInputFields();

      // load config
      let config = changes['config'].currentValue;
      if (config && config.input.length > 0) {

        // for each statistic form
        config.input.forEach(async (el: any, index: number) => {          
          // assign mappedInputList e packetId
          this.statisticInputForms[index].form.get("mappedInputList").setValue(el.mappedInputList);
          this.statisticInputForms[index].form.get("packet").setValue(el.packetId);

          this.selectedArray = el.mappedInputList;

          // update all other stuffs
          await this.packetChanged(el.packetId, index);
          this.cd.detectChanges();

          // update EVERY mapped select 
          el.mappedInputList.forEach(input => {
            let form = this.statisticInputForms[index].form;
            let formControlName = input.algorithmInput.name;
            let selectedField = this.fieldsInputList.find(item => item.value.id === input.packetFieldId);
            form.get(formControlName).setValue(selectedField.value);
          });

          this.selectedGroupBy = el.groupBy
          this.statisticInputForms[index].form.get("groupBy2").setValue(this.selectedGroupBy);
          this.cd.detectChanges();
        });
      }
    }
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

  /**
   * Load the input fields in a similar way to the previous modal
   */
  loadInputFields(i: number) {
    this.resetInputFields();
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

    this.groupByAlgorithm = this.isGroupBy(data.algorithm); //groupBy flag or not?
    this.populateInputList(data.algorithm);
    this.populateFieldsList(data.hPacketFieldList);
  }

  /**
  * Check if the algorithm has GROUPBY or NOT.
  */
  isGroupBy(algorithm: any) {
    let parsedBaseConfig = JSON.parse(algorithm.baseConfig);
    let customConfig = JSON.parse(parsedBaseConfig.customConfig);

    if (customConfig != null) return customConfig.groupBy;
    else return false;
  }

  /**
  * Insert values options inside the 2 field arrays (1 for multi-select, 1 for solo-select)
  */
  populateFieldsList(data: HPacketField[]){
    this.fieldsList = [];
    data.forEach(el => {
      this.fieldsList.push({'value': el, 'label': el.name, 'disabled':false});
      this.fieldsInputList.push({'value': el, 'label': el.name, 'disabled':false});
    });
  }

  /**
   * Load the inputs of the algorithm
   */
  populateInputList(algorithm){
    this.inputList = [];
    let algorithmBaseConfig = JSON.parse(algorithm.baseConfig);
    let inputs = algorithmBaseConfig.input;
    inputs.forEach(el => {
      this.inputList.push({'value': el, 'label': el.name})
    });
  }

  /**
  * Check the new value and do something:
  * selected value -> disabled in other selects
  * reset value -> enabled in other selects
  */
  inputChanged(form: any, formControlName: string, index: number) {
    const selectedValues = Object.keys(form.controls)
    .filter(key => form.get(key))
    .map(key => form.get(key).value)
    .filter(value => value !== '')

    const selectedValuesIds = selectedValues
      .filter(item => typeof item === 'object' && item !== null && 'id' in item)
      .map(item => item.id);
    
    // RESET FIELD (id ==0)
    if (form.get(formControlName).value) {
      if (form.get(formControlName).value.id == 0){
        form.get(formControlName).reset();
        this.fieldsInputList.shift();
      }
    }

    this.fieldsInputList.forEach(option => {
      option.disabled = selectedValuesIds.includes(option.value.id);
    });

    this.updateMappedInputList(form, formControlName, index, true);
  }

  /*
  * Method to update the mappedInputList hidden formControl  
  */
  updateMappedInputList(form: any, formControlName: string, formIndex: number, isChanged: boolean) {
    let jsonObject: any;
    let temp: any = {};
    let array = [];

    // recupero valore form precedente
    // 1) caso array vuoto
    if (form.get("mappedInputList").value == "") jsonObject = JSON.parse("{}");

    // 2) caso array esistente
    else {
      jsonObject = JSON.parse(form.get("mappedInputList").value);      
      jsonObject.forEach(el =>{
        array.push(el);
      });
    }

    if (isChanged == true){
      // devo recuperare INPUT
      const foundItem = this.inputList.find(item => item.label === formControlName);

      // devo recuperare packetFieldId
      let packetFieldId : number;
      if (form.get(formControlName).value != null) packetFieldId = form.get(formControlName).value.id;
      else packetFieldId = 0;

      // se NON sto resettando
      if (packetFieldId != 0) {
        // Elimino valore precedente (se esiste)
        array = this.removeById(array, foundItem.value.id);

        // Infine creo oggetto e lo aggiungo all'array
        temp.packetFieldId = packetFieldId;
        temp.algorithmInput = foundItem.value;
        array.push(temp);
      }

      // se resetto:
      if (packetFieldId == 0) array = this.removeById(array, foundItem.value.id);

      // aggiorno valore del form mappedInputList
      let mappedValuesArray = JSON.stringify(array);
      form.get("mappedInputList").setValue(mappedValuesArray);

      // aggiorno valori
      this.selectedArray = array;

      // aggiorno valore delle config
      this.config.input[formIndex] = {
        packetId: this.selectedPacketId,
        mappedInputList: array,
        groupBy: this.selectedGroupBy
      };
    }
  }

  // Funzione per rimuovere l'oggetto con l'ID specificato
  removeById(data: any, searchId: number): [] {
    return data.filter(item => item.algorithmInput.id !== searchId);
  }

  /**
  * Add or remove the RESET option if there is or not a value selected
  */
  checkOptions(form: any, formControlName: string){
    // Add reset option
    if (form.get(formControlName).value && form.get(formControlName).value.id > 0) this.fieldsInputList.unshift({'value': {id : 0, val : null}, 'label': 'RESET FIELD', 'disabled':false});

    // Remove reset option
    if (form.get(formControlName).value == null) {
      const index = this.fieldsInputList.findIndex(field => field.value.id === 0);
      if (index > -1) this.fieldsInputList.splice(index, 1);
    }
  }

  /**
  * Reset all selection. Called when algorithm changes
  */
  resetInputFields() {
    this.fieldsList = [];
    this.fieldsInputList = [];
    this.inputList = [];
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

  packetChanged(event: any, index: number): Promise<void> {
    return this.loadHPackets().then((packets) => {
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

      this.loadInputFields(index);
    });
  }

  /*
  *  Method used to update the multiselection in the GroupBy Select
  */
  groupByChanged(form: any, event: any, index: number) {
    this.number_field_selected = event.value.length; // visualizzo numero di el selezionati

    this.selectedGroupBy = event.value;
    // E aggiorno valore delle config
    this.config.input[index] = {
      packetId: this.selectedPacketId,
      mappedInputList: this.selectedArray,
      groupBy: this.selectedGroupBy
    };
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
