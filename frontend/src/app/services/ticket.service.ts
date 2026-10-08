import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Desk, Stats, Ticket } from './models';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly api = 'http://localhost:5000/api';
  stats(): Observable<Stats> { return this.http.get<Stats>(`${this.api}/stats`); }
  desks(): Observable<Desk[]> { return this.http.get<Desk[]>(`${this.api}/desks`); }
  tickets(): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.api}/tickets`); }
  create(): Observable<Ticket> { return this.http.post<Ticket>(`${this.api}/tickets`, {}); }
  callNext(desk: number): Observable<Ticket> { return this.http.post<Ticket>(`${this.api}/desks/${desk}/call-next`, {}); }
  complete(ticketId: number): Observable<Ticket> { return this.http.post<Ticket>(`${this.api}/tickets/${ticketId}/complete`, {}); }
}
