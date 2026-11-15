import { useState } from "react";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { authClient } from "../lib/auth";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = signup
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (r.error)
        throw new Error(
          r.error.message || "Não foi possível entrar. Confira seus dados.",
        );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    setBusy(true);
    setError("");
    localStorage.removeItem("visiontrack.email-token");
    try {
      const r = await authClient.managedAuth.signIn({ provider: "google" });
      if (r.error) throw new Error(r.error.message);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no acesso Google.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <dialog open
        className="auth-modal"
        aria-modal="true"
        aria-label="Acessar VisionTrack"
      >
        <button
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        <div className="brand modal-brand">
          <span className="brand-mark" />
          visiontrack<span className="brand-dot">.</span>
        </div>
        <h2>
          {signup
            ? "Sua bancada, mais transparente."
            : "Bom ter você de volta."}
        </h2>
        <p className="muted">
          {signup
            ? "Crie sua conta. A ativação é feita pelo administrador após o Pix."
            : "Entre para acessar sua bancada e suas gravações."}
        </p>
        <div className="auth-tabs">
          <button
            className={!signup ? "selected" : ""}
            onClick={() => setSignup(false)}
          >
            Entrar
          </button>
          <button
            className={signup ? "selected" : ""}
            onClick={() => setSignup(true)}
          >
            Criar conta
          </button>
        </div>
        <button
          className="button google-button"
          disabled={busy}
          onClick={google}
        >
          <span className="google-g">G</span> Continuar com Google
        </button>
        <div className="divider-text">ou use seu e-mail</div>
        <form onSubmit={submit}>
          {signup && (
            <label>
              Seu nome
              <input
                aria-label="Seu nome"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Como podemos chamar você?"
              />
            </label>
          )}
          <label>
            E-mail
            <input
              aria-label="E-mail"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </label>
          <label>
            Senha
            <input
              aria-label="Senha"
              type="password"
              required
              minLength={8}
              autoComplete={signup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Pelo menos 8 caracteres"
            />
          </label>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" disabled={busy}>
            {busy ? (
              <Loader2 className="spin" size={18} />
            ) : (
              <ArrowRight size={18} />
            )}{" "}
            {signup ? "Criar minha conta" : "Acessar minha bancada"}
          </button>
        </form>
        <p className="auth-footnote">
          Administrador: entre com Google usando brandonazevedo87@gmail.com.
        </p>
      </dialog>
    </div>
  );
}
