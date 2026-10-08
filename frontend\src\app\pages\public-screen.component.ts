import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMPTY, catchError, exhaustMap, interval, startWith, Subscription } from 'rxjs';
import { Stats } from '../models';
import { TicketService } from '../services/ticket.service';

@Component({ selector: 'app-public-screen', standalone: true, imports: [CommonModule], template: `
  <main class="public-page">
    <section class="hero"><div><span class="eyebrow">CENTRO DE ATENCIÓN</span><h1>Su tiempo<br>es importante.</h1><p>Por favor, esté pendiente de la pantalla.<br>Le llamaremos en cuanto llegue su turno.</p><button class="primary" (click)="newTicket()" [disabled]="busy">{{ busy ? 'Generando…' : '＋  Obtener turno' }}</button><p class="notice" *ngIf="message">{{ message }}</p></div><div class="hero-art"><div class="sun"></div><div class="figure">◉</div><div class="cube">✳</div></div></section>
    <section class="now-card"><div class="now-label"><span class="pulse"></span> AHORA ATENDIENDO</div><div class="callout" *ngIf="stats?.current; else waiting"><div class="ticket-big">{{ stats.current.number | number:'3.0' }}</div><div class="call-info"><span>FAVOR DE PASAR A</span><strong>Mesa {{ stats.current.desk }}</strong></div></div><ng-template #waiting><div class="callout"><div class="ticket-big muted">— —</div><div class="call-info"><span>PRÓXIMO TURNO</span><strong>En breve</strong></div></div></ng-template></section>
    <section class="bottom-stats"><div><span class="stat-icon">◷</span><div><small>Turnos en espera</small><b>{{ stats?.waiting ?? '—' }}</b></div></div><div><span class="stat-icon">▦</span><div><small>Mesas activas</small><b>{{ stats?.attending ?? 0 }} <em>/ 4</em></b></div></div><div class="clock"><small>ATENCIÓN</small><b>Estamos para ayudarle</b><span>{{ now | date:'EEEE d MMMM · HH:mm' }}</span></div></section>
    <footer>Gracias por su paciencia <span>•</span> Para cualquier duda, acérquese a recepción</footer>
  </main>` })
export class PublicScreenComponent implements OnInit, OnDestroy {
  private readonly service = inject(TicketService);
  stats: Stats | null = null;
  busy = false;
  message = '';
  now = new Date();
  private poll?: Subscription;
  private clock?: Subscription;
  ngOnInit(): void {
    this.poll = interval(2500).pipe(startWith(0), exhaustMap(() => this.loadStats())).subscribe((stats) => this.stats = stats);
    this.clock = interval(30000).subscribe(() => this.now = new Date());
  }
  ngOnDestroy(): void { this.poll?.unsubscribe(); this.clock?.unsubscribe(); }
  private loadStats() {
    return this.service.stats().pipe(catchError(() => {
      this.message = 'No se pudo conectar con el servidor. Verifica que el backend esté iniciado.';
      return EMPTY;
    }));
  }
  refresh(): void { this.loadStats().subscribe((data) => this.stats = data); }
  newTicket(): void { this.busy = true; this.message = ''; this.service.create().subscribe({ next: (ticket) => { this.busy = false; this.message = `Su turno es el ${String(ticket.number).padStart(3, '0')}.`; this.refresh(); }, error: () => { this.busy = false; this.message = 'No se pudo generar el turno. Intente de nuevo.'; } }); }
}


