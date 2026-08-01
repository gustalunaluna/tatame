# 15 — Estrutura de APIs

Não há servidor de aplicação. O cliente fala direto com o Postgres via PostgREST,
e toda regra que não pode ser burlada mora no banco.

## 15.1 As três formas de acesso

| Forma | Quando | Segurança |
|---|---|---|
| **Tabela direta** (`from('trainings')`) | CRUD do próprio dado | RLS |
| **Função RPC** (`rpc('perfil_publico')`) | Leitura agregada, ou escrita com regra | `SECURITY DEFINER` + grant explícito |
| **Storage** | Foto de perfil, brasão | Política de bucket |

**A regra de escolha:** se a operação envolve dado de mais de uma pessoa, ou tem
regra que o cliente não pode decidir, vira RPC. Caso contrário, tabela direta com
RLS.

## 15.2 As 26 funções

### Perfil e busca

| Função | Devolve | Notas |
|---|---|---|
| `perfil_publico(handle)` | O cartão completo de alguém | Inclui `papel`, `instrutor`, `mestres`, `sou_eu`, `e_meu_parceiro` |
| `buscar_por_handle(termo)` | Um cartão, ou nada | **Só @ exato.** Sem busca parcial, por decisão |
| `cartao_publico(ids[])` | Vários cartões | Para listas |
| `destaques_publicos(user)` | Conquistas em destaque | |

### Parceria e rola

| Função | Devolve / faz | Notas |
|---|---|---|
| `responder_parceria(parceria, aceita)` | Aceita ou recusa | Só o addressee |
| `resumo_parceiros()` | Placar por parceiro | Respeita o prazo de 7 dias |
| `registros_a_confirmar()` | Pendentes, com `dias_restantes` | |
| `responder_registro(id, confirma)` | Confirma ou contesta | Só o parceiro marcado |
| `salvar_parceiros_do_treino(treino, jsonb)` | Salva a lista | **Diferencial**: compara com o que havia e só mexe no que mudou |
| `parceiros_do_treino(treino)` | A lista de um treino | |
| `parceiros_publicos(user, limite)` | Parceiros de alguém | Paginada |

### Academia

| Função | Devolve / faz |
|---|---|
| `perfil_equipe(slug)` | O cartão da academia, com totais |
| `pedir_equipe(team)` | Cria vínculo pendente |
| `membros_da_equipe(team)` | Membros, para o dono |
| `atletas_da_equipe(team, limite, offset)` | Lista pública, paginada |
| `graduados_da_equipe(team)` | Quem graduou ali |
| `resumo_de_mestre(handle)` | Se comanda academia, e quantos alunos |
| `alunos_do_mestre(handle, limite, offset)` | Os alunos, paginado |

### Linhagem

| Função | Devolve |
|---|---|
| `mestres_de(handle)` | Todos os vínculos, principal primeiro |
| `linhagem_de(handle)` | A corrente, um por nível, do 0 para cima |

### Conquistas e plano

| Função | Devolve / faz |
|---|---|
| `achievement_stats()` | Totais e desbloqueadas |
| `recalcular_conquistas()` | Recalcula e devolve quantas abriram |
| `semear_conquistas()` | Copia o catálogo para quem ainda não tem |
| `objetivos_disponiveis()` | Objetivos por faixa |
| `iniciar_ciclo(objetivo)` | Abre um ciclo de quatro semanas |
| `encerrar_ciclo(ciclo)` | Fecha |

### Medalhas

| Função | Devolve |
|---|---|
| `medalhas_do_atleta(handle, so_destaque)` | Lista |
| `resumo_medalhas_do_atleta(handle)` | Totais por colocação |
| `medalhas_da_equipe(slug)` | Com o nome de quem ganhou |
| `resumo_medalhas_da_equipe(slug)` | Ouro/prata/bronze |
| `ocultar_medalha_da_equipe(id)` | Tira da vitrine da academia, mantém no atleta |

### Graduação

| Função | Devolve |
|---|---|
| `historico_de_graduacao(handle)` | A escada, com quem entregou |

## 15.3 O padrão de segurança

