import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Video,
  MicOff,
  ShieldCheck,
  ArrowRight,
  Circle,
  Square,
  Loader2,
  Download,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { client } from "../lib/api";

export function time(seconds: number) {
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function Workbench({
  active,
  requireAccess,
  onSaved,
}: {
  active: boolean;
  requireAccess: () => void;
  onSaved: () => void;
}) {
  const [customer, setCustomer] = useState("");
  const [device, setDevice] = useState("");
  const [service, setService] = useState("Troca de tela");
  const [confirmed, setConfirmed] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [share, setShare] = useState("");
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const start = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    if (video.current && !blob) video.current.srcObject = stream;
  }, [stream, blob]);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(
      () => setDuration(Math.floor((Date.now() - start.current) / 1000)),
      1000,
    );
    return () => clearInterval(t);
  }, [recording]);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (recording || (blob && !share)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [recording, blob, share]);
  async function connect() {
    if (!active) {
      requireAccess();
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "A câmera exige HTTPS e um navegador compatível. Abra a plataforma em uma nova aba.",
        );
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
    } catch (e) {
      setError(
        e instanceof Error && e.name === "NotAllowedError"
          ? "Permita o acesso à câmera no navegador. Nenhum microfone será utilizado."
          : "Não foi possível conectar a câmera. Verifique a permissão e se outro aplicativo está usando a webcam.",
      );
    } finally {
      setBusy(false);
    }
  }
  function begin(e: React.FormEvent) {
    e.preventDefault();
    if (!active) {
      requireAccess();
      return;
    }
    if (!stream) {
      void connect();
      return;
    }
    if (!confirmed) {
      setError("Confirme o aparelho na bancada e a autorização do cliente.");
      return;
    }
    try {
      const mimeType = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
        "video/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mimeType)
        throw new Error(
          "Seu navegador não suporta gravação. Use Chrome ou Edge atualizado.",
        );
      const r = new MediaRecorder(new MediaStream(stream.getVideoTracks()), {
        mimeType,
        videoBitsPerSecond: 1600000,
      });
      recorder.current = r;
      chunks.current = [];
      setBlob(null);
      setShare("");
      setDuration(0);
      setError("");
      r.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      r.onstop = () => {
        setDuration(Math.floor((Date.now() - start.current) / 1000));
        setBlob(
          new Blob(chunks.current, {
            type: mimeType.startsWith("video/mp4") ? "video/mp4" : "video/webm",
          }),
        );
        setRecording(false);
      };
      r.onerror = () =>
        setError(
          "A gravação encontrou um erro. Finalize e baixe o arquivo disponível.",
        );
      start.current = Date.now();
      r.start(1000);
      setRecording(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível iniciar.");
    }
  }
  async function save() {
    if (!blob) return;
    setBusy(true);
    setError("");
    try {
      const result = await client.vision.prepare({
        customer,
        device,
        service,
        duration,
        size: blob.size,
        contentType: blob.type as "video/webm" | "video/mp4",
      });
      const response = await fetch(result.url, {
        method: "PUT",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      if (!response.ok) throw new Error("Falha no envio do vídeo.");
      const ready = await client.vision.finish({ id: result.id });
      setShare(`${location.origin}/v/${ready.token}`);
      onSaved();
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "Não foi possível salvar."} O vídeo continua disponível para baixar ou tentar novamente.`,
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(share);
      setError("Link copiado. Envie ao cliente.");
    } catch {
      setError("Selecione e copie o link abaixo.");
    }
  }
  const locked = recording || !!blob;
  return (
    <div className="workbench-grid">
      <section className="panel camera-panel">
        <div className="panel-heading">
          <div>
            <span className="section-icon">
              <Camera size={18} />
            </span>
            <h3>Sua bancada</h3>
          </div>
          <span
            className={`status-chip ${recording ? "red" : stream ? "green" : ""}`}
          >
            <i />
            {recording
              ? "Gravando"
              : stream
                ? "Câmera conectada"
                : "Câmera desconectada"}
          </span>
        </div>
        <div className={`camera-screen ${stream || blob ? "connected" : ""}`}>
          {!stream && !blob && (
            <img
              className="bench-image"
              src="/images/workbench.jpg"
              alt="Imagem ilustrativa de uma bancada de manutenção"
            />
          )}
          {blob ? (
            <video aria-label="Prévia da gravação" src={url} controls muted playsInline />
          ) : (
            <video
              aria-label="Câmera da bancada"
              ref={video}
              autoPlay
              muted
              playsInline
              style={{ display: stream ? "block" : "none" }}
            />
          )}
          <div className="camera-top">
            <span className="camera-caption">
              <span className="tiny-focus" /> BANCADA 01
            </span>
            <span className="silent-tag">
              <MicOff size={13} /> Sem áudio
            </span>
          </div>
          {!stream && !blob && (
            <div className="camera-placeholder">
              <div className="camera-ring">
                <Camera size={30} strokeWidth={1.4} />
              </div>
              <h3>Um novo olhar sobre seu trabalho.</h3>
              <p>
                Conecte sua webcam e mostre ao cliente
                <br />o cuidado em cada manutenção.
              </p>
              <button
                className="button camera-connect"
                onClick={connect}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="spin" size={16} />
                ) : (
                  <Video size={16} />
                )}{" "}
                Conectar câmera <ArrowRight size={15} />
              </button>
            </div>
          )}
          {recording && (
            <div className="recording-timer">
              <i />
              {time(duration)}
            </div>
          )}
          {!stream && !blob && (
            <span className="illustration-label">
              Imagem ilustrativa · sua câmera aparecerá aqui
            </span>
          )}
          <span className="viewfinder v-tl" />
          <span className="viewfinder v-tr" />
          <span className="viewfinder v-bl" />
          <span className="viewfinder v-br" />
        </div>
        <div className="camera-footer">
          <span>
            <ShieldCheck size={16} /> Apenas vídeo. Sua privacidade em primeiro
            lugar.
          </span>
          <span className="resolution">
            {stream ? "HD · 720p" : "PRONTO PARA CONECTAR"}
          </span>
        </div>
      </section>
      <section className="panel service-panel">
        <div className="panel-heading">
          <div>
            <span className="section-icon">
              <Video size={18} />
            </span>
            <h3>Nova manutenção</h3>
          </div>
          <span className="step-tag">01 / 02</span>
        </div>
        <form onSubmit={begin}>
          <label>
            Nome do cliente
            <input
              aria-label="Nome do cliente"
              placeholder="Ex.: João Silva"
              value={customer}
              required
              disabled={locked}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </label>
          <label>
            Aparelho
            <input
              aria-label="Aparelho"
              placeholder="Ex.: iPhone 13 Pro"
              value={device}
              required
              disabled={locked}
              onChange={(e) => setDevice(e.target.value)}
            />
          </label>
          <label>
            Serviço a realizar
            <select
              aria-label="Serviço a realizar"
              value={service}
              disabled={locked}
              onChange={(e) => setService(e.target.value)}
            >
              <option>Troca de tela</option>
              <option>Troca de bateria</option>
              <option>Reparo na placa</option>
              <option>Conector de carga</option>
              <option>Diagnóstico e manutenção</option>
              <option>Outro reparo</option>
            </select>
          </label>
          <label className="confirmation">
            <input
              aria-label="Confirmar celular na bancada e autorização do cliente"
              type="checkbox"
              checked={confirmed}
              disabled={locked}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              O celular está na bancada e o cliente autorizou a gravação.
            </span>
          </label>
          {recording ? (
            <button
              type="button"
              className="button danger full"
              onClick={() => recorder.current?.stop()}
            >
              <Square size={16} fill="currentColor" /> Finalizar gravação{" "}
              <span className="button-time">{time(duration)}</span>
            </button>
          ) : blob ? (
            <>
              <button
                type="button"
                className="button primary full"
                onClick={save}
                disabled={busy || !!share}
              >
                {busy ? (
                  <Loader2 size={17} className="spin" />
                ) : share ? (
                  <Check size={17} />
                ) : (
                  <Video size={17} />
                )}{" "}
                {busy
                  ? "Enviando vídeo..."
                  : share
                    ? "Vídeo salvo"
                    : "Salvar e gerar link"}
              </button>
              <div className="saved-actions">
                <a
                  href={url}
                  download={`visiontrack-${Date.now()}.${blob.type === "video/mp4" ? "mp4" : "webm"}`}
                >
                  <Download size={14} /> Baixar vídeo
                </a>
                {share && (
                  <button
                    type="button"
                    onClick={() => {
                      setBlob(null);
                      setShare("");
                      setConfirmed(false);
                    }}
                  >
                    <RefreshCw size={14} /> Nova gravação
                  </button>
                )}
              </div>
            </>
          ) : (
            <button className="button primary full" disabled={busy}>
              <Circle size={14} fill="currentColor" />
              {!stream ? "Preparar gravação" : "Iniciar gravação"}
              <ArrowRight size={17} />
            </button>
          )}
          <p className="form-help">
            <MicOff size={12} /> A gravação não captura som ou microfone.
          </p>
        </form>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {share && (
          <div className="share-box">
            <label>
              Link exclusivo do cliente
              <input
                aria-label="Link exclusivo do cliente"
                readOnly
                value={share}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button className="button secondary full" onClick={copy}>
              <Copy size={15} /> Copiar link
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
