import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY, Observable, catchError, exhaustMap, forkJoin, interval, startWith, Subscription } from 'rxjs';
import { Desk, Stats, Ticket } from '../models';
import { TicketService } from '../services/ticket.service';

@Component({ selector: 'app-operator-panel', standalone: true, imports: [CommonModule], template: `
  <main class="operator-page"><div class="page-heading"><div><span class="eyebrow">OPERACIÓN</span><h1>Panel de atención</h1><p>Asigna el siguiente turno disponible a una mesa libre.</p></div><button class="secondary" (click)="refresh()">↻ &nbsp;Actualizar</button></div>
    <div class="metrics"><article><small>EN ESPERA</small><strong>{{ stats?.waiting ?? 0 }}</strong><span>Personas esperando</span></article><article><small>EN ATENCIÓN</small><strong>{{ stats?.attending ?? 0 }}<i> / 4</i></strong><span>Mesas ocupadas</span></article><article><small>ATENDIDOS</small><strong>{{ stats?.completed ?? 0 }}</strong><span>Turnos completados</span></article></div>
    <div class="section-title"><div><h2>Mesas de atención</h2><p>Libera la mesa al terminar para llamar al siguiente turno.</p></div><span class="queue">{{ stats?.waiting ?? 0 }} en fila</span></div>
    <section class="desk-grid"><article class="desk-card" *ngFor="let desk of desks"><div class="desk-head"><span class="desk-symbol">▦</span><span class="desk-label">MESA {{ desk.desk }}</span><span class="desk-status" [class.occupied]="desk.ticket">{{ desk.ticket ? 'Atendiendo' : 'Disponible' }}</span></div><ng-container *ngIf="desk.ticket; else freeDesk"><div class="active-turn"><small>TURNO ACTUAL</small><strong>{{ desk.ticket.number | number:'3.0' }}</strong></div><button class="finish" (click)="finish(desk.ticket!)" [disabled]="busy">✓ &nbsp;Atendido / Liberar mesa</button></ng-container><ng-template #freeDesk><div class="empty-desk"><span>— —</span><p>Mesa disponible</p></div><button class="primary full" (click)="call(desk.desk)" [disabled]="busy || !stats?.waiting">Siguiente / Llamar turno <b>→</b></button></ng-template></article></section>
    <div class="operator-message" *ngIf="message">{{ message }}</div><section class="recent"><div class="section-title"><div><h2>Últimos turnos</h2><p>Actividad reciente del centro</p></div></div><div class="recent-row" *ngFor="let t of tickets.slice(0, 5)"><strong>Turno {{ t.number | number:'3.0' }}</strong><span>{{ t.desk ? 'Mesa ' + t.desk : '—' }}</span><span class="tag" [class.open]="t.status === 'open'" [class.attending]="t.status === 'attending'" [class.completed]="t.status === 'completed'">{{ statusLabel(t.status) }}</span></div><div class="recent-row" *ngIf="!tickets.length"><span>Aún no hay turnos registrados.</span></div></section>
  </main>` })
export class OperatorPanelComponent implements OnInit, OnDestroy {
  private readonly service = inject(TicketService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  stats: Stats | null = null;
  desks: Desk[] = [1, 2, 3, 4].map((desk) => ({ desk, ticket: null }));
  tickets: Ticket[] = [];
  busy = false;
  message = '';
  private poll?: Subscription;
  ngOnInit(): void {
    this.poll = interval(2500).pipe(startWith(0), exhaustMap(() => this.loadSnapshot())).subscribe((snapshot) => this.applySnapshot(snapshot));
  }
  ngOnDestroy(): void { this.poll?.unsubscribe(); }
  private loadSnapshot(): Observable<{ stats: Stats; desks: Desk[]; tickets: Ticket[] }> {
    return forkJoin({ stats: this.service.stats(), desks: this.service.desks(), tickets: this.service.tickets() }).pipe(catchError(() => {
      this.message = 'No se pudo conectar con el servidor. Verifica que el backend esté iniciado.';
      this.changeDetector.markForCheck();
      return EMPTY;
    }));
  }
  private applySnapshot(snapshot: { stats: Stats; desks: Desk[]; tickets: Ticket[] }): void {
    this.stats = snapshot.stats;
    this.desks = snapshot.desks;
    this.tickets = snapshot.tickets;
    this.changeDetector.markForCheck();
  }
  refresh(): void {
    this.loadSnapshot().subscribe((snapshot) => this.applySnapshot(snapshot));
  }
  call(desk: number): void { this.busy = true; this.message = ''; this.service.callNext(desk).subscribe({ next: () => { this.busy = false; this.refresh(); }, error: (e) => { this.busy = false; this.message = e.error?.error ?? 'No fue posible llamar el turno.'; this.refresh(); } }); }
  finish(ticket: Ticket): void { this.busy = true; this.service.complete(ticket.id).subscribe({ next: () => { this.busy = false; this.message = `Turno ${ticket.number} completado. Mesa ${ticket.desk} liberada.`; this.refresh(); }, error: () => { this.busy = false; this.message = 'No fue posible liberar la mesa.'; } }); }
  statusLabel(status: Ticket['status']): string { return status === 'open' ? 'En espera' : status === 'attending' ? 'Atendiendo' : 'Completado'; }
}

