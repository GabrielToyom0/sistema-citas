# Sistema de Citas Médicas — Prototipo EDA

Prototipo de Arquitectura Orientada a Eventos (ISWI 2026, URL). Al agendar una cita, la API la registra junto con el evento `CitaAgendada` (patrón outbox) y responde de inmediato. RabbitMQ entrega el evento **de forma asíncrona** a dos consumidores independientes:

- **Notificaciones** envía el correo de confirmación.
- **Recordatorios** programa el recordatorio y, cuando vence, publica `RecordatorioVencido`, que Notificaciones convierte en correo.

```
Portal (nginx) ──HTTP──▶ API de Citas ──tx──▶ CitasDB (citas + outbox)
                              │ relay (confirms)
                              ▼
                    RabbitMQ  citas.events (topic)
                     ├─▶ notificaciones.q ─▶ Notificaciones ─▶ MailHog
                     └─▶ recordatorios.q  ─▶ Recordatorios ─▶ RecordatoriosDB
                                                  └─ RecordatorioVencido ─▶ citas.events
```

## Requisitos

- Docker Desktop con al menos 4 GB de RAM asignados (SQL Server necesita 2 GB).
- Node.js 24 LTS (solo para pruebas y lint locales).

## Levantar el entorno

```bash
cp .env.example .env
docker compose up -d --build
```

| Servicio | URL |
|---|---|
| Portal | http://localhost:8080 |
| API | http://localhost:3000/health |
| RabbitMQ (consola) | http://localhost:15672 |
| MailHog (correos) | http://localhost:8025 |
| SQL Server | `localhost,14333` |

## Pruebas y lint

```bash
npm ci
npm test
npm run lint
```

## Estructura

```
sistema-citas/
├── packages/shared/          # M1  contrato de eventos, topología, cliente AMQP, poller
├── services/
│   ├── api-citas/            # M2  productor (src/outbox/ es de M3)
│   ├── notificaciones/       # M4  consumidor 1
│   └── recordatorios/        # M5  consumidor 2
├── web/
│   ├── portal/               # M3  HTML + JS sin framework
│   └── nginx/                # M3  proxy /api y cabeceras de seguridad
├── db/                       # scripts SQL por base de datos (ejecutados por db-init)
├── docs/                     # Kanban, kanban.csv y guion de la demo
├── .github/                  # CI, CODEOWNERS, plantilla de PR
├── Dockerfile                # imagen común (--build-arg SERVICIO=...)
└── docker-compose.yml
```

## Equipo

| Módulo | Responsable |
|---|---|
| M1 Plataforma | Gabriel Toyom |
| M2 API de Citas | Sophia Corea |
| M3 Portal Web + Relay | Javier Monje |
| M4 Notificaciones | Ruddy Cuyán |
| M5 Recordatorios | Nery Herrera |

Ver [CONTRIBUTING.md](CONTRIBUTING.md), [docs/KANBAN.md](docs/KANBAN.md) y [docs/DEMO.md](docs/DEMO.md).
