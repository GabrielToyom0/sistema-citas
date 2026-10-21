# Evidencia K-04 — El CI bloquea un PR con pruebas rotas

**Responsable:** Gabriel Toyom · **Fecha:** 14/10/2026 · **Requisito:** proceso de integración continua (calidad)

## Objetivo

Demostrar el criterio de aceptación de K-04: **un PR con una prueba rota queda bloqueado**. El pipeline `CI` (`.github/workflows/ci.yml`) debe fallar en el check `verificar` y la regla de protección de `main` debe impedir la fusión.

## Pasos ejecutados

1. Rama con un test que falla a propósito:

```bash
git switch -c test/K-04-ci-roto
# packages/shared/test/ci-roto.test.js -> test('prueba de CI: debe fallar', () => assert.equal(1, 2))
git add packages/shared/test/ci-roto.test.js
git commit -m "test(ci): test roto a propósito para verificar bloqueo (no fusionar)" -m "Refs: K-04"
git push -u origin test/K-04-ci-roto
```

2. Se abrió el PR [#3 — [NO FUSIONAR] Prueba de CI — K-04](https://github.com/GabrielToyom0/sistema-citas/pull/3).
3. Se esperó la ejecución del CI y se tomó la captura del estado del PR.
4. Se cerró el PR **sin fusionar** y se eliminó la rama:

```bash
git switch main
git branch -D test/K-04-ci-roto
git push origin --delete test/K-04-ci-roto
```

## Resultado

| Verificación | Esperado | Obtenido |
|---|---|---|
| Ejecución del CI | El workflow se dispara automáticamente al abrir el PR | Se ejecuta el evento `pull_request` |
| Paso que falla | `npm test` falla por `ci-roto.test.js` | `npm ci` Pasa · `npm run lint` Pasa · **`npm test` Falla** · auditoría y validación de compose omitidas |
| Check `verificar` | En rojo y marcado como obligatorio | *All checks have failed*: `CI / verificar (pull_request)` — *Failing after 11s*, etiqueta **Required**; el commit aparece con **Blocked** |
| Fusión | Bloqueada | *Merging is blocked* y el botón **Merge pull request** deshabilitado; la regla también exige 1 aprobación (*Review required*) |
| Destino del PR | No se fusiona | Cerrado sin fusionar; `main` no recibió el test roto |

Captura del PR #3 con el CI en rojo y la fusión bloqueada:

![PR #3: check verificar fallido (Required) y Merging is blocked](CI-CD%20Bloquea%20PR.jpeg)

## Conclusión

- [x] Cumple el criterio de aceptación
- Observaciones: la captura muestra la casilla *Merge without waiting for requirements to be met (bypass rules)*, disponible solo para el administrador del repositorio. Para los demás integrantes la fusión queda bloqueada.
