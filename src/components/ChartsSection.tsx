import React from 'react';
import { ChamadaAtiva, ResumoRecursosBase } from '../types/cbm';
import {
  calcularDistribuicaoPorNatureza,
  calcularDistribuicaoPorOrigem,
  calcularDistribuicaoPorPrioridade,
  calcularDistribuicaoPorSituacao,
  calcularDistribuicaoPorEmpenho,
  calcularEvolucaoHoras,
} from '../services/cbmStorage';
import {
  CORES_SITUACAO_ATENDIMENTO,
  CORES_SITUACAO_EMPENHO,
  DICIONARIO_SIGLAS,
  formatarDescricaoMotivoIndisponibilidade,
} from '../data/catalogoAuxiliares';
import {
  BarChart3,
  TrendingUp,
  PhoneCall,
  PieChart,
  Truck,
  Send,
  Check,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface ChartsSectionProps {
  chamadas: ChamadaAtiva[];
  resumoRecursos?: ResumoRecursosBase;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ chamadas, resumoRecursos }) => {
  const [modoHoras, setModoHoras] = React.useState<'24h' | '12h'>('24h');
  const [abaSituacao, setAbaSituacao] = React.useState<'chamadas' | 'empenhos'>('chamadas');
  const [copiadoWhatsApp, setCopiadoWhatsApp] = React.useState(false);

  const distribuicaoNatureza = calcularDistribuicaoPorNatureza(chamadas);
  const distribuicaoSituacao = calcularDistribuicaoPorSituacao(chamadas);
  const distribuicaoEmpenho = calcularDistribuicaoPorEmpenho(chamadas);
  const distribuicaoOrigem = calcularDistribuicaoPorOrigem(chamadas);
  const distribuicaoPrioridade = calcularDistribuicaoPorPrioridade(chamadas);
  const evolucaoHoras = calcularEvolucaoHoras(chamadas, modoHoras);

  const maxHora = Math.max(...evolucaoHoras.map((h) => h.total), 1);
  const maxNatureza = Math.max(...distribuicaoNatureza.map((n) => n.total), 1);
  const totalChamadas = chamadas.length || 1;
  const totalRecursos = chamadas.reduce((acc, c) => acc + c.recursos.length, 0) || 1;

  // Formatação do texto do card para envio via WhatsApp
  const gerarTextoWhatsApp = () => {
    const agora = new Date();
    const dataHora = agora.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const linhas: string[] = [
      `*🚨 CBMMG - OCORRÊNCIAS POR NATUREZA (MAIS FREQUENTES)*`,
      `📅 _Posição em: ${dataHora}_`,
      `📊 _Total de chamadas ativas analisadas: ${totalChamadas}_`,
      ``,
      `*Ranking das Naturezas:*`,
    ];

    if (distribuicaoNatureza.length === 0) {
      linhas.push(`_Nenhuma ocorrência registrada no momento._`);
    } else {
      distribuicaoNatureza.forEach((item, index) => {
        const pct = Math.round((item.total / totalChamadas) * 100);
        linhas.push(`${index + 1}. *${item.nome}*: ${item.total} (${pct}%)`);
      });
    }

    linhas.push(``);
    linhas.push(`🚒 _Fonte: Sistema CAD • COBOM_`);

    return linhas.join('\n');
  };

  const handleCopiarWhatsApp = async () => {
    const texto = gerarTextoWhatsApp();
    let copiado = false;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
        copiado = true;
      }
    } catch {
      // Fallback abaixo
    }

    if (!copiado) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = texto;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copiado = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (e) {
        console.error('Falha ao copiar texto para WhatsApp:', e);
      }
    }

    setCopiadoWhatsApp(true);
    setTimeout(() => {
      setCopiadoWhatsApp(false);
    }, 4000);
  };

  // Identificar hora de pico
  const horaPico = evolucaoHoras.reduce(
    (max, cur) => (cur.total > max.total ? cur : max),
    evolucaoHoras[0] || { hora: '--', total: 0 }
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Evolução Temporal das Aberturas por Hora */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-slate-800/70 pb-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-400 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Ocorrências por Hora
            </h3>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {horaPico.total > 0 && (
              <span className="text-[11px] text-amber-300/90 hidden md:inline tabular-nums">
                Pico: <strong>{horaPico.hora}</strong> ({horaPico.total})
              </span>
            )}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setModoHoras('24h')}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  modoHoras === '24h'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Visualizar distribuição nas 24 horas do dia (00h às 23h)"
              >
                24h
              </button>
              <button
                onClick={() => setModoHoras('12h')}
                className={`px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  modoHoras === '12h'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Visualizar apenas as últimas 12 horas"
              >
                12h
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Bar Timeline Chart */}
        <div className="w-full overflow-x-auto overflow-y-hidden pb-2 pt-5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-950">
          <div className="min-w-[560px] h-36 flex items-end gap-1.5 px-1">
            {evolucaoHoras.map((item, idx) => {
              const pct = item.total > 0 ? Math.round((item.total / maxHora) * 100) : 0;
              const isPico = item.total === horaPico.total && item.total > 0;
              return (
                <div
                  key={idx}
                  className="flex-1 min-w-[18px] max-w-[28px] flex flex-col items-center gap-1 group h-full justify-end cursor-pointer"
                  title={`Hora: ${item.hora} • ${item.total} ocorrência(s)`}
                >
                  <div className="relative w-full flex items-end justify-center h-28">
                    {item.total > 0 && (
                      <span
                        className={`absolute -top-5 text-[9px] font-mono font-bold transition px-1 rounded tabular-nums ${
                          isPico
                            ? 'text-amber-300 bg-amber-950/70 border border-amber-800/60'
                            : 'text-slate-300 opacity-0 group-hover:opacity-100 bg-slate-950'
                        }`}
                      >
                        {item.total}
                      </span>
                    )}
                    <div
                      style={{ height: item.total > 0 ? `${Math.max(pct, 8)}%` : '3px' }}
                      className={`w-full rounded-t transition-all duration-300 ${
                        isPico
                          ? 'bg-amber-400'
                          : item.total > 0
                          ? 'bg-red-500/80 group-hover:bg-red-400'
                          : 'bg-slate-800/60'
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[9px] font-mono transition whitespace-nowrap ${
                      isPico
                        ? 'text-amber-400 font-bold'
                        : item.total > 0
                        ? 'text-slate-300 group-hover:text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.hora}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <span>
            Pico: <strong className="text-amber-300 tabular-nums">{horaPico.hora}</strong> ({horaPico.total} chamadas)
          </span>
          <span className="text-slate-300 tabular-nums">
            Total: <strong>{chamadas.length}</strong>
          </span>
        </div>
      </div>

      {/* 2. Ocorrências por Natureza de Atendimento */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/70 pb-2.5 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
              Naturezas Mais Frequentes
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-500 hidden sm:inline">Top 7</span>
            <button
              onClick={handleCopiarWhatsApp}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer shadow-sm active:scale-95 ${
                copiadoWhatsApp
                  ? 'bg-emerald-900/90 text-emerald-200 border-emerald-500 ring-1 ring-emerald-500/40'
                  : 'bg-emerald-950/70 hover:bg-emerald-900/90 text-emerald-400 border-emerald-700/60'
              }`}
              title="Copiar texto formatado deste card para envio no WhatsApp"
            >
              {copiadoWhatsApp ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-[11px] font-bold">Copiado p/ WhatsApp!</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px]">Enviar WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback com confirmação e atalho direto para o WhatsApp */}
        {copiadoWhatsApp && (
          <div className="mb-2 bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 px-3 py-1.5 rounded-lg text-[11px] flex items-center justify-between animate-in fade-in">
            <span className="flex items-center gap-1.5 truncate">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Texto copiado com formatação! Cole no WhatsApp (Ctrl+V).</span>
            </span>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(gerarTextoWhatsApp())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-300 hover:text-white underline font-semibold flex items-center gap-1 ml-2 shrink-0"
              title="Abrir no aplicativo ou web do WhatsApp"
            >
              <span>Abrir WhatsApp</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <div className="space-y-2.5 my-auto">
          {distribuicaoNatureza.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Nenhuma natureza no filtro selecionado
            </div>
          ) : (
            distribuicaoNatureza.map((item, idx) => {
              const pct = Math.round((item.total / totalChamadas) * 100);
              const barWidth = Math.round((item.total / maxNatureza) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-300 truncate max-w-[280px]">
                      {item.nome}
                    </span>
                    <span className="font-mono font-bold text-slate-200 ml-2">
                      {item.total}{' '}
                      <span className="text-[10px] text-slate-500 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      style={{ width: `${barWidth}%` }}
                      className="bg-gradient-to-r from-amber-600 to-red-500 h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Principal ocorrência</span>
          <span className="text-amber-300/90 font-medium truncate max-w-[240px] tabular-nums">
            {distribuicaoNatureza[0]?.nome || 'Sem dados'} ({distribuicaoNatureza[0]?.total || 0})
          </span>
        </div>
      </div>

      {/* 3. Situação Operacional de Atendimento & Empenho */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-slate-800/70 pb-2.5">
          <div className="flex items-center gap-2">
            {abaSituacao === 'chamadas' ? (
              <PieChart className="w-4 h-4 text-blue-400" />
            ) : (
              <Truck className="w-4 h-4 text-amber-400" />
            )}
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {abaSituacao === 'chamadas'
                ? 'Situação do Atendimento'
                : 'Situação dos Recursos'}
            </h3>
          </div>

          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px] font-medium">
            <button
              onClick={() => setAbaSituacao('chamadas')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                abaSituacao === 'chamadas'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PieChart className="w-3 h-3" />
              Chamadas
            </button>
            <button
              onClick={() => setAbaSituacao('empenhos')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer ${
                abaSituacao === 'empenhos'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Truck className="w-3 h-3" />
              Recursos
            </button>
          </div>
        </div>

        {abaSituacao === 'chamadas' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {distribuicaoSituacao.map((item, idx) => {
              const pct = Math.round((item.total / totalChamadas) * 100);
              const siglaUpper = item.sigla?.toUpperCase();
              const cor = CORES_SITUACAO_ATENDIMENTO[siglaUpper as any] || {
                bg: 'bg-slate-800 text-slate-300',
              };
              const desc =
                DICIONARIO_SIGLAS.chamada_atendimento_situacao[siglaUpper as any] || item.situacao;

              return (
                <div
                  key={idx}
                  className="bg-slate-950/50 border border-slate-800/70 rounded-lg p-2.5 flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border border-current/20 ${cor.bg}`}
                    >
                      {siglaUpper}
                    </span>
                    <span className="text-[11px] text-slate-300 font-medium truncate capitalize">
                      {desc}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1 tabular-nums">
                    <span className="text-lg font-bold text-slate-200">{item.total}</span>
                    <span className="text-[11px] text-slate-500">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {resumoRecursos && resumoRecursos.totalBase > 0 && (
              <>
                {/* Disponibilidade na Base CAD (D / E / I) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      sigla: 'D',
                      titulo: 'Disponíveis',
                      total: resumoRecursos.disponiveisTotal,
                      vtr: resumoRecursos.viaturasDisponiveis,
                      efetivo: resumoRecursos.efetivoDisponivel,
                      badgeClass: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
                      valorClass: 'text-emerald-300',
                      extra:
                        resumoRecursos.disponiveisComRestricao > 0
                          ? `${resumoRecursos.disponiveisComRestricao} c/ restrição`
                          : undefined,
                    },
                    {
                      sigla: 'E',
                      titulo: 'Empenhados',
                      total: resumoRecursos.empenhadosTotal,
                      vtr: resumoRecursos.viaturasEmCampo,
                      efetivo: resumoRecursos.efetivoEmCampo,
                      badgeClass: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
                      valorClass: 'text-amber-300',
                      extra:
                        resumoRecursos.empenhadosComRestricao > 0
                          ? `${resumoRecursos.empenhadosComRestricao} c/ restrição`
                          : undefined,
                    },
                    {
                      sigla: 'I',
                      titulo: 'Indisponíveis',
                      total: resumoRecursos.indisponiveisTotal,
                      vtr: resumoRecursos.viaturasIndisponiveis,
                      efetivo: resumoRecursos.efetivoIndisponivel,
                      badgeClass: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
                      valorClass: 'text-rose-300',
                      extra:
                        resumoRecursos.indisponiveisComRestricao > 0
                          ? `${resumoRecursos.indisponiveisComRestricao} c/ restrição`
                          : 'Baixados / inativos',
                    },
                  ].map((item) => {
                    const pct = Math.round((item.total / resumoRecursos.totalBase) * 100);
                    return (
                      <div
                        key={item.sigla}
                        className="bg-slate-950/50 border border-slate-800/70 rounded-lg p-2.5 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border ${item.badgeClass}`}
                            >
                              {item.sigla}
                            </span>
                            <span className="text-[11px] text-slate-300 font-medium truncate">
                              {item.titulo}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                            {pct}%
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2 tabular-nums">
                          <span className={`text-lg font-bold ${item.valorClass}`}>
                            {item.total.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate">
                            {item.vtr} VTR · {item.efetivo} efet.
                          </span>
                        </div>
                        {item.extra && (
                          <div className="mt-1 text-[10px] text-slate-500 truncate tabular-nums">
                            {item.extra}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Desativados, Restrições e Expiração */}
                {(resumoRecursos.comRestricaoTotal > 0 ||
                  resumoRecursos.comExpiracaoTotal > 0 ||
                  resumoRecursos.motivosIndisponibilidade.length > 0) && (
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        Desativados & Restrições de Empenho
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 tabular-nums">
                        {resumoRecursos.comRestricaoTotal > 0 && (
                          <span className="bg-amber-950/50 border border-amber-800/60 text-amber-300 px-1.5 py-0.5 rounded">
                            {resumoRecursos.comRestricaoTotal} c/ restrição
                          </span>
                        )}
                        {resumoRecursos.comExpiracaoTotal > 0 && (
                          <span className="bg-slate-900 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                            {resumoRecursos.comExpiracaoTotal} c/ expiração
                          </span>
                        )}
                      </div>
                    </div>

                    {resumoRecursos.motivosIndisponibilidade.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {resumoRecursos.motivosIndisponibilidade.slice(0, 8).map((m) => {
                          const label = formatarDescricaoMotivoIndisponibilidade(
                            m.codigo,
                            m.descricao
                          );
                          return (
                            <span
                              key={`${m.codigo}-${m.descricao}`}
                              className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-[10px] text-slate-300 px-2 py-0.5 rounded tabular-nums"
                              title={`Código #${m.codigo} (${m.descricao}): ${m.viaturas} viaturas e ${m.efetivo} recursos de efetivo`}
                            >
                              <span className="text-rose-300 font-medium">
                                {label}
                              </span>
                              <strong className="text-white">{m.total}</strong>
                              <span className="text-slate-500">
                                ({m.viaturas} VTR / {m.efetivo} BM)
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {resumoRecursos.comRestricaoTotal > 0 && (
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Motivos de indisponibilidade convertidos pelo catálogo CAD; códigos de restrição de empenho seguem numéricos na API.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Estágio dos Empenhos em Campo */}
            <div className="space-y-1.5">
              {resumoRecursos && resumoRecursos.totalBase > 0 && (
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Estágio dos Empenhos nas Chamadas
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {distribuicaoEmpenho.length === 0 ? (
                  <div className="col-span-3 text-center py-4 text-xs text-slate-500">
                    Nenhum recurso empenhado nas ocorrências filtradas.
                  </div>
                ) : (
                  distribuicaoEmpenho.map((item, idx) => {
                    const pct = Math.round((item.total / totalRecursos) * 100);
                    const siglaUpper = item.sigla?.toUpperCase();
                    const cor = CORES_SITUACAO_EMPENHO[siglaUpper as any] || {
                      bg: 'bg-slate-800 text-slate-300',
                    };
                    const desc =
                      DICIONARIO_SIGLAS.empenho_situacao[siglaUpper as any] || item.descricao;

                    return (
                      <div
                        key={idx}
                        className="bg-slate-950/50 border border-slate-800/70 rounded-lg p-2 flex flex-col justify-between hover:border-slate-700 transition"
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border border-current/20 ${cor.bg}`}
                          >
                            {siglaUpper}
                          </span>
                          <span className="text-[11px] text-slate-300 font-medium truncate capitalize">
                            {desc}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mt-0.5 tabular-nums">
                          <span className="text-base font-bold text-amber-300">{item.total}</span>
                          <span className="text-[10px] text-slate-500">{pct}%</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-800/60 mt-2 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            {abaSituacao === 'chamadas'
              ? 'Chamadas analisadas'
              : resumoRecursos && resumoRecursos.totalBase > 0
              ? 'Base CAD / Empenhos em campo'
              : 'Recursos empenhados'}
          </span>
          <span className="text-slate-300 tabular-nums">
            {abaSituacao === 'chamadas' ? (
              <>
                Total: <strong>{totalChamadas}</strong>
              </>
            ) : resumoRecursos && resumoRecursos.totalBase > 0 ? (
              <>
                Base: <strong>{resumoRecursos.totalBase.toLocaleString('pt-BR')}</strong> · Empenho:{' '}
                <strong>{chamadas.reduce((acc, c) => acc + c.recursos.length, 0)}</strong>
              </>
            ) : (
              <>
                Total: <strong>{chamadas.reduce((acc, c) => acc + c.recursos.length, 0)}</strong>
              </>
            )}
          </span>
        </div>
      </div>

      {/* 4. Origem do Acionamento & Nível de Prioridade */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/70 pb-2.5">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Origem & Prioridade
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 my-auto">
          {/* Origem */}
          <div className="space-y-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800/70">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Canal de Entrada
            </div>
            {distribuicaoOrigem.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate">{item.origem}</span>
                <span className="font-bold text-emerald-400 tabular-nums">{item.total}</span>
              </div>
            ))}
          </div>

          {/* Prioridade */}
          <div className="space-y-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800/70">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Prioridade
            </div>
            {distribuicaoPrioridade.map((item, idx) => {
              const cor =
                item.prioridade === 'Alta'
                  ? 'text-red-400'
                  : item.prioridade === 'Média'
                  ? 'text-amber-400'
                  : 'text-blue-400';
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{item.prioridade}</span>
                  <span className={`font-bold tabular-nums ${cor}`}>{item.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
