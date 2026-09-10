import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Icone } from "@/design/icones";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CampoNumero } from "@/components/CampoNumero";
import { usePerfil } from "@/lib/bjj-storage";
import {
  AJUSTE_DO_OBJETIVO,
  idadeEm,
  metaDeCalorias,
  metasDeMacro,
  OBJETIVOS,
  PROTEINA_POR_KG,
  taxaBasal,
  type Objetivo,
  type Sexo,
} from "@/lib/dieta";
import { useContaDaDieta, usePerfilDaDieta } from "@/lib/dieta-storage";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dieta_/ajustes")({
  head: () => ({
    meta: [
      { title: "Metas da dieta — Ponteira" },
      {
        name: "description",
        content:
          "Altura, objetivo e metas de caloria e proteína. O que a conta da dieta precisa e não muda todo dia.",
      },
    ],
  }),
  component: AjustesDaDietaPage,
});

const hoje = () => new Date().toISOString().slice(0, 10);

const SEXOS: { valor: Sexo; nome: string }[] = [
  { valor: "masculino", nome: "Masculino" },
  { valor: "feminino", nome: "Feminino" },
];

function AjustesDaDietaPage() {
  const { perfil, ready, salvar } = usePerfilDaDieta();
  const { perfil: perfilAtleta } = usePerfil();
  const conta = useContaDaDieta(hoje());

  const [alturaCm, setAlturaCm] = useState(perfil.alturaCm);
  const [sexo, setSexo] = useState<Sexo | null>(perfil.sexo);
  const [objetivo, setObjetivo] = useState<Objetivo>(perfil.objetivo);
  const [metaKcal, setMetaKcal] = useState(perfil.metaKcal ?? 0);
  const [metaProteinaG, setMetaProteinaG] = useState(perfil.metaProteinaG ?? 0);

  // O formulário começa vazio e o banco chega depois. Sem isto, quem abre a
  // tela com a conexão lenta vê os próprios dados serem substituídos por zero
  // e salva por cima do que já tinha.
  useEffect(() => {
    if (!ready) return;
    setAlturaCm(perfil.alturaCm);
    setSexo(perfil.sexo);
    setObjetivo(perfil.objetivo);
    setMetaKcal(perfil.metaKcal ?? 0);
    setMetaProteinaG(perfil.metaProteinaG ?? 0);
  }, [ready, perfil]);

  const idade = idadeEm(perfilAtleta?.birthDate ?? null, hoje());
  const peso = conta.pesoKg;

  /** A prévia usa o que está NO FORMULÁRIO, não o que está salvo. */
  const previa =
    sexo && peso !== null && idade !== null && alturaCm > 0
      ? (() => {
          const basal = taxaBasal(sexo, peso, alturaCm, idade);
          const gastoSemTreino = Math.round(basal * 1.2);
          const kcal = metaDeCalorias(
            objetivo,
            gastoSemTreino,
            metaKcal > 0 ? metaKcal : null,
          );
          return {
            basal,
            gastoSemTreino,
            macros: metasDeMacro(
              objetivo,
              peso,
              kcal,
              metaProteinaG > 0 ? metaProteinaG : null,
            ),
          };
        })()
      : null;

  const ajuste = AJUSTE_DO_OBJETIVO[objetivo];

  return (
    <PageShell title="Metas da dieta" subtitle="O que não muda todo dia.">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <Label htmlFor="dieta-altura">Altura</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <CampoNumero
                id="dieta-altura"
                valor={alturaCm}
                aoMudar={setAlturaCm}
                min={0}
                max={250}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">cm</span>
            </div>
          </div>

          <div>
            <Label>Sexo biológico</Label>
            <p className="text-xs text-muted-foreground">
              A fórmula da taxa basal muda 166 kcal entre os dois. É por isso que
              o campo existe.
            </p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {SEXOS.map((s) => (
                <button
                  key={s.valor}
                  type="button"
                  onClick={() => setSexo(s.valor)}
                  aria-pressed={sexo === s.valor}
                  className={cn(
                    "tap rounded-xl border p-2.5 text-sm font-bold active:scale-95",
                    sexo === s.valor
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground",
                  )}
                >
                  {s.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Objetivo</Label>
            <div className="mt-1.5 space-y-1.5">
              {OBJETIVOS.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => setObjetivo(o.valor)}
                  aria-pressed={objetivo === o.valor}
                  className={cn(
                    "tap block w-full rounded-xl border p-3 text-left active:scale-[0.99]",
                    objetivo === o.valor
                      ? "border-primary bg-primary/10"
                      : "border-border/60",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-bold",
                      objetivo === o.valor && "text-primary",
                    )}
                  >
                    {o.nome}
                    <span className="ml-1.5 font-mono text-xs tabular-nums font-medium text-muted-foreground">
                      {AJUSTE_DO_OBJETIVO[o.valor] === 0
                        ? "gasto"
                        : `gasto ${AJUSTE_DO_OBJETIVO[o.valor] > 0 ? "+" : "−"}${Math.round(
                            Math.abs(AJUSTE_DO_OBJETIVO[o.valor]) * 100,
                          )}%`}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {o.explicacao}
                  </span>
                </button>
              ))}
            </div>
            {ajuste < 0 && (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                <Icone.alerta className="mr-1 inline h-3 w-3" />
                Quinze por cento, e não trinta. Quem treina cinco vezes por semana
                e corta um terço das calorias não fica seco: fica sem rola. O
                déficit agressivo come massa magra e a conta vem no treino
                difícil, que é justamente o que faz diferença.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="text-sm font-bold">Metas manuais</p>
            <p className="text-xs text-muted-foreground">
              Deixe em zero para o app calcular. Preencha se você tem
              nutricionista — o número dele manda mais que a fórmula daqui.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dieta-kcal">Calorias</Label>
              <CampoNumero
                id="dieta-kcal"
                valor={metaKcal}
                aoMudar={setMetaKcal}
                min={0}
                max={9000}
              />
            </div>
            <div>
              <Label htmlFor="dieta-prot">Proteína (g)</Label>
              <CampoNumero
                id="dieta-prot"
                valor={metaProteinaG}
                aoMudar={setMetaProteinaG}
                min={0}
                max={500}
              />
            </div>
          </div>

          {metaKcal === 0 && peso !== null && (
            <p className="text-xs text-muted-foreground">
              Sem meta manual, a proteína sai de{" "}
              {String(PROTEINA_POR_KG[objetivo]).replace(".", ",")} g por quilo —
              hoje daria {Math.round(PROTEINA_POR_KG[objetivo] * peso)} g.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ---- prévia ---- */}
      {previa ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Como fica um dia SEM treino
            </p>
            <div className="mt-2 space-y-1 text-sm">
              <Item rotulo="Taxa basal" valor={`${previa.basal} kcal`} />
              <Item
                rotulo="Gasto do dia parado"
                valor={`${previa.gastoSemTreino} kcal`}
              />
              <Item
                rotulo="Meta de calorias"
                valor={`${previa.macros.kcal} kcal`}
                destaque
              />
              <Item rotulo="Proteína" valor={`${previa.macros.proteinaG} g`} />
              <Item
                rotulo="Carboidrato"
                valor={`${previa.macros.carboidratoG} g`}
              />
              <Item rotulo="Gordura" valor={`${previa.macros.gorduraG} g`} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Em dia de treino a meta sobe sozinha, porque o gasto sobe. É a
              duração e o número de rolas do{" "}
              <Link to="/diario" className="underline">
                Diário
              </Link>{" "}
              que fazem essa conta.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-border/60 bg-transparent">
          <CardContent className="p-4 text-sm text-muted-foreground">
            A prévia aparece quando o app tiver altura, sexo, data de nascimento
            (no{" "}
            <Link to="/perfil" className="underline">
              perfil
            </Link>
            ) e pelo menos uma{" "}
            <Link to="/dieta/peso" className="underline">
              pesagem
            </Link>
            .
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        onClick={async () => {
          const salvou = await salvar({
            alturaCm,
            sexo,
            objetivo,
            metaKcal: metaKcal > 0 ? metaKcal : null,
            metaProteinaG: metaProteinaG > 0 ? metaProteinaG : null,
          });
          if (salvou) toast.success("Metas salvas.");
        }}
      >
        Salvar metas
      </Button>
    </PageShell>
  );
}

function Item({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className={cn("tabular-nums", destaque && "font-black text-primary")}>
        {valor}
      </span>
    </div>
  );
}
