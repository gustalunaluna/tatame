import {
  ArrowLeft,
  AtSign,
  Award,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Clock,
  Dumbbell,
  ExternalLink,
  EyeOff,
  FileText,
  Flame,
  GraduationCap,
  Home,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Medal,
  Menu,
  Minus,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Swords,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

/**
 * Todo ícone do app entra por aqui, pelo NOME DO QUE ELE SIGNIFICA — nunca pelo
 * nome que a biblioteca deu a ele.
 *
 * O ganho é trocar de ideia num lugar só. Se amanhã "medalha" virar um pódio em
 * vez de uma medalha, ou se a biblioteca inteira for trocada, muda aqui e o app
 * inteiro acompanha. Antes, `Medal` estava importado direto em cinco arquivos,
 * e "trocar o ícone de medalha" significava caçar todos eles.
 *
 * O outro ganho é de coerência: com a lista à vista, fica óbvio quando dois
 * conceitos diferentes estão usando o mesmo desenho — que é como um app começa
 * a ficar confuso sem ninguém saber explicar por quê.
 *
 * `verificar-design.mjs` reprova qualquer arquivo que importe de "lucide-react"
 * fora deste.
 */
export const Icone = {
  /* --- domínio: jiu-jitsu ------------------------------------------- */
  treino: Dumbbell,
  rola: Swords,
  tecnica: BookOpen,
  listaDeTecnicas: ClipboardList,
  graduacao: GraduationCap,
  mestre: GraduationCap,
  equipe: Shield,
  academia: Shield,
  parceiro: Users,
  adicionarParceiro: UserPlus,
  medalha: Medal,
  conquista: Trophy,
  meta: Target,
  plano: CalendarDays,
  evolucao: TrendingUp,
  analise: FileText,
  sequencia: Flame,
  destaque: Star,
  premio: Award,

  /* --- selos ---------------------------------------------------------- */
  seloPessoa: BadgeCheck,
  seloEquipe: ShieldCheck,

  /* --- navegação ------------------------------------------------------ */
  inicio: Home,
  perfil: User,
  menu: Menu,
  voltar: ArrowLeft,
  avancar: ChevronRight,
  expandir: ChevronDown,
  recolher: ChevronUp,
  sair: LogOut,
  externo: ExternalLink,

  /* --- ações ---------------------------------------------------------- */
  adicionar: Plus,
  remover: Minus,
  editar: Pencil,
  apagar: Trash2,
  confirmar: Check,
  fechar: X,
  buscar: Search,
  ocultar: EyeOff,

  /* --- diversos ------------------------------------------------------- */
  local: MapPin,
  arroba: AtSign,
  email: Mail,
  foto: Camera,
  horario: Clock,
  privado: Lock,
} as const satisfies Record<string, LucideIcon>;

export type NomeDeIcone = keyof typeof Icone;
export type { LucideIcon };
