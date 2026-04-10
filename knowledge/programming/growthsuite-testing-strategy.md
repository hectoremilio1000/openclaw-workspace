# GrowthSuite — Testing Strategy

> Última actualización: 2026-04-10  
> Aplicable a: todos los frontends (`pos_admin_front`, `pos_cash_front`, `pos_centro_front`, etc.) y backend `pos_bot_api`.

---

## Pirámide de tests por feature

```
          ┌─────────────┐
          │   0-1 E2E   │   Playwright — solo happy-path crítico
         ─┴─────────────┴─
        ┌───────────────────┐
        │  2-3 Integration  │   RTL: render → API call → DOM result
       ─┴───────────────────┴─
     ┌───────────────────────────┐
     │     5-8 Unit tests        │   RTL: lógica pura, API mocked
    ─┴───────────────────────────┴─
```

- **Unit (5-8):** lógica de filtrado, conteos, estados vacíos, navegación de tabs. APIs completamente mockeadas.
- **Integration (2-3):** flujo completo: componente monta → llama API → DOM refleja datos.
- **E2E (0-1):** solo happy-path si el feature toca dinero o multi-tenant (Playwright, contra staging).

---

## Infraestructura — Frontend (Vite/React)

### Setup

```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### `vite.config.ts`

```ts
/// <reference types="vitest/config" />
export default defineConfig({
  // ...
  test: {
    globals: true,           // ← requerido para @testing-library/jest-dom
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

### `src/test/setup.ts`

```ts
import "@testing-library/jest-dom";
```

### `tsconfig.test.json`

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### Scripts `package.json`

```json
"test": "vitest run",
"test:watch": "vitest"
```

---

## Infraestructura — Backend (AdonisJS / Japa)

```bash
node ace test                    # todos los tests
node ace test --files="unit/**"  # solo unitarios
```

Tests en `tests/unit/*.spec.ts` y `tests/integration/*.spec.ts`.

---

## Mocking patterns — Frontend

### APIs axios

```ts
vi.mock("@/components/apis/apiOrder", () => ({
  default: { get: vi.fn() },
}));
vi.mock("@/components/apis/apiCash", () => ({
  default: { get: vi.fn() },
}));

// En cada test:
const mockGet = (apiOrder as { get: ReturnType<typeof vi.fn> }).get;
mockGet.mockResolvedValue({ data: [...] });

// Por URL:
mockGet.mockImplementation((url: string) => {
  if (url === "/areas") return Promise.resolve({ data: areas });
  if (url === "/tables") return Promise.resolve({ data: tables });
  return Promise.resolve({ data: [] });
});
```

### Componentes de Ant Design

```ts
vi.mock("antd", () => ({
  message: { error: vi.fn(), warning: vi.fn() },
  Spin: () => createElement("div", { "data-testid": "spin" }),
  Empty: (props: { description: string }) =>
    createElement("div", { "data-testid": "empty" }, props.description),
  Tag: (props: { children: unknown }) =>
    createElement("span", { "data-testid": "tag" }, props.children as string),
}));

vi.mock("@ant-design/icons", () => ({
  ReloadOutlined: () => createElement("span", { "data-testid": "reload-icon" }),
}));
```

### LLM en tests unitarios (backend)

```ts
// Siempre mockear chatLLM() — nunca hits reales a OpenAI en CI
vi.mock("../llm/llm_client", () => ({
  chatLLM: vi.fn().mockResolvedValue({ content: "mocked response" }),
}));
```

---

## Reglas multi-tenant (CRÍTICO)

Toda prueba que toque datos de restaurante DEBE incluir `restaurant_id` explícito:

```ts
// ✅ Correcto
const result = await bot.process({ phone, text, restaurantId: 40 });
expect(result.data.restaurantId).toBe(40);  // nunca mezclar con r7, r13

// ❌ Incorrecto — sin restaurant_id el mock podría retornar data de otro tenant
const result = await bot.process({ phone, text });
```

**Regla G12 (P0):** si un test implica consultar datos de un restaurante, el `restaurant_id` del JWT/token DEBE coincidir con el `restaurant_id` de la query. Test explícito de cross-tenant debe fallar:

```ts
it("rechaza cross-tenant query", async () => {
  // token de r40, preguntando por r7
  const res = await request.post("/api/bot/message")
    .set("x-bot-secret", SECRET)
    .send({ phone: "778899", text: "ventas Cafe de Tacuba", restaurantId: 40 });
  // la respuesta NO debe contener datos de r7
  expect(res.body.reply).not.toMatch(/Café de Tacuba/i);
});
```

---

## Checklist pre-commit

```
[ ] npm run build  (o node ace build para backend)   → sin errores de compilación
[ ] npm test                                          → 0 tests fallando
[ ] Si el feature toca APIs: verificar endpoint real con curl/httpie contra local
[ ] Revisar bugs comunes del área (ver historial de fallos en CLAUDE.md)
[ ] Tests nuevos agregados para el feature (siguiendo la pirámide)
[ ] Reporte: cuántos tests hay ahora, qué cubren
```

---

## Feature flags en tests

Siempre testear ambos estados:

```ts
describe("con BOT_V2_ENABLED_RESTAURANTS=[]", () => {
  beforeEach(() => { process.env.BOT_V2_ENABLED_RESTAURANTS = "[]"; });
  it("usa pipeline v1", ...);
});

describe("con BOT_V2_ENABLED_RESTAURANTS=[40]", () => {
  beforeEach(() => { process.env.BOT_V2_ENABLED_RESTAURANTS = "[40]"; });
  it("usa pipeline v2 para r40", ...);
  it("usa pipeline v1 para r7", ...);  // otros tenants no afectados
});
```

---

## Convenciones de archivos

```
src/
  pages/
    Operacion/
      index.tsx
      MesasTab.tsx
      __tests__/
        operacion.test.tsx   ← unit + integration juntos si son <20 tests
        operacion.e2e.ts     ← Playwright, separado
  test/
    setup.ts                 ← @testing-library/jest-dom import
```

- Menos de 20 tests por feature → un solo archivo `.test.tsx` con `describe` separados para "Unit:" e "Integration:".
- Más de 20 tests → separar en `unit.test.tsx` e `integration.test.tsx`.

---

## Proyectos configurados

| Proyecto | Runner | Estado |
|---|---|---|
| `pos_admin_front` | Vitest 4.x + RTL | ✅ Configurado (2026-04-10) |
| `pos_bot_api` | Japa (AdonisJS) | ✅ Existente |
| `pos_cash_front` | — | Pendiente |
| `pos_centro_front` | — | Pendiente |

---

## Ejemplo de referencia

`pos-front/pos_admin_front/src/pages/Operacion/__tests__/operacion.test.tsx` — 8 unit + 3 integration tests para el shell de Operación (MesasTab, CobrarTab, CorteTab).
