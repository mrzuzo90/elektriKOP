---
description: Regla permanente de commit y push automático tras verificar cambios
---

# Commit y Push Automático

**Directriz permanente del usuario:**
Siempre que se implemente una funcionalidad, refactor o corrección de bugs en ElektriKOP y se verifique que funciona correctamente, se debe realizar commit y push a `origin main` de manera automática, sin pedir confirmación interactiva previa `(y/n)`.

### Pasos de Verificación Obligatorios:
1. `npm test` (100% tests pasando)
2. `npm run lint` (0 errores, 0 warnings)
3. `npm run build` (código de salida 0)
4. `git add` y `git commit -m "<tipo>: <mensaje descriptivo>"`
5. `git push origin main`

Si alguna de las pruebas o el build falla, corregir primero y NUNCA commitear código roto.
