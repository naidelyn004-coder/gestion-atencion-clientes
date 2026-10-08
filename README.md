# Atención.uno — gestión de turnos y atención a clientes

Aplicación de turnero con API Flask, persistencia SQLite y cliente Angular. Incluye una pantalla pública para emitir turnos y consultar el turno que se atiende, además de un panel de operador para gestionar las cuatro mesas.

## Requisitos

- Python 3.10 o superior.
- Node.js 22.22.3 o superior (compatible con Angular 22).
- npm incluido con Node.js.

## Estructura

```text
backend/
  app.py
  requirements.txt
frontend/
  angular.json
  package.json
  src/app/
    app.component.ts
    models.ts
    pages/public-screen.component.ts
    pages/operator-panel.component.ts
    services/ticket.service.ts
  src/main.ts
  src/styles.css
.gitignore
README.md
```

## Iniciar el backend

En una terminal, desde la carpeta del proyecto:

**Windows PowerShell**

```powershell
cd backend
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

**macOS / Linux**

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

La API queda disponible en `http://localhost:5000`. La base `backend/tickets.db` se crea automáticamente al iniciar.

## Iniciar Angular

En otra terminal:

```bash
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`. La navegación superior alterna entre la pantalla pública y el panel de operadores. La pantalla pública y el panel de operadores se actualizan automáticamente cada 2,5 segundos mediante polling RxJS. Desde la pantalla pública se generan turnos; en una mesa libre, **Siguiente / Llamar turno** toma el turno abierto más antiguo. Al terminar, **Atendido / Liberar mesa** completa el turno y deja la mesa disponible.

## API

| Método | Ruta | Acción |
|---|---|---|
| `GET` | `/api/health` | Estado del servicio |
| `POST` | `/api/tickets` | Crea turno con estado `open` |
| `GET` | `/api/tickets` | Lista turnos recientes |
| `GET` | `/api/desks` | Estado de las cuatro mesas |
| `POST` | `/api/desks/{mesa}/call-next` | Asigna el turno `open` más antiguo y cambia su estado a `attending` |
| `POST` | `/api/tickets/{id}/complete` | Completa turno y libera la mesa |
| `GET` | `/api/stats` o `/api/statistics` | Estadísticas y conteo de espera |

`GET /api/stats` expone `waiting` y `waiting_count`, calculados con `SELECT COUNT(*) FROM tickets WHERE status = 'open'`, junto con turnos atendidos, completados y la llamada actual. Una mesa ocupada no puede llamar otro turno hasta completar el que está atendiendo. Los cambios de asignación son transaccionales para impedir que dos mesas tomen el mismo turno.

## Estados y flujo

`open` (en espera) → `attending` (asignado a Mesa 1–4) → `completed` (atendido y mesa liberada). El número de turno es correlativo y el siguiente turno se obtiene en orden de llegada.


## Despliegue público en Render

El archivo `render.yaml` configura un único servicio web gratuito. Render construye Angular dentro de Docker y sirve la interfaz y la API Flask bajo el mismo dominio; no hace falta configurar una URL de API externa. Después de conectar este repositorio en Render, el Blueprint crea el servicio `gestion-atencion-clientes` y publica la URL que Render asigne.

El plan gratuito puede suspender el servicio tras inactividad y su sistema de archivos es temporal. Como SQLite guarda `backend/tickets.db` en ese sistema, los turnos pueden perderse al reiniciar, suspender o volver a desplegar. Para conservar datos de forma duradera, se debe migrar a una base gestionada como PostgreSQL; esa configuración puede implicar coste.

