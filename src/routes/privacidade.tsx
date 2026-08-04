import { createFileRoute } from "@tanstack/react-router";
import { PortaDeEntrada } from "@/components/PortaDeEntrada";
import { ListaLegal, SecaoLegal } from "@/components/TextoLegal";
import { ATUALIZADO_EM, CONTATO, IDADE_MINIMA } from "@/lib/legal";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Ponteira" },
      {
        name: "description",
        content:
          "O que o Ponteira guarda, por que guarda, com quem compartilha e como você apaga tudo.",
      },
    ],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <PortaDeEntrada
      titulo="Política de Privacidade"
      descricao={`Atualizada em ${ATUALIZADO_EM}.`}
    >
      <p className="text-[0.9375rem] leading-relaxed text-muted-foreground">
        O Ponteira é um diário de treino de jiu-jitsu. Ele guarda o que você
        escreve nele e nada além disso — não há rastreadores, não há publicidade
        e seus dados não são vendidos a ninguém, em nenhuma circunstância.
      </p>

      <SecaoLegal numero={1} titulo="Quem é o responsável">
        <p>
          Os dados são tratados pelo responsável pelo aplicativo Ponteira, que
          atua como controlador nos termos da Lei nº 13.709/2018 (LGPD). Para
          qualquer pedido relativo aos seus dados, escreva para{" "}
          <a href={`mailto:${CONTATO}`} className="text-primary underline">
            {CONTATO}
          </a>
          .
        </p>
      </SecaoLegal>

      <SecaoLegal numero={2} titulo="O que o app guarda">
        <p>Só existe o que você digita. Em detalhe:</p>
        <ListaLegal
          itens={[
            <>
              <strong className="text-foreground">Sua conta:</strong> e-mail e
              senha. A senha é guardada apenas como hash pelo provedor de
              autenticação — nem nós conseguimos lê-la.
            </>,
            <>
              <strong className="text-foreground">Seu perfil:</strong> apelido,
              foto, data de nascimento, faixa e graus, academia, mestre, bio e o
              nome de usuário público.
            </>,
            <>
              <strong className="text-foreground">Seus treinos:</strong> data,
              tipo, duração, número de rolas, técnicas trabalhadas e o relato
              que você escreve.
            </>,
            <>
              <strong className="text-foreground">Sua trajetória:</strong>{" "}
              graduações, medalhas e competições, metas, plano do mês,
              conquistas e as avaliações do seu jogo.
            </>,
            <>
              <strong className="text-foreground">Parceiros e linhagem:</strong>{" "}
              os nomes de quem você registra como parceiro de rola ou como
              mestre. Veja a seção 6 — esses dados são de outra pessoa.
            </>,
          ]}
        />
        <p>
          O app <strong className="text-foreground">não</strong> coleta
          localização, contatos, agenda, microfone, câmera em segundo plano,
          identificadores de publicidade nem histórico de navegação. Não há
          Google Analytics, pixel de rede social ou SDK de anúncio no código.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={3} titulo="Por que guarda">
        <p>
          Para executar o que você pediu ao criar a conta: manter seu diário,
          calcular sua evolução e mostrar seu perfil a quem você escolher. É a
          base legal da execução de contrato (LGPD, art. 7º, V). O e-mail é
          usado para autenticar você e para mensagens operacionais — confirmação
          de cadastro e recuperação de senha. Não enviamos marketing.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={4} titulo="Quem mais toca nesses dados">
        <p>
          Dois fornecedores de infraestrutura, e só eles, como operadores:
        </p>
        <ListaLegal
          itens={[
            <>
              <strong className="text-foreground">Supabase</strong> — banco de
              dados e autenticação. Os servidores ficam nos Estados Unidos
              (região us-east-2).
            </>,
            <>
              <strong className="text-foreground">Vercel</strong> — hospedagem e
              entrega do aplicativo.
            </>,
          ]}
        />
        <p>
          Como a hospedagem é no exterior, existe transferência internacional de
          dados (LGPD, art. 33). Ela é necessária para a execução do contrato
          entre você e o app. Nenhum outro terceiro recebe seus dados, e nada é
          vendido ou cedido para fins publicitários.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={5} titulo="O que é público e o que não é">
        <p>
          Seu diário é privado. Relato de treino, notas de técnica, metas e
          plano do mês só você vê.
        </p>
        <p>
          É visível a outras pessoas logadas no app: seu nome de usuário,
          apelido, foto, faixa e graus, academia, medalhas, graduações e
          linhagem. Isso existe para que a academia e os parceiros consigam
          encontrar você — é a parte social do app, e você controla o que
          preenche.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={6} titulo="Quando você registra outra pessoa">
        <p>
          Ao anotar um parceiro de rola ou um mestre pelo nome, você grava um
          dado de outra pessoa. Registre apenas quem treina com você e apenas o
          que essa pessoa aceitaria ver anotado. Vínculo de mestre e parceria só
          aparecem no perfil do outro depois que ele confirma.
        </p>
        <p>
          Se alguém quiser ser removido de registros feitos por terceiros,
          escreva para{" "}
          <a href={`mailto:${CONTATO}`} className="text-primary underline">
            {CONTATO}
          </a>
          .
        </p>
      </SecaoLegal>

      <SecaoLegal numero={7} titulo="Seus direitos">
        <p>
          A LGPD (art. 18) garante a você confirmar o tratamento, acessar,
          corrigir, portar, anonimizar e eliminar seus dados. No próprio app,
          sem pedir nada a ninguém:
        </p>
        <ListaLegal
          itens={[
            <>
              <strong className="text-foreground">Baixar tudo</strong> — Perfil ›
              Meus dados › Baixar meus dados. Sai um arquivo JSON com o conteúdo
              integral da sua conta.
            </>,
            <>
              <strong className="text-foreground">Apagar tudo</strong> — Perfil ›
              Meus dados › Excluir minha conta. A exclusão é imediata e
              definitiva.
            </>,
          ]}
        />
        <p>
          Para os demais direitos, ou se preferir tratar por escrito, use o
          e-mail de contato. Respondemos em até 15 dias.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={8} titulo="Por quanto tempo fica guardado">
        <p>
          Enquanto a conta existir. Ao excluir a conta, os dados são removidos
          do banco na hora, sem período de carência e sem cópia sombra. Backups
          operacionais do provedor podem reter o registro por até 30 dias antes
          de rotacionarem.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={9} titulo="Idade mínima">
        <p>
          O cadastro é para maiores de {IDADE_MINIMA} anos. O app não é
          direcionado a crianças e não coleta dados de menores de forma
          consciente. Se identificarmos uma conta abaixo dessa idade, ela é
          removida.
        </p>
      </SecaoLegal>

      <SecaoLegal numero={10} titulo="Mudanças nesta política">
        <p>
          Se o texto mudar, a data no topo muda junto. Alterações relevantes são
          avisadas dentro do app antes de valer.
        </p>
      </SecaoLegal>
    </PortaDeEntrada>
  );
}
