import { useState } from "react";
import { LockKeyhole, Check, Loader2 } from "lucide-react";
import { client } from "../lib/api";
export function PasswordSettings() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await client.vision.password({
        newPassword: password,
        currentPassword: current || undefined,
      });
      setMessage(
        "Senha salva. Você também pode entrar com seu e-mail e essa senha.",
      );
      setPassword("");
      setCurrent("");
    } catch {
      setMessage(
        "Não foi possível salvar. Se você já tem uma senha, informe a senha atual. A nova senha deve ter pelo menos 8 caracteres.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel settings-panel password-settings">
      <span className="section-icon large">
        <LockKeyhole size={23} />
      </span>
      <h2>Definir ou alterar senha</h2>
      <p className="muted">
        Se você entrou com Google e ainda não tem senha, deixe a senha atual em
        branco.
      </p>
      <form onSubmit={save}>
        <div className="form-row">
          <label>
            Senha atual (se já tiver)
            <input
              aria-label="Senha atual"
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </label>
          <label>
            Nova senha
            <input
              aria-label="Nova senha"
              required
              minLength={8}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Pelo menos 8 caracteres"
            />
          </label>
        </div>
        <button className="button primary" disabled={busy}>
          {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
          Salvar senha
        </button>
      </form>
      {message && (
        <output className="pending-info">
          {message}
        </output>
      )}
    </section>
  );
}
