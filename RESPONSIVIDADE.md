# Auditoria de Responsividade — chemarauto

Data: 06/09/2026

## Metodologia

- Análise **estática** do HTML, CSS e JS (estilos inline, media queries existentes, wrappers, modais, grids), arquivo por arquivo, nas pastas `public/`.
- **Não foi possível renderizar em navegador real / DevTools nesta sessão** (sem ferramenta de browser disponível). Todos os pontos abaixo são conclusões de análise de código; os itens "não verificado" no final precisam de confirmação manual com `Ctrl+Shift+I` → modo dispositivo em 320 / 375 / 768 / 1024 / 1280.
- Critérios usados: sem scroll horizontal **na página**; tabelas com scroll próprio (`.table-responsive`); modais em telas <576px em largura total com scroll interno; quebra de textos longos (`overflow-wrap`); alvo de toque razoável para botões de linha.

## Matriz Telas × Larguras (análise estática)

| Tela | 320px | 375px | 768px | 1024px | 1280px |
| --- | :-: | :-: | :-: | :-: | :-: |
| Login | OK | OK | OK | OK | OK |
| Dashboard | OK | OK | OK | OK | OK |
| Consulta Placa (detalhe) | OK | OK | OK | OK | OK |
| Pedidos — Pendentes | OK | OK | OK | OK | OK |
| Pedidos — Atenção / Entregas / Urgentes | OK | OK | OK | OK | OK |
| Ver Pedido (modal) | OK | OK | OK | OK | OK |
| Editar Pedido (modal) | OK | OK | OK | OK | OK |
| Veículos / Marcas / Modelos | OK | OK | OK | OK | OK |
| Peças & Serviços | OK | OK | OK | OK | OK |
| Fornecedores | OK | OK | OK | OK | OK |
| Usuários | OK | OK | OK | OK | OK |
| Auditoria | OK | OK | OK | OK | OK |
| Gerar Ordens de Compra (modal) | OK | OK | OK | OK | OK |
| KPI Detalhado (modal) | OK | OK | OK | OK | OK |
| Relatório Período (modal) | OK | OK | OK | OK | OK |
| Troca de Senha (modal) | OK | OK | OK | OK | OK |

"OK" = sem overflow de página; conteúdo cabe ou rola internamente de forma prevista (tabela com scroll próprio, tabs com scroll horizontal, modal full-width).

## Problemas encontrados e corrigidos

### 1. Filtros das listas não ocupavam 100% da largura em celulares
`public/css/style.css` (bloco `@media (max-width: 575.98px)`, linhas 680–705)

Os seletores anteriores miravam só filhos diretos da toolbar (`> .input-group`), mas os inputs ficam **aninhados** dentro de `.d-flex` (Padrão usado em Pedidos, Atenção, Entregas, Urgentes, Veículos, Peças etc.). Resultado: em <576px os filtros não viravam linha única/largura total.
- Seletor ampliado para cobrir o `.d-flex` interno.
- Divs filhos diretos recebem `flex: 1 1 100%` (empilham a coluna); wrappers vazios são ocultados.
- `.input-group` / `.form-select` passam a `width: 100% !important` (vence o `width:auto` inline), com `min-width: 0`.
- `.form-control` / `.input-group-text` com `min-width: 0` (queima o limite mínimo do conteúdo).

### 2. Grid do histórico (Ver Pedido) podia estourar em 320px
`public/css/modal-pedido.css`

`.pm-history-item` usa `grid-template-columns: 130px auto 1fr auto` (linha ~604); com descrição longa, a coluna `1fr` não encolhia (`.min-width` auto) e empurrava o grid para fora da largura do modal.
- `.pm-history-desc { min-width: 0; overflow-wrap: anywhere; }` (linhas 628–633).
- Em <576px (linhas 724–728) o item re-organiza para `grid-template-columns: auto 1fr`: hora em linha cheia, status + usuário na 2ª linha e descrição em linha cheia quebrando livremente.

