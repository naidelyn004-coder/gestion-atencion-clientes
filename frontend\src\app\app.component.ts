import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicScreenComponent } from './pages/public-screen.component';
import { OperatorPanelComponent } from './pages/operator-panel.component';

@Component({ selector: 'app-root', standalone: true, imports: [CommonModule, PublicScreenComponent, OperatorPanelComponent], template: `
<header class="topbar"><a class="brand" href="#"><span class="brand-mark">A</span> atención<span class="brand-light">.uno</span></a><nav><button [class.selected]="view === 'screen'" (click)="view = 'screen'">Pantalla pública</button><button [class.selected]="view === 'operator'" (click)="view = 'operator'">Panel de operadores</button></nav><div class="live"><span></span> Sistema en línea</div></header>
<app-public-screen *ngIf="view === 'screen'"></app-public-screen><app-operator-panel *ngIf="view === 'operator'"></app-operator-panel>` })
export class AppComponent { view: 'screen' | 'operator' = 'screen'; }

