# ElektriKOP — Reglas y Memoria del Proyecto

Este archivo define las directrices y memoria permanente para cualquier agente de IA (Antigravity, Gemini, etc.) que trabaje en este repositorio.

## Directiva de Git: Commit y Push Automático

**Orden permanente del usuario:**
Siempre que se implemente una funcionalidad, refactor o corrección de bugs y se verifique que funciona correctamente, se debe realizar commit y push a `origin main` de manera automática, sin esperar confirmación interactiva previa `(y/n)`.

### Protocolo de Verificación Obligatorio:
1. **Tests unitarios:**
   ```bash
   npm test
   ```
   Todos los tests deben pasar al 100%.
2. **Linter:**
   ```bash
   npm run lint
   ```
   0 errores y 0 warnings (`oxlint`).
3. **Build de producción:**
   ```bash
   npm run build
   ```
   La compilación con Vite debe completar con código 0.
4. **Commit y Push:**
   ```bash
   git add <archivos relevantes>
   git commit -m "<tipo>: <descripción clara siguiendo Conventional Commits>"
   git push origin main
   ```
5. **Informe al usuario:**
   Indicar el commit realizado, los archivos tocados y confirmar que el push a `main` se ha completado.

> [!CAUTION]
> Si `npm test`, `npm run lint` o `npm run build` arrojan cualquier fallo, **NUNCA** hacer commit ni push. Subsanar el error primero y volver a verificar el ciclo completo.