### 3. Textos dinâmicos longos sem quebra de palavra
`public/css/modal-pedido.css`
- `.pm-card-value` (linha 220) e `.pm-card-value-muted` (linha 228): + `min-width: 0; overflow-wrap: anywhere;` (veículos/modelos descritivos longos).
- `.pm-oc-label` (linha 429): + `min-width: 0; overflow-wrap: anywhere;` (lista de números de OC).
- `.pm-info-item-value` (linha 521): + `min-width: 0; overflow-wrap: anywhere;` (fornecedor/observações/placa).

### 4. Header dos cards de OC (Gerar OC) podia estourar em 320px
`public/css/style.css`, linhas 709–716 (`@media (max-width: 575.98px)`)
- `.oc-group-card .card-header { flex-wrap: wrap; }` + filhos com `min-width: 0; overflow-wrap: anywhere;` → descrições longas + badge quebram em vez de transbordar o modal.

### 5. Botões de ação de linha com alvo de toque muito pequeno
`public/css/style.css`, linha 664 (`@media (max-width: 575.98px)`)
- `.table-actions .btn { padding: .35rem .5rem; font-size: .8rem; }` — altura de toque sobe de ~26px para ~34px (recomendação 40px é mantida como meta de futura otimização, ver pendências).

### 6. Modal "Alteração de Senha" sem scroll interno
`public/index.html`, linha 148
- Adicionado `modal-dialog-scrollable` (necessário em telas curtas/orientação paisagem).

## Itens já corretos (nenhuma mudança)

- **Tabelas:** todas as 15 `<table>` estão em `.table-responsive` / `.pm-table-wrap` (app.js linhas 571, 1024, 1562, 1660, 1722, 1795, 1869, 2005, 2078, 2145, 2231, 2417, 3063, 3173 e 3374) → scroll horizontal próprio, sem afetar a página.
- **Gráficos:** ambos `new Chart(...)` (app.js 1166 e 1214) usam `responsive: true` + `maintainAspectRatio: false`; contêiner com altura fixa (220px).
- **Modais dinâmicos:** helper `modal()` (app.js:271) já usa `modal-dialog-centered modal-dialog-scrollable`. Modal Ver Pedido / Editar (`pm-dialog`): em <576px vira `width:100%; height:100dvh` com `.pm-body { overflow-y:auto }` (modal-pedido.css 691–692, 112–116).
- **Layout geral:** `body{overflow:hidden}` + `main-content{overflow-y:auto}` → overflow-x da área rola só internamente, nunca a página.
- **Sidebar / notificações:** `max-width: 85vw` e `.notif-menu { width: calc(100vw - 20px) }` em <576px (style.css 658, 677).
- **Login:** media queries próprias (login.css, incl. bloco ≤380px), card `max-width:480px`.
- **KPI:** valores com `clamp()` + unidade `cqw` + `overflow-wrap:anywhere` (dashboard.css 169); grid colapsa por breakpoints existentes.
- **Tabs do Ver Pedido:** scroll horizontal em <768px; grids `pm-*` colapsam para 1 coluna em <576px.
- **Consulta Placa:** card com `overflow-x:auto` em <768px e tabela interna `min-width:560px` (dashboard.css 856–858).

## Pendências / não verificado (requer browser real)

| Item | Motivo |
| --- | --- |
| Renderização real em 320/375/768/1024/1280 | Sem browser/DevTools nesta sessão — confirmar a matriz acima em modo dispositivo. |
| Strings longas **sem espaço** dentro de células de tabela | Vão alargar a tabela e rolar no wrapper (comportamento aceito do `.table-responsive`); se quiserem "quebrar", aplicar `overflow-wrap:anywhere` nas `<td>` — envolve mudança em todos os templates. |
| Alvo de toque de 40px em **dispositivo físico** | Atingir 40px em botões inline de tabela aumenta o peso visual/desktop; feito ajuste para ~34px em <576px, deixando 40px como meta futura. |
| Orientação paisagem em celular (ex.: 568×320) | Modais têm scroll interno (`.pm-body`/`modal-dialog-scrollable`); `.pm-dialog` ocupa 100% da altura — provável OK, não verificado visualmente. |
| Aparência de `overflow-wrap:anywhere` em cards do modal | Provável OK, confirmar visualmente em 320px. |