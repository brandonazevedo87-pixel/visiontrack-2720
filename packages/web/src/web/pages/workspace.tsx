import { useState } from "react";
import {
  LayoutDashboard,
  Video,
  CreditCard,
  Settings,
  Users,
  ArrowUpRight,
  ArrowRight,
  Plus,
  ChevronRight,
  Search,
  Bell,
  ShieldCheck,
  HelpCircle,
  LogOut,
  Link2,
  Clock3,
  Play,
  Check,
  Copy,
  Loader2,
  ExternalLink,
  X,
  Monitor,
  Camera,
  CheckCircle2,
} from "lucide-react";
import { authClient } from "../lib/auth";
import { client } from "../lib/api";
import { useMe, usePlan, useRecordings, useMembers } from "../queries/vision";
import { AuthModal } from "../components/auth-modal";
import { Workbench, time } from "../components/workbench";
import { PasswordSettings } from "../components/password-settings";

type Page = "dashboard" | "recordings" | "plan" | "admin" | "settings";
const pageNames = {
  dashboard: "Visão geral",
  recordings: "Gravações",
  plan: "Meu plano",
  admin: "Gerenciar bancadas",
  settings: "Configurações",
};
export default function Workspace() {
  const { data: session, isPending } = authClient.useSession();
  const me = useMe(!!session);
  const plan = usePlan();
  const videos = useRecordings(!!session);
  const members = useMembers(!!me.data?.isAdmin);
  const [page, setPage] = useState<Page>("dashboard");
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [help, setHelp] = useState(false);
  const [busy, setBusy] = useState("");
  const [copied, setCopied] = useState("");
  const [pixKey, setPixKey] = useState<string | null>(null);
  const [pixName, setPixName] = useState<string | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [days, setDays] = useState<number | null>(null);
  const rows = videos.data ?? [];
  const filtered = rows.filter((r) =>
    `${r.customer} ${r.device} ${r.service}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const ready = !!me.data?.active;
  const owner = !!me.data?.isAdmin;
  const displayName = session?.user.name?.split(" ")[0] ?? "técnico";
  const currentPlan = plan.data;
  const totalDuration = rows.reduce((a, r) => a + r.duration, 0);
  const totalViews = rows.reduce((a, r) => a + r.views, 0);
  function needAccess() {
    if (!session) setAuthOpen(true);
    else {
      setPage("plan");
      setNotice(
        "Sua bancada precisa ser ativada pelo administrador antes de gravar.",
      );
    }
  }
  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${location.origin}/v/${token}`);
      setCopied(token);
      setNotice("Link copiado. O cliente terá acesso somente a este vídeo.");
    } catch {
      setNotice(`Copie este link: ${location.origin}/v/${token}`);
    }
  }
  async function action(
    key: string,
    fn: () => Promise<unknown>,
    message: string,
  ) {
    setBusy(key);
    setNotice("");
    try {
      await fn();
      setNotice(message);
      await Promise.all([me.refetch(), members.refetch(), plan.refetch()]);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setBusy("");
    }
  }
  const Nav = ({
    id,
    icon: Icon,
    label,
  }: {
    id: Page;
    icon: typeof Video;
    label: string;
  }) => (
    <button
      className={`nav-item ${page === id ? "active" : ""}`}
      onClick={() => setPage(id)}
    >
      <Icon size={19} />
      <span>{label}</span>
      {page === id && <span className="nav-active-dot" />}
    </button>
  );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="VisionTrack início">
          <span className="brand-mark" />
          visiontrack<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">
          <span /> SEU ESPAÇO DE TRABALHO
        </div>
        <div className="nav-group-label">WORKSPACE</div>
        <nav>
          <Nav id="dashboard" icon={LayoutDashboard} label="Visão geral" />
          <Nav id="recordings" icon={Video} label="Gravações" />
          <Nav id="plan" icon={CreditCard} label="Meu plano" />
          {owner && <Nav id="admin" icon={Users} label="Gerenciar bancadas" />}
        </nav>
        <div className="nav-separator" />
        <div className="nav-group-label">PREFERÊNCIAS</div>
        <nav>
          <Nav id="settings" icon={Settings} label="Configurações" />
          <button className="nav-item" onClick={() => setHelp(true)}>
            <HelpCircle size={19} />
            <span>Central de ajuda</span>
            <ArrowUpRight size={15} />
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="plan-mini">
            <div className="plan-mini-title">
              <span className="mini-spark">✦</span> Mais confiança.
              <br />
              Mais valor ao seu trabalho.
            </div>
            <p>
              Seu cliente acompanha.
              <br />
              Sua transparência se destaca.
            </p>
            <button onClick={() => setPage("plan")}>
              Conhecer meu plano <ArrowRight size={15} />
            </button>
          </div>
          <div className="secure-footer">
            <ShieldCheck size={15} />
            <span>Ambiente seguro e privado</span>
          </div>
          <div className="version-label">
            VISIONTRACK © {new Date().getFullYear()}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>{pageNames[page]}</strong>
          </div>
          <div className="topbar-actions">
            <span className={`top-status ${ready ? "is-active" : ""}`}>
              <i />
              {ready
                ? "Bancada ativa"
                : session
                  ? "Ativação pendente"
                  : "Modo demonstração"}
            </span>
            <button
              className="icon-button notification"
              aria-label="Notificações"
              onClick={() =>
                setNotice(
                  session
                    ? ready
                      ? "Sua bancada está ativa e pronta para gravar."
                      : "Aguardando confirmação de pagamento pelo administrador."
                    : "Entre ou crie uma conta para ativar sua bancada.",
                )
              }
            >
              <Bell size={19} />
              <i />
            </button>
            <div className="topbar-divider" />
            <button
              className="profile-button"
              onClick={() =>
                session ? setPage("settings") : setAuthOpen(true)
              }
            >
              <span className="avatar">
                {session ? displayName.slice(0, 2).toUpperCase() : "VT"}
              </span>
              <span className="profile-name">
                {session ? displayName : "Acessar conta"}
                <small>
                  {owner
                    ? "Administrador"
                    : session
                      ? "Técnico"
                      : "Seu workspace"}
                </small>
              </span>
              <ChevronRight size={14} />
            </button>
          </div>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                CUIDADO QUE SE VÊ. CONFIANÇA QUE FICA.
              </div>
              <h1>
                {page === "dashboard"
                  ? session
                    ? `Olá, ${displayName}`
                    : "Sua bancada, em foco"
                  : pageNames[page]}
                {page === "dashboard" && <span className="heading-dot">.</span>}
              </h1>
              <p>
                {page === "dashboard"
                  ? "Cada reparo conta uma história. Mostre a sua, com transparência."
                  : page === "recordings"
                    ? "Todos os seus reparos, registrados em um só lugar."
                    : page === "plan"
                      ? "Tudo o que você precisa para transformar cuidado em confiança."
                      : page === "admin"
                        ? "Você tem o controle. Somente você pode ativar uma bancada."
                        : "Seu espaço, do seu jeito."}
              </p>
            </div>
            <button
              className="button primary heading-cta"
              onClick={() => {
                if (!session) setAuthOpen(true);
                else {
                  setPage("dashboard");
                  document
                    .getElementById("recording-area")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              <Plus size={18} /> Nova gravação
            </button>
          </div>
          {notice && (
            <output className="notice">
              <ShieldCheck size={17} />
              <span>{notice}</span>
              <button
                onClick={() => setNotice("")}
                className="icon-button"
                aria-label="Fechar mensagem"
              >
                <X size={15} />
              </button>
            </output>
          )}
          {isPending || (session && me.isLoading) ? (
            <div className="loading-banner">
              <Loader2 className="spin" size={18} /> Carregando sua bancada...
            </div>
          ) : !session ? (
            <div className="preview-banner">
              <span>
                <Monitor size={16} />
                <strong>Conheça seu novo espaço de trabalho.</strong> Entre ou
                crie sua conta para começar a gravar.
              </span>
              <button onClick={() => setAuthOpen(true)}>
                Começar agora <ArrowRight size={14} />
              </button>
            </div>
          ) : !ready && page === "dashboard" ? (
            <div className="preview-banner">
              <span>
                <Clock3 size={16} />
                <strong>Seu cadastro está pronto.</strong> A bancada será
                liberada após a confirmação do Pix.
              </span>
              <button onClick={() => setPage("plan")}>
                Ver pagamento <ArrowRight size={14} />
              </button>
            </div>
          ) : null}
          <div style={{ display: page === "dashboard" ? "block" : "none" }}>
            <div className="metrics">
              <div className="metric">
                <div className="metric-top">
                  Gravações realizadas{" "}
                  <span className="metric-icon violet">
                    <Video size={18} />
                  </span>
                </div>
                <div className="metric-number">
                  {String(rows.length).padStart(2, "0")}
                  <span className="metric-pill">Seu histórico</span>
                </div>
                <p>Reparos registrados com cuidado</p>
              </div>
              <div className="metric">
                <div className="metric-top">
                  Tempo registrado{" "}
                  <span className="metric-icon orange">
                    <Clock3 size={18} />
                  </span>
                </div>
                <div className="metric-number">
                  {Math.floor(totalDuration / 3600)}
                  <small>h</small> {Math.floor(totalDuration / 60) % 60}
                  <small>min</small>
                </div>
                <p>Cada detalhe documentado</p>
              </div>
              <div className="metric">
                <div className="metric-top">
                  Links disponíveis{" "}
                  <span className="metric-icon blue">
                    <Link2 size={18} />
                  </span>
                </div>
                <div className="metric-number">
                  {String(rows.length).padStart(2, "0")}
                  <span className="metric-pill blue-pill">Exclusivos</span>
                </div>
                <p>Prontos para enviar ao cliente</p>
              </div>
              <div className="metric">
                <div className="metric-top">
                  Visualizações{" "}
                  <span className="metric-icon green">
                    <ShieldCheck size={18} />
                  </span>
                </div>
                <div className="metric-number">
                  {String(totalViews).padStart(2, "0")}
                </div>
                <p>Mais transparência, mais confiança</p>
              </div>
            </div>
            <div className="section-title">
              <div>
                <h2>Hora de fazer um bom trabalho.</h2>
                <p>Prepare a bancada. O resto, a gente registra.</p>
              </div>
              <span className="section-hint">
                <ShieldCheck size={14} /> Gravação privada
              </span>
            </div>
          </div>
          <div
            id="recording-area"
            style={{ display: page === "dashboard" ? "block" : "none" }}
          >
            <Workbench
              active={ready}
              requireAccess={needAccess}
              onSaved={() => {
                void videos.refetch();
                setNotice(
                  "Vídeo salvo com segurança. Seu link já pode ser enviado ao cliente.",
                );
              }}
            />
          </div>
          {(page === "dashboard" || page === "recordings") && (
            <section className="recordings-section">
              <div className="section-title">
                <div>
                  <h2>
                    {page === "dashboard"
                      ? "Últimas gravações"
                      : "Biblioteca de gravações"}
                    <span className="count-badge">{rows.length}</span>
                  </h2>
                  <p>O registro do seu cuidado, sempre à mão.</p>
                </div>
                {page === "dashboard" ? (
                  <button
                    className="text-button"
                    onClick={() => setPage("recordings")}
                  >
                    Ver todas as gravações <ArrowRight size={15} />
                  </button>
                ) : (
                  <label className="search-input">
                    <Search size={16} />
                    <input
                      aria-label="Buscar gravações"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar cliente ou aparelho"
                    />
                  </label>
                )}
              </div>
              <div className="panel table-panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>CLIENTE / APARELHO</th>
                        <th>SERVIÇO</th>
                        <th>DATA</th>
                        <th>DURAÇÃO</th>
                        <th>STATUS</th>
                        <th className="right">COMPARTILHAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videos.isLoading ? (
                        <tr aria-label="Carregando gravações">
                          <td colSpan={6}>
                            <div className="empty-table">
                              <Loader2 className="spin" size={22} /> Carregando
                              gravações...
                            </div>
                          </td>
                        </tr>
                      ) : filtered.length ? (
                        (page === "dashboard"
                          ? filtered.slice(0, 4)
                          : filtered
                        ).map((r) => (
                          <tr key={r.id}>
                            <td>
                              <div className="device-cell">
                                <a
                                  className="video-thumb"
                                  href={`/v/${r.token}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Assistir ${r.device}`}
                                >
                                  <Play size={15} />
                                </a>
                                <div>
                                  <strong>{r.customer}</strong>
                                  <small>{r.device}</small>
                                </div>
                              </div>
                            </td>
                            <td>{r.service}</td>
                            <td>
                              {new Date(r.createdAt).toLocaleDateString(
                                "pt-BR",
                              )}
                            </td>
                            <td className="mono">{time(r.duration)}</td>
                            <td>
                              <span className="status-chip green">
                                <i />
                                Concluído
                              </span>
                            </td>
                            <td className="right">
                              <button
                                className="copy-button"
                                onClick={() => copyLink(r.token)}
                              >
                                {copied === r.token ? (
                                  <Check size={14} />
                                ) : (
                                  <Link2 size={14} />
                                )}{" "}
                                {copied === r.token ? "Copiado" : "Copiar link"}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr aria-label="Nenhuma gravação disponível">
                          <td colSpan={6}>
                            <div className="empty-table">
                              <div className="empty-icon">
                                <Video size={23} strokeWidth={1.5} />
                              </div>
                              <strong>
                                {search
                                  ? "Nenhuma gravação encontrada"
                                  : "Seu próximo reparo merece um registro."}
                              </strong>
                              <span>
                                {search
                                  ? "Tente buscar por outro cliente ou aparelho."
                                  : "As gravações finalizadas e salvas aparecerão aqui."}
                              </span>
                              {!search && (
                                <button
                                  onClick={() => {
                                    if (!session) setAuthOpen(true);
                                    else
                                      document
                                        .getElementById("recording-area")
                                        ?.scrollIntoView({
                                          behavior: "smooth",
                                        });
                                  }}
                                  className="text-button"
                                >
                                  Criar primeira gravação{" "}
                                  <ArrowRight size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <ShieldCheck size={14} /> Os clientes acessam somente o vídeo
                  compartilhado. Seus dados continuam privados.
                </div>
              </div>
            </section>
          )}
          {page === "plan" && (
            <div className="plan-layout">
              <section className="panel big-plan">
                <span className="plan-label">PLANO VISIONTRACK</span>
                <h2>
                  Transparência é o seu
                  <br />
                  melhor diferencial.
                </h2>
                <div className="price">
                  R$ {currentPlan?.price ?? 150}
                  <small>/ {currentPlan?.days ?? 30} dias</small>
                </div>
                <p>
                  Uma bancada preparada para conquistar a confiança de cada
                  cliente.
                </p>
                <ul>
                  {[
                    "Gravação de webcam sem áudio",
                    "Vídeos salvos em ambiente privado",
                    "Link exclusivo para cada manutenção",
                    "Painel com histórico de gravações",
                  ].map((t) => (
                    <li key={t}>
                      <CheckCircle2 size={18} />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="plan-state">
                  <i />
                  {owner
                    ? "Acesso de administrador"
                    : ready
                      ? "Seu plano está ativo"
                      : "Ativação manual pelo administrador"}
                </div>
                {me.data?.profile.expiresAt && ready && !owner && (
                  <p>
                    Válido até{" "}
                    {new Date(me.data.profile.expiresAt).toLocaleDateString(
                      "pt-BR",
                    )}
                    .
                  </p>
                )}
              </section>
              <section className="panel payment-panel">
                <div className="section-icon large">
                  <CreditCard size={24} />
                </div>
                <h2>Pagamento via Pix</h2>
                <p className="muted">
                  Faça o pagamento e avise por aqui. O administrador confere o
                  recebimento antes de ativar sua bancada.
                </p>
                <div className="payment-steps">
                  <div>
                    <span>1</span>
                    <strong>Pague com a chave Pix abaixo</strong>
                  </div>
                  <div>
                    <span>2</span>
                    <strong>Informe que já fez o pagamento</strong>
                  </div>
                  <div>
                    <span>3</span>
                    <strong>Aguarde a ativação da bancada</strong>
                  </div>
                </div>
                {plan.isLoading ? (
                  <p>Carregando dados de pagamento...</p>
                ) : currentPlan?.pixKey ? (
                  <>
                    <label>
                      Chave Pix
                      <input
                        aria-label="Chave Pix para pagamento"
                        value={currentPlan.pixKey}
                        readOnly
                        onFocus={(e) => e.target.select()}
                      />
                    </label>
                    {currentPlan.pixName && (
                      <p>
                        Favorecido: <strong>{currentPlan.pixName}</strong>
                      </p>
                    )}
                    <button
                      className="button secondary full"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            currentPlan.pixKey,
                          );
                          setNotice(
                            "Chave Pix copiada. Confira o favorecido no seu banco antes de pagar.",
                          );
                        } catch {
                          setNotice("Selecione a chave e copie manualmente.");
                        }
                      }}
                    >
                      <Copy size={16} />
                      Copiar chave Pix
                    </button>
                  </>
                ) : (
                  <div className="pending-info">
                    A chave Pix ainda não foi configurada pelo administrador.
                    Aguarde antes de fazer o pagamento.
                  </div>
                )}
                <button
                  className="button primary full"
                  disabled={
                    !!busy ||
                    !!me.data?.profile.paymentReported ||
                    !currentPlan?.pixKey ||
                    owner
                  }
                  onClick={() =>
                    session
                      ? void action(
                          "payment",
                          () => client.vision.reportPayment(),
                          "Pagamento informado. Aguarde a conferência e a ativação pelo administrador.",
                        )
                      : setAuthOpen(true)
                  }
                >
                  {busy === "payment" ? (
                    <Loader2 size={17} className="spin" />
                  ) : (
                    <Check size={17} />
                  )}{" "}
                  {me.data?.profile.paymentReported
                    ? "Pagamento informado · em análise"
                    : "Já fiz o pagamento"}
                </button>
                <p className="form-help">
                  Informar o pagamento não ativa a conta automaticamente.
                </p>
              </section>
            </div>
          )}
          {page === "admin" && owner && (
            <section className="panel admin-panel">
              <div className="panel-heading">
                <h3>Contas e ativações</h3>
                <span className="status-chip green">
                  <ShieldCheck size={13} /> Controle do administrador
                </span>
              </div>
              {members.isLoading ? (
                <div className="empty-table">Carregando contas...</div>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>TÉCNICO</th>
                        <th>SITUAÇÃO</th>
                        <th>PAGAMENTO</th>
                        <th>AÇÃO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.data
                        ?.filter(
                          (m) => m.email !== "brandonazevedo87@gmail.com",
                        )
                        .map((m) => (
                          <tr key={m.id}>
                            <td>
                              <strong>{m.name}</strong>
                              <small className="block muted">{m.email}</small>
                            </td>
                            <td>
                              <span
                                className={`status-chip ${m.status === "active" && (m.expiresAt ?? 0) > Date.now() ? "green" : ""}`}
                              >
                                {m.status === "active" &&
                                (m.expiresAt ?? 0) > Date.now()
                                  ? "Ativa"
                                  : m.status === "blocked"
                                    ? "Bloqueada"
                                    : "Pendente"}
                              </span>
                            </td>
                            <td>
                              {m.paymentReported
                                ? "Pix informado · conferir"
                                : "Não informado"}
                            </td>
                            <td aria-label="Ações de ativação da bancada">
                              <div className="admin-actions">
                                <button
                                  className="button primary small"
                                  disabled={!!busy}
                                  onClick={() =>
                                    void action(
                                      m.id,
                                      () =>
                                        client.vision.activate({
                                          userId: m.id,
                                          activate: true,
                                          days: currentPlan?.days ?? 30,
                                        }),
                                      "Pagamento confirmado e bancada ativada.",
                                    )
                                  }
                                >
                                  {busy === m.id ? (
                                    <Loader2 size={14} className="spin" />
                                  ) : (
                                    <Check size={14} />
                                  )}
                                  Confirmar e ativar
                                </button>
                                <button
                                  className="button secondary small"
                                  disabled={!!busy}
                                  onClick={() =>
                                    void action(
                                      m.id,
                                      () =>
                                        client.vision.activate({
                                          userId: m.id,
                                          activate: false,
                                          days: 30,
                                        }),
                                      "Bancada bloqueada.",
                                    )
                                  }
                                >
                                  Bloquear
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {!members.data?.filter(
                        (m) => m.email !== "brandonazevedo87@gmail.com",
                      ).length && (
                        <tr aria-label="Nenhum técnico cadastrado">
                          <td colSpan={4}>
                            <div className="empty-table">
                              <Users size={26} />
                              <strong>Nenhum técnico cadastrado ainda.</strong>
                              <span>
                                Novas contas aparecerão aqui para sua aprovação.
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {page === "settings" && (
            <div className="settings-layout">
              <section className="panel settings-panel">
                <h2>Sua conta</h2>
                <p className="muted">Seu acesso ao VisionTrack.</p>
                {session ? (
                  <>
                    <label>
                      Nome
                      <input aria-label="Nome da conta" readOnly value={session.user.name} />
                    </label>
                    <label>
                      E-mail
                      <input aria-label="E-mail da conta" readOnly value={session.user.email} />
                    </label>
                    <div className="account-state">
                      <ShieldCheck size={18} />
                      {owner
                        ? "Você é o administrador. Somente você ativa os perfis."
                        : ready
                          ? "Sua bancada está ativa."
                          : "Sua bancada aguarda ativação pelo administrador."}
                    </div>
                    <button
                      className="button secondary"
                      onClick={async () => {
                        await authClient.signOut();
                        location.reload();
                      }}
                    >
                      <LogOut size={16} />
                      Sair da conta
                    </button>
                  </>
                ) : (
                  <>
                    <p>Entre para ver e gerenciar sua conta.</p>
                    <button
                      className="button primary"
                      onClick={() => setAuthOpen(true)}
                    >
                      Acessar conta
                      <ArrowRight size={16} />
                    </button>
                  </>
                )}
              </section>
              {owner && (
                <section className="panel settings-panel">
                  <h2>Plano e chave Pix</h2>
                  <p className="muted">
                    Esses dados aparecem na página de pagamento dos técnicos.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void action(
                        "settings",
                        () =>
                          client.vision.savePlan({
                            pixKey: pixKey ?? currentPlan?.pixKey ?? "",
                            pixName: pixName ?? currentPlan?.pixName ?? "",
                            price: price ?? currentPlan?.price ?? 150,
                            days: days ?? currentPlan?.days ?? 30,
                          }),
                        "Chave Pix e plano atualizados.",
                      );
                    }}
                  >
                    <label>
                      Chave Pix
                      <input
                        aria-label="Chave Pix"
                        required
                        value={pixKey ?? currentPlan?.pixKey ?? ""}
                        onChange={(e) => setPixKey(e.target.value)}
                        placeholder="CPF, e-mail, telefone ou chave aleatória"
                      />
                    </label>
                    <label>
                      Nome do favorecido
                      <input
                        aria-label="Nome do favorecido"
                        required
                        value={pixName ?? currentPlan?.pixName ?? ""}
                        onChange={(e) => setPixName(e.target.value)}
                        placeholder="Nome que aparece no seu banco"
                      />
                    </label>
                    <div className="form-row">
                      <label>
                        Valor (R$)
                        <input
                          aria-label="Valor do plano"
                          type="number"
                          min={1}
                          max={10000}
                          required
                          value={price ?? currentPlan?.price ?? 150}
                          onChange={(e) => setPrice(Number(e.target.value))}
                        />
                      </label>
                      <label>
                        Duração (dias)
                        <input
                          aria-label="Duração do plano em dias"
                          type="number"
                          min={1}
                          max={365}
                          required
                          value={days ?? currentPlan?.days ?? 30}
                          onChange={(e) => setDays(Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <p className="form-help">
                      Cadastre a chave da sua conta bancária. O sistema não cria
                      uma conta Pix nem confirma pagamentos automaticamente.
                    </p>
                    <button className="button primary" disabled={!!busy}>
                      {busy === "settings" ? (
                        <Loader2 size={16} className="spin" />
                      ) : (
                        <Check size={16} />
                      )}
                      Salvar configurações
                    </button>
                  </form>
                </section>
              )}
            </div>
          )}
          {page === "settings" && session && <PasswordSettings />}
          <footer className="main-footer">
            <span>
              <span className="tiny-focus purple" /> visiontrack{" "}
              <span className="muted">
                · Feito para quem cuida de cada detalhe.
              </span>
            </span>
            <button onClick={() => setHelp(true)}>
              Precisa de uma mão? <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {help && (
        <div className="modal-backdrop">
          <dialog open
            className="auth-modal help-modal"
            aria-label="Ajuda VisionTrack"
            aria-modal="true"
          >
            <button
              className="icon-button modal-close"
              onClick={() => setHelp(false)}
              aria-label="Fechar ajuda"
            >
              <X size={20} />
            </button>
            <div className="section-icon large">
              <Camera size={24} />
            </div>
            <h2>Da bancada para o cliente.</h2>
            <ol>
              <li>Crie sua conta e faça o Pix do plano.</li>
              <li>Aguarde a ativação feita pelo administrador.</li>
              <li>
                Conecte sua webcam e preencha cliente, aparelho e serviço.
              </li>
              <li>
                Confirme o aparelho na bancada e a autorização do cliente.
              </li>
              <li>Grave, finalize e clique em “Salvar e gerar link”.</li>
              <li>
                Copie o link e envie ao cliente. Ele verá somente o vídeo.
              </li>
            </ol>
            <div className="pending-info">
              Use Chrome ou Edge e permita a câmera. Não feche a página durante
              a gravação ou o envio. Nenhum áudio é capturado. O link pode ser
              aberto por quem o receber; compartilhe apenas com o cliente.
            </div>
            <a
              className="button secondary full"
              href="mailto:brandonazevedo87@gmail.com"
            >
              <ExternalLink size={16} />
              Falar com o administrador
            </a>
          </dialog>
        </div>
      )}
    </div>
  );
}
