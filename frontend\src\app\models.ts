export interface Ticket { id: number; number: number; status: 'open' | 'attending' | 'completed'; desk: number | null; created_at: string; called_at: string | null; completed_at: string | null; }
export interface Desk { desk: number; ticket: Ticket | null; }
export interface Stats { waiting: number; attending: number; completed: number; current: { number: number; desk: number } | null; }