Toda função nova precisa das quatro linhas:

```sql
create or replace function public.minha_funcao(p_arg text)
returns table (...)
language sql stable
security definer                    -- 1. roda com os privilégios do dono
set search_path to 'public'         -- 2. imune a shadowing de schema
as $$ ... $$;

revoke execute on function public.minha_funcao(text) from public, anon;
grant  execute on function public.minha_funcao(text) to authenticated;
```

**As duas armadilhas, de novo:**

1. `revoke ... from public` **não** remove a concessão do `anon` — o Supabase a dá
   por privilégio padrão. Precisa de `anon` explícito.
2. Sem `set search_path`, um schema no caminho de busca pode sequestrar a
   resolução de nomes dentro de uma função `SECURITY DEFINER`.

As migrações 005 e 011 existem só para fechar isso em funções antigas.

## 15.4 Contratos de exemplo

### `perfil_publico(handle)`

```
IN   p_handle : text   -- com ou sem @, case-insensitive

OUT  user_id, handle, nickname, bio, belt, degrees, photo_url,
     verificado, idade, gym, master,
     team_id, team_name, team_crest, team_status, team_slug,
     master_handle, master_nickname,
     fights_won, fights_lost,
     treinos, parceiros, conquistas_total, conquistas_feitas,
     sou_eu, e_meu_parceiro,
     papel, instrutor, mestres
```

Observações de contrato:

- `idade` vem de `birth_date`, mas a **data de nascimento nunca sai**. Só a idade.
- `sou_eu` e `e_meu_parceiro` são calculados contra `auth.uid()` — a mesma consulta
  responde diferente para pessoas diferentes.
- Metas, plano, pontos fracos e análises **não saem**: são privados.

### `linhagem_de(handle)`

```
IN   p_handle : text

OUT  nivel     int      -- 0 é a própria pessoa
     handle    text     -- '' quando não tem conta
     nome      text
     belt      text     -- '' quando não tem conta
     graus     int
     foto      text
     verificado boolean
     tem_conta boolean
```

Garantias: ordenado por `nivel`; no máximo 20 níveis; sem ciclo.

### `salvar_parceiros_do_treino(treino, jsonb)`

Recebe a lista inteira e faz o diferencial:

```
  o que sumiu   ──▶ delete
  o que é novo  ──▶ insert  (pendente)
  o que mudou   ──▶ update  (e o gatilho reabre a confirmação)
  o que ficou   ──▶ nada
```

Enviar a lista inteira e recriar tudo pareceria mais simples e destruiria as
confirmações já feitas.

## 15.5 O cliente

`@supabase/supabase-js`, com TanStack Query por cima.

```ts
export function useLinhagemDe(handle: string | undefined) {
  const limpo = (handle ?? "").trim().toLowerCase().replace(/^@+/, "");
  const query = useQuery({
    queryKey: ["linhagem_de", limpo],
    enabled: limpo.length >= 3,
    queryFn: async () => { /* rpc + mapeamento snake_case → camelCase */ },
  });
  return { linhagem: query.data ?? [], acima: ..., ready: query.isSuccess };
}
```

Três convenções:

1. **`enabled`** evita chamada com argumento vazio
2. **Mapeamento explícito** de `snake_case` para `camelCase` na fronteira — o resto
   do app nunca vê nome de coluna
3. **Invalidação por família de chave** nas mutações

### Chave pública

Só a chave **publicável** (`sb_publishable_*`) vai para o cliente. Ela é pública
por natureza e protegida por RLS.

A chave `service_role` **nunca** entra no cliente, nem em variável de build, nem
em teste. Ela ignora RLS inteiramente.

## 15.6 Buracos conhecidos

| Buraco | Impacto |
|---|---|
| Não há paginação por cursor — tudo é limite + offset | Baixo hoje; ruim se uma academia passar de 10 mil |
| Não há versionamento de contrato | Médio — mudar `perfil_publico` quebra clientes antigos de PWA em cache |
| Sem rate limit por usuário | Baixo — o Supabase tem o dele |
| Sem verificação de vínculo de mestre | **Alto** — ver capítulo 06 |
