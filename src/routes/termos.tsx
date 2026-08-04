import { createFileRoute, Link } from "@tanstack/react-router";
import { PortaDeEntrada } from "@/components/PortaDeEntrada";
import { ListaLegal, SecaoLegal } from "@/components/TextoLegal";
import { ATUALIZADO_EM, CONTATO, IDADE_MINIMA } from "@/lib/legal";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Ponteira" },
      {
        name: "description",
        content: "As regras de uso do Ponteira, em português claro.",
      },
    ],
  }),
  component: Termos,
});

function Termos() {
  return (
    <PortaDeEntrada
      titulo="Termos de Uso"
      descricao={`Atualizados em ${ATUALIZADO_EM}.`}
    >
      <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
        Criar uma conta no Ponteira significa aceitar estas regras. Elas são
        curtas de propósito.
      </p>

      <SecaoLegal numero={1} titulo="O que o Ponteira é">
        <p>
          Um diário pessoal de treino de jiu-jitsu: você registra treinos,
          técnicas, graduações e medalhas, e o app organiza isso em progresso,
          metas e um plano do mês. O serviço é oferecido como está, de graça, sem
          garantia de disponibilidade ininterrupta.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={2} titulo="O que o Ponteira não é">
        <p>
          Não é orientação médica, fisioterápica ou nutricional. O plano do mês e
          as análises são sugestões geradas a partir do que você registrou —
          quem decide o que treinar é você e seu professor. Jiu-jitsu é esporte
          de contato: treine sob supervisão qualificada e respeite seus limites e
          lesões.
        </p>
        <p>
          Também não é uma autoridade de graduação. O app registra a faixa que
          você informa e as datas que você preenche; ele não gradua ninguém e não
          substitui o reconhecimento do seu professor, da sua equipe ou de
          qualquer federação. As referências a prazos da IBJJF são informativas.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={3} titulo="Sua conta">
        <ListaLegal
          itens={[
            <>É preciso ter {IDADE_MINIMA} anos ou mais.</>,
            <>
              Os dados que você informa — faixa, graus, academia, medalhas —
              devem ser verdadeiros. O app é um registro; registro falso não
              serve para nada.
            </>,
            <>
              A senha é sua responsabilidade. Se suspeitar de acesso indevido,
              troque a senha e avise pelo e-mail de contato.
            </>,
            <>Uma conta por pessoa.</>,
          ]}
        />
      </SecaoLegal>

      <SecaoLegal numero={4} titulo="O que você não pode fazer">
        <ListaLegal
          itens={[
            <>
              Registrar terceiros de má-fé — atribuir faixa, medalha ou vínculo
              de mestre a quem não tem.
            </>,
            <>
              Usar o app para assediar, ofender ou expor alguém, inclusive nos
              campos livres de texto.
            </>,
            <>
              Tentar acessar dados de outra conta, sondar as defesas do serviço
              ou automatizar acessos em massa.
            </>,
            <>Fazer engenharia reversa para reproduzir o serviço.</>,
          ]}
        />
        <p>
          Conta que descumprir isso pode ser suspensa ou removida, sem aviso
          quando o caso envolver a segurança de outras pessoas.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={5} titulo="Do que você escreve">
        <p>
          O conteúdo é seu e continua seu. Você concede apenas a licença técnica
          necessária para o app armazenar e exibir esse conteúdo a você e a quem
          você escolher — nada além disso. Não usamos seus relatos para treinar
          modelos nem os publicamos em qualquer lugar.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={6} titulo="Saindo">
        <p>
          Você pode sair quando quiser: Perfil › Meus dados › Excluir minha
          conta. Antes disso, vale baixar seus dados — a exclusão é definitiva e
          não há como desfazer. Nós podemos encerrar o serviço; se isso
          acontecer, avisaremos com antecedência razoável para você exportar
          tudo.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={7} titulo="Limite de responsabilidade">
        <p>
          O app é fornecido sem garantias. Na medida permitida pela lei, o
          responsável não responde por perdas decorrentes do uso do serviço,
          inclusive perda de dados — por isso a exportação existe e é gratuita.
          Nada aqui afasta direitos que o Código de Defesa do Consumidor garanta
          a você.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={8} titulo="Privacidade">
        <p>
          O tratamento dos seus dados está descrito na{" "}
          <Link to="/privacidade" className="text-primary underline">
            Política de Privacidade
          </Link>
          , que faz parte destes termos.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={9} titulo="Lei e foro">
        <p>
          Aplica-se a lei brasileira. Fica eleito o foro do domicílio do
          consumidor para dirimir controvérsias. Dúvidas sobre estes termos:{" "}
          <a href={`mailto:${CONTATO}`} className="text-primary underline">
            {CONTATO}
          </a>
          .
        </p>
      </SecaoLegal>
    </PortaDeEntrada>
  );
}
