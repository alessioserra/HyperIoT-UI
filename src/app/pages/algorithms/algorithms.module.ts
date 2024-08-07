import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentsModule } from 'components';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { AlgorithmsComponent } from './algorithms.component';
import { AlgorithmInfoFormComponent } from './algorithm-forms/algorithm-info-form/algorithm-info-form.component';
import { AlgorithmWizardComponent } from './algorithm-wizard/algorithm-wizard.component';

import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { OutputFieldsFormComponent } from './algorithm-forms/output-fields-form/output-fields-form.component';
import { AlgorithmJarFormComponent } from './algorithm-forms/algorithm-jar-form/algorithm-jar-form.component';
import { AlgorithmWizardReportModalComponent } from './algorithm-wizard/algorithm-wizard-report-modal/algorithm-wizard-report-modal.component';
import { InputFieldsFormComponent } from './algorithm-forms/input-fields-form/input-fields-form.component';
import {MatButtonModule} from '@angular/material/button';
import {MatTabsModule} from '@angular/material/tabs';
import {MatCardModule} from '@angular/material/card';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatMenuModule} from '@angular/material/menu';
import {MatListModule} from '@angular/material/list';
import {MatRippleModule} from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

@NgModule({
  declarations: [
    AlgorithmsComponent,
    AlgorithmInfoFormComponent,
    AlgorithmWizardComponent,
    OutputFieldsFormComponent,
    AlgorithmJarFormComponent,
    AlgorithmWizardReportModalComponent,
    InputFieldsFormComponent
  ],
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatMenuModule,
    CommonModule,
    ComponentsModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    MatChipsModule,
    MatRippleModule,
    MatAutocompleteModule,
    MatInputModule,
    MatExpansionModule,
    DragDropModule,
    MatListModule,
    MatCheckboxModule
  ]
})
export class AlgorithmsModule { }
