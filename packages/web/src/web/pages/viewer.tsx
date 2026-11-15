import { useParams } from "wouter";
import { ShieldCheck, MicOff, Clock3, Loader2, Video } from "lucide-react";
import { useVideo } from "../queries/vision";
import { time } from "../components/workbench";
export default function Viewer() {
  const { token = "" } = useParams<{ token: string }>();
  const video = useVideo(token);
  return (
    <main className="viewer-page">
      <header>
        <div className="brand">
          <span className="brand-mark" />
          visiontrack<span className="brand-dot">.</span>
        </div>
        <span>
          <ShieldCheck size={16} /> Registro de manutenção
        </span>
      </header>
      <section className="viewer-content">
        {video.isLoading ? (
          <div className="viewer-empty">
            <Loader2 size={28} className="spin" />
            <h2>Preparando seu vídeo...</h2>
          </div>
        ) : video.error ? (
          <div className="viewer-empty">
            <Video size={36} />
            <h2>Vídeo não encontrado.</h2>
            <p>Confira o link recebido ou solicite um novo link ao técnico.</p>
          </div>
        ) : (
          video.data && (
            <>
              <div className="eyebrow">TRANSPARÊNCIA EM CADA DETALHE</div>
              <h1>Seu aparelho, em boas mãos.</h1>
              <p className="muted">
                Veja o registro da manutenção do seu {video.data.device}.
              </p>
              <div className="viewer-player">
                <video
                  aria-label="Vídeo da manutenção"
                  controls
                  playsInline
                  muted
                  src={video.data.url}
                  controlsList="nodownload"
                />
                <span className="viewer-silent">
                  <MicOff size={14} />
                  Vídeo sem áudio
                </span>
              </div>
              <div className="viewer-details">
                <div>
                  <small>APARELHO</small>
                  <strong>{video.data.device}</strong>
                </div>
                <div>
                  <small>SERVIÇO</small>
                  <strong>{video.data.service}</strong>
                </div>
                <div>
                  <small>DATA</small>
                  <strong>
                    {new Date(video.data.createdAt).toLocaleDateString("pt-BR")}
                  </strong>
                </div>
                <div>
                  <small>DURAÇÃO</small>
                  <strong>
                    <Clock3 size={15} />
                    {time(video.data.duration)}
                  </strong>
                </div>
              </div>
              <p className="viewer-foot">
                <ShieldCheck size={16} />
                Este link dá acesso somente a esta gravação. Nenhum som foi
                capturado.
              </p>
            </>
          )
        )}
      </section>
      <footer>visiontrack · Cuidado que se vê. Confiança que fica.</footer>
    </main>
  );
}
