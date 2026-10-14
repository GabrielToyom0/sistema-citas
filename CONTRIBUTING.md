# Guía de contribución

## Flujo de trabajo (GitHub Flow)

1. Revisar la siguiente tarjeta asignada en el Kanban (`docs/kanban.xlsx`) y su fecha en el plan de commits (compartido por Gabriel).
2. Crear una rama desde `main` actualizado: `tipo/K-NN-descripcion-corta`.
3. Hacer commits pequeños y frecuentes **con tu propia cuenta** (ver abajo).
4. Abrir un PR con el título y la descripción de la guía de pull requests (compartida por Gabriel); lo aprueba otro integrante (CODEOWNERS) y el CI debe estar en verde.
5. Fusionar con **Create a merge commit** (no *squash*) para conservar los commits de cada integrante en el historial. Borrar la rama. Gabriel refleja el avance en el Kanban en su siguiente push (solo él modifica `docs/kanban.xlsx`).

`main` está protegida: no se permite push directo (excepto el commit inicial del 12/10, ver el plan).

## Identidad de cada integrante

Cada quien hace commits desde su equipo y con su cuenta, para que el historial evidencie el trabajo individual:

```bash
git config user.name "Nombre Apellido"
git config user.email "correo-de-tu-cuenta-github@ejemplo.com"
```

## Commits: Conventional Commits

Formato: `tipo(alcance): descripción en imperativo`. La última línea referencia la tarjeta.

```
feat(api-citas): registrar cita y evento en outbox en una transacción

Refs: K-11
```

| Tipo | Uso |
|---|---|
| `feat` | Funcionalidad nueva |
| `fix` | Corrección de un error |
| `test` | Pruebas |
| `docs` | Documentación |
| `refactor` | Cambio interno sin cambiar comportamiento |
| `chore` / `ci` / `build` | Configuración, pipeline, Docker |

**Alcances:** `shared`, `infra`, `ci`, `db`, `api-citas`, `relay`, `portal`, `notificaciones`, `recordatorios`, `docs`.

## Plan de commits por integrante

Qué sube cada integrante, en qué fecha, en qué rama y con qué mensaje está en el plan de commits que Gabriel compartió con el equipo (`Plan-de-commits.html`). El texto de cada PR y el comentario del revisor están en `Pull-requests.html`.

## Antes de abrir un PR

```bash
npm ci
npm run lint
npm test
```

## Uso de IA

El código base se generó con Claude (Anthropic) como punto de partida. Cada responsable debe revisarlo, modificarlo cuando haga falta y poder explicarlo sin la herramienta (tarjetas K-03, K-08, K-13, K-18 y K-23). Declarar en el PR cualquier uso adicional de IA.
