# 📋 Pendientes GrowthSuite

> Última actualización: 2026-04-03

---

## 🔴 Urgente

### Roles por restaurante (Opción B)
**Status:** Quick fix deployado (PR #51), rediseño pendiente

**Problema:** Los roles son globales (`restaurant_id = null`). Todos los restaurantes ven los 11 roles incluyendo Churrasqueiro, Jefe de Barra, etc. Un taquero ve "Churrasqueiro" — no tiene sentido.

**Fix temporal (ya hecho):**
- Churrasqueiro movido a `restaurant_id = 40` (Fogo) en prod y dev
- Backend filtrado: `GET /api/roles` ahora devuelve globales + custom del restaurante
- PR #51 pendiente de merge a dev → main

**Rediseño pendiente (Opción B):**
1. Al crear restaurante → clonar 7 roles estándar (Dueño, Gerente, Capitán, Chef, Mesero, Cajero, Hostess) con `restaurant_id = N`
2. `GET /api/roles` filtra por `restaurant_id` del usuario
3. El dueño puede crear roles custom desde Permisos (ya existe con `base_role_id`)
4. Templates por tipo de negocio (Opción C) para multi-vertical futuro

**Opciones descartadas:**
- Opción A (is_default flag): No escala, sigue siendo global
- Frontend filter: Esconde para todos incluyendo Fogo

**Contexto técnico:**
```ts
// Fix actual en roles_controller.ts
const query = Role.query()
  .where(q => {
    q.whereNull('restaurant_id')
      .orWhere('restaurant_id', user.restaurantId)
  })
  .orderBy('level', 'desc')
```

```sql
-- DB changes ya aplicados
-- Prod: UPDATE roles SET restaurant_id = 40 WHERE code = 'churrasqueiro'
-- Dev:  UPDATE roles SET restaurant_id = 9  WHERE code = 'churrasqueiro'
```

---

### devJampier55 — Unificación de clientes (NO MERGEAR AÚN)
**Status:** Code review completado, 8 issues encontrados

**Issues críticos:**
1. 🔴 `coupon_redemptions` tabla no existe en prod → endpoints de cupones dan 500
2. 🔴 Migraciones duplicadas de coupons (009 vs 012) → conflictos
3. 🟡 Modelo Customer incompleto (sin campos fiscales)
4. 🟡 DELETE customer falla con RESTRICT FK
5. 🟢 Customer duplicado inline en reservation model
6. 🟡 snake_case vs camelCase en respuestas de guests
7. 🟢 Race condition en stats de customer
8. 🟡 Falta unique por tax_id para dedup fiscal

**Acción:** Comunicar a Jampier los issues 1 y 2 para que los corrija antes de mergear.

---

## 🟡 Próximos

- [ ] Mergear PR #51 (roles filter) a dev → main
- [ ] Configurar Finca Robles completo (usuarios, menú, etc.)
- [ ] Resolver issues de devJampier55 con Jampier
- [ ] Rediseño completo de roles (Opción B) cuando haya tiempo

---

## Links
- [[00 - Mapa de Vision]]
- [[GrowthSuite - 3 Pilares Reconstruidos]]
