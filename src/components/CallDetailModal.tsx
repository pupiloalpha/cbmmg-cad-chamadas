import React, { useState } from 'react';
import { ChamadaAtiva } from '../types/cbm';
import { CORES_SITUACAO_ATENDIMENTO, DICIONARIO_SIGLAS } from '../data/catalogoAuxiliares';
import {
  X,
  MapPin,
  Clock,
  Truck,
  Shield,
  Radio,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Users,
} from 'lucide-react';

interface CallDetailModalProps {
  chamada: ChamadaAtiva | null;
  onClose: () => void;
}

export const CallDetailModal: React.FC<CallDetailModalProps> = ({ chamada, onClose }) => {
  const [copiado, setCopiado] = useState(false);
  if (!chamada) return null;

  const corObj = CORES_SITUACAO_ATENDIMENTO[chamada.codigoSituacaoAtendimentoChamada] || {
    hex: '#ef4444',
    bg: 'bg-red-500/20 text-red-300',
  };
  const sitTexto =
    DICIONARIO_SIGLAS.chamada_atendimento_situacao[chamada.codigoSituacaoAtendimentoChamada] ||
    chamada.codigoSituacaoAtendimentoChamada;
  const sitChamadaTexto =
    DICIONARIO_SIGLAS.SituacaoChamada[chamada.codigoSituacaoChamada] ||
    chamada.codigoSituacaoChamada;
  const origemTexto =
    DICIONARIO_SIGLAS.origem_acionamento[chamada.codigoOrigemChamada] ||
    chamada.codigoOrigemChamada;

  const copiarDados = () => {
    const texto = `CBMMG CAD - Ocorrência: ${chamada.numeroOcorrencia}
Natureza: ${chamada.descricaoNatureza}
Status: ${sitTexto}
Endereço: ${chamada.endereco.logradouro || ''}, ${chamada.endereco.bairro || ''} - ${chamada.endereco.municipio}/MG
Unidade: ${chamada.cob} • ${chamada.bbm}
Recursos: ${chamada.recursos.map((r) => r.prefixo).join(', ') || 'Nenhum'}`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-black text-white">
                  {chamada.numeroOcorrencia}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {chamada.idChamada}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Abertura: {new Date(chamada.dataHoraAbertura).toLocaleString('pt-BR')} (
                {chamada.tempoDecorridoMinutos || 0} min atrás)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={copiarDados}
              title={copiado ? 'Copiado!' : 'Copiar dados da chamada'}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-1"
            >
              {copiado ? (
                <span className="flex items-center gap-1 text-emerald-400 text-xs">
                  <Check className="w-4 h-4" />
                  <span>Copiado</span>
                </span>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Status Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold border"
              style={{
                backgroundColor: `${corObj.hex}25`,
                borderColor: `${corObj.hex}50`,
                color: corObj.hex,
              }}
            >
              {sitTexto} ({chamada.codigoSituacaoAtendimentoChamada})
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
              Chamada {sitChamadaTexto}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-950/40 text-red-300 border border-red-800/60 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              Prioridade {chamada.prioridade}
            </span>

            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
              <Radio className="w-3 h-3 text-amber-400" />
              {origemTexto}
            </span>
          </div>

          {/* Natureza Card */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Natureza da Ocorrência
            </span>
            <div className="text-sm font-bold text-slate-100">{chamada.descricaoNatureza}</div>
            <div className="flex items-center gap-2 pt-1 text-slate-400">
              <span className="bg-slate-800 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
                Código CAD: {chamada.codigoNatureza || 'A00'}
              </span>
              <span>•</span>
              <span>Grupo: {chamada.grupoNatureza}</span>
            </div>
          </div>

          {/* Localização Card */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                Localização do Incidente
              </span>
              {chamada.latitude && chamada.longitude && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${chamada.latitude},${chamada.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                >
                  <span>Abrir no Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="text-slate-200">
              <strong>
                {chamada.endereco.logradouro || 'Logradouro não informado'}
                {chamada.endereco.numero ? `, ${chamada.endereco.numero}` : ''}
              </strong>
              {chamada.endereco.bairro && ` - Bairro ${chamada.endereco.bairro}`}
            </div>
            <div className="text-slate-400">
              Município: <strong>{chamada.endereco.municipio}</strong> - {chamada.endereco.uf}
              {chamada.endereco.referencia && ` (Ref: ${chamada.endereco.referencia})`}
            </div>

            {chamada.latitude !== null && (
              <div className="text-[11px] font-mono text-slate-500 pt-1 border-t border-slate-800">
                Coordenadas: Lat {chamada.latitude.toFixed(5)}, Long {chamada.longitude?.toFixed(5)}
              </div>
            )}
          </div>

          {/* Unidade Responsável */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Enquadramento Militar CBMMG
            </span>
            <div className="text-sm font-semibold text-slate-200">
              {chamada.cob} • {chamada.bbm} {chamada.ciaInd ? `• ${chamada.ciaInd}` : ''}
            </div>
            <div className="text-slate-400 text-[11px]">{chamada.nomeUnidade}</div>
          </div>

          {/* Recursos Empenhados */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-500" />
                Viaturas e Recursos Operacionais ({chamada.recursos.length})
              </span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-slate-400" />
                {chamada.totalBombeiros} bombeiros empenhados
              </span>
            </div>

            {chamada.recursos.length === 0 ? (
              <p className="text-slate-500 italic py-2">
                Nenhum recurso empenhado no momento. Ocorrência aguardando disponibilidade de guarnição.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {chamada.recursos.map((r, i) => (
                  <div
                    key={i}
                    className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-start justify-between"
                  >
                    <div>
                      <div className="font-mono font-bold text-amber-400 text-xs">
                        {r.prefixo}
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium">{r.tipo}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {r.componentes || 3} militares • {r.unidadeNome || 'CBMMG'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {r.codigoSituacaoEmpenhoRecurso || 'NL'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico & Observações */}
          {chamada.historicoObservacoes && chamada.historicoObservacoes.length > 0 && (
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                Despacho e Histórico Operacional
              </span>
              <div className="space-y-1 pl-1">
                {chamada.historicoObservacoes.map((obs, idx) => (
                  <div key={idx} className="text-slate-300 text-[11px] flex items-start gap-1.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Órgãos de Apoio */}
          {chamada.orgaoApoio && (
            <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              <strong className="text-slate-300">Órgãos de Apoio empenhados:</strong>{' '}
              {chamada.orgaoApoio}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
