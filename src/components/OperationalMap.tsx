import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ChamadaAtiva } from '../types/cbm';
import {
  CORES_SITUACAO_ATENDIMENTO,
  CORES_SITUACAO_EMPENHO,
  DICIONARIO_SIGLAS,
} from '../data/catalogoAuxiliares';
import { Maximize2, Minimize2, Navigation, Layers, Flame, ShieldAlert, Truck, ChevronDown } from 'lucide-react';

interface OperationalMapProps {
  chamadas: ChamadaAtiva[];
  onSelectChamada: (chamada: ChamadaAtiva) => void;
  unidadeSelecionada?: string;
}

export const OperationalMap: React.FC<OperationalMapProps> = ({
  chamadas,
  onSelectChamada,
  unidadeSelecionada,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'dark' | 'streets' | 'satellite'>('dark');
  const [legendaAba, setLegendaAba] = useState<'atendimento' | 'empenho'>('atendimento');
  const [showLegenda, setShowLegenda] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );

  // Coordenadas centrais aproximadas de Minas Gerais (Curvelo / Cordisburgo)
  const MG_CENTER: [number, number] = [-18.5, -44.5];
  const DEFAULT_ZOOM = 7;

  // Provedores de tiles 100% gratuitos, confiáveis e sem watermark "API KEY REQUIRED"
  const MAP_STYLES_CONFIG = {
    dark: {
      name: 'Tático (Escuro)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
      maxZoom: 19,
      maxNativeZoom: 16,
    },
    streets: {
      name: 'Vias (OpenStreetMap)',
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
      maxNativeZoom: 19,
    },
    satellite: {
      name: 'Satélite (ESRI)',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
      maxZoom: 19,
      maxNativeZoom: 18,
    },
  };

  // Filtrar ocorrências com coordenadas válidas
  const chamadasComCoords = chamadas.filter(
    (c) => c.latitude !== null && c.longitude !== null && !isNaN(c.latitude) && !isNaN(c.longitude)
  );

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Criar instância do mapa
      const map = L.map(mapContainerRef.current, {
        center: MG_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Adicionar camada inicial de tiles
      const cfg = MAP_STYLES_CONFIG[mapStyle];
      const initialTile = L.tileLayer(cfg.url, {
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
        maxNativeZoom: cfg.maxNativeZoom,
      });
      initialTile.addTo(map);
      tileLayerRef.current = initialTile;

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Não destruímos o mapa em cada render simples para evitar cintilação
    };
  }, []);

  // Atualizar camada de tiles quando o estilo mudar sem recriar marcadores
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const cfg = MAP_STYLES_CONFIG[mapStyle];
    const newTile = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      maxNativeZoom: cfg.maxNativeZoom,
    });
    newTile.addTo(map);
    tileLayerRef.current = newTile;
  }, [mapStyle]);

  // Atualizar marcadores quando as chamadas mudarem
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    chamadasComCoords.forEach((c) => {
      const lat = c.latitude!;
      const lng = c.longitude!;
      bounds.extend([lat, lng]);

      const sitAtend = c.codigoSituacaoAtendimentoChamada;
      const corObj = CORES_SITUACAO_ATENDIMENTO[sitAtend] || { hex: '#ef4444' };
      const isUrgent = c.prioridade === 'Alta';
      const isWaiting = c.codigoSituacaoChamada === 'A';

      // Ícone customizado baseado em HTML
      const htmlIcon = `
        <div class="relative group cursor-pointer">
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform transform hover:scale-110"
               style="background-color: ${corObj.hex}; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.45);">
            ${
              isWaiting
                ? '<div class="w-2.5 h-2.5 rounded-full bg-white animate-ping"></div>'
                : `<span class="text-white text-[10px] font-black tracking-tighter">${c.recursos.length || '•'}</span>`
            }
          </div>
          ${
            isUrgent
              ? `<div class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 border border-white rounded-full flex items-center justify-center text-[8px] text-white font-bold animate-pulse">!</div>`
              : ''
          }
          <div class="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-slate-200 text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-700 shadow pointer-events-none hidden group-hover:block z-50">
            ${c.numeroOcorrencia}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-cbm-marker',
        html: htmlIcon,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const sitTexto = DICIONARIO_SIGLAS.chamada_atendimento_situacao[sitAtend] || sitAtend;
      const recursosTexto =
        c.recursos.length > 0
          ? c.recursos.map((r) => {
              const codEmp = r.codigoSituacaoEmpenhoRecurso || 'ED';
              const empDesc = DICIONARIO_SIGLAS.empenho_situacao[codEmp] || codEmp;
              return `<span class="bg-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono mr-1 inline-block" title="Situação de Empenho (${codEmp}): ${empDesc}">${r.prefixo} <span class="text-[9px] text-slate-300 font-bold">[${codEmp} - ${empDesc}]</span></span>`;
            }).join(' ')
          : '<span class="text-slate-400 italic text-xs">Nenhum recurso empenhado ainda</span>';

      const popupContent = `
        <div class="p-1 min-w-[260px] text-slate-900 font-sans">
          <div class="flex items-center justify-between border-b pb-1 mb-1.5">
            <span class="font-mono font-bold text-xs text-red-700">${c.numeroOcorrencia}</span>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" style="background-color: ${corObj.hex}20; color: ${corObj.hex}; border: 1px solid ${corObj.hex}40;">
              ${sitAtend} • ${sitTexto}
            </span>
          </div>
          <div class="font-bold text-sm text-slate-800 leading-tight mb-1">${c.descricaoNatureza}</div>
          <div class="text-xs text-slate-600 mb-2">
            📍 ${c.endereco.logradouro || ''} ${c.endereco.numero ? ', ' + c.endereco.numero : ''} - ${c.endereco.bairro || ''}, <strong>${c.endereco.municipio}</strong>
          </div>
          <div class="bg-slate-100 p-1.5 rounded text-xs mb-2">
            <div class="text-[10px] text-slate-500 uppercase font-semibold">Unidade Responsável:</div>
            <div class="font-medium text-slate-700">${c.cob} • ${c.bbm}${c.ciaInd ? ' • ' + c.ciaInd : ''}${c.subunidade ? ' • ' + c.subunidade : ''}</div>
            ${
              (c.semAreaDefinida || c.cob === 'CEB') && c.areaCob
                ? `<div class="text-[10px] text-sky-700 mt-0.5">Atuação na área: ${c.areaCob} • ${c.areaBbm}${c.areaCiaInd ? ' • ' + c.areaCiaInd : ''}</div>`
                : ''
            }
          </div>
          <div class="mb-2">
            <div class="text-[10px] text-slate-500 uppercase font-semibold mb-1">Viaturas e Recursos:</div>
            <div class="flex flex-wrap gap-1">${recursosTexto}</div>
          </div>
          <button id="btn-detalhes-${c.idChamada}" class="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-2 rounded transition text-center block mt-1 cursor-pointer">
            Ver Ficha Operacional Completa →
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 320,
        className: 'cbmmg-popup',
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-detalhes-${c.idChamada}`);
        if (btn) {
          btn.onclick = () => onSelectChamada(c);
        }
      });

      markersGroup.addLayer(marker);
    });

    // Ajustar zoom se houver pontos e não estiver fixado
    if (chamadasComCoords.length > 0 && map) {
      if (chamadasComCoords.length === 1) {
        map.setView([chamadasComCoords[0].latitude!, chamadasComCoords[0].longitude!], 13);
      } else {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [chamadasComCoords.length, unidadeSelecionada]);

  // Efeito crítico: recalcula o tamanho do container Leaflet ao alternar tela cheia ou redimensionar janela
  useEffect(() => {
    const map = mapInstanceRef.current;
    const container = mapContainerRef.current;
    if (!map) return;

    const recalcular = () => {
      map.invalidateSize({ animate: false });
    };

    const raf = requestAnimationFrame(recalcular);
    const t1 = setTimeout(recalcular, 50);
    const t2 = setTimeout(recalcular, 200);

    let observer: ResizeObserver | null = null;
    if (container && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        recalcular();
      });
      observer.observe(container);
    }

    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      observer?.disconnect();
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Listener para redimensionamento de janela e tecla Esc
  useEffect(() => {
    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize({ animate: false });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const centralizarMinasGerais = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(MG_CENTER, DEFAULT_ZOOM);
    }
  };

  const ajustarAosPontos = () => {
    if (mapInstanceRef.current && chamadasComCoords.length > 0) {
      const bounds = L.latLngBounds(
        chamadasComCoords.map((c) => [c.latitude!, c.longitude!] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
    }
  };

  return (
    <>
      {isFullscreen ? (
        <div
          key="operational-map-backdrop"
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[9998]"
          onClick={() => setIsFullscreen(false)}
        />
      ) : null}
      <div
        key="operational-map-container"
        className={
          isFullscreen
            ? 'fixed inset-2 sm:inset-4 md:inset-6 z-[9999] rounded-2xl overflow-hidden border-2 border-red-500/80 bg-slate-900 shadow-[0_0_60px_rgba(0,0,0,0.95)]'
            : 'relative h-[calc(100dvh-10rem)] min-h-[380px] md:h-[500px] w-full z-10 rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl'
        }
      >
      {/* Clean Top Overlay Container (non-overlapping on mobile & desktop) */}
      <div className="absolute top-2.5 inset-x-2.5 z-[1000] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Top-Left: Map Counter Pill */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700/80 shadow-lg text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Flame className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="hidden sm:inline">Mapa Operacional</span>
          </div>
          <span className="hidden sm:inline text-slate-700">|</span>
          <span className="text-slate-300 tabular-nums">
            <strong className="text-white font-bold">{chamadasComCoords.length}</strong> no mapa
          </span>
          {chamadas.length - chamadasComCoords.length > 0 && (
            <span className="text-[11px] text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 tabular-nums">
              +{chamadas.length - chamadasComCoords.length} sem GPS
            </span>
          )}
        </div>

        {/* Top-Right: Floating Action Controls */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 shadow-lg">
          <button
            type="button"
            onClick={ajustarAosPontos}
            title="Enquadrar todos os pontos filtrados"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition flex items-center gap-1 text-xs px-2 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Enquadrar</span>
          </button>

          <button
            type="button"
            onClick={centralizarMinasGerais}
            title="Visão geral de Minas Gerais"
            className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition text-xs px-2 cursor-pointer"
          >
            MG
          </button>

          {/* Seletor de estilo do mapa */}
          <div className="flex items-center bg-slate-950/80 rounded-md p-0.5 border border-slate-800">
            <button
              type="button"
              onClick={() => setMapStyle('dark')}
              title="Camada Tática Noturna"
              className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                mapStyle === 'dark' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tático
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('streets')}
              title="Camada Urbana de Vias"
              className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                mapStyle === 'streets' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vias
            </button>
            <button
              type="button"
              onClick={() => setMapStyle('satellite')}
              title="Camada Satélite"
              className={`px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                mapStyle === 'satellite' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Satélite
            </button>
          </div>

          {/* Botão Expandir / Recolher */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Recolher mapa (Esc)' : 'Expandir mapa em tela cheia'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              isFullscreen
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Recolher</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expandir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Map Legend: Situação de Atendimento & Empenho */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] max-w-[calc(100%-4.5rem)] sm:max-w-xl">
        {!showLegenda ? (
          <button
            type="button"
            onClick={() => setShowLegenda(true)}
            className="flex items-center gap-1.5 bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 shadow-lg text-[11px] font-medium text-slate-200 transition cursor-pointer"
            title="Exibir legenda de situações"
          >
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Legenda</span>
          </button>
        ) : (
          <div className="bg-slate-950/92 backdrop-blur-md p-2.5 rounded-lg border border-slate-800 shadow-xl text-[11px] text-slate-300">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-800 pb-1.5 gap-2">
              <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setLegendaAba('atendimento')}
                  className={`px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer ${
                    legendaAba === 'atendimento'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldAlert className="w-3 h-3 text-red-400" />
                  Atendimento
                </button>
                <button
                  type="button"
                  onClick={() => setLegendaAba('empenho')}
                  className={`px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer ${
                    legendaAba === 'empenho'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Truck className="w-3 h-3 text-amber-400" />
                  Recursos
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowLegenda(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                title="Ocultar legenda"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

        {legendaAba === 'atendimento' ? (
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-mono font-bold text-red-300">NL</span>
              <span className="text-slate-400">no local</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-mono font-bold text-amber-300">ED</span>
              <span className="text-slate-400">em direção</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-mono font-bold text-blue-300">DP</span>
              <span className="text-slate-400">despachada</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono font-bold text-emerald-300">EC</span>
              <span className="text-slate-400">em controle</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-mono font-bold text-purple-300">CL</span>
              <span className="text-slate-400">classificada</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="font-mono font-bold text-cyan-300">AO</span>
              <span className="text-slate-400">atribuída ao órgão</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="font-mono font-bold text-orange-300">LI</span>
              <span className="text-slate-400">local intermediário</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="font-mono font-bold text-slate-300">ER</span>
              <span className="text-slate-400">em retorno</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="font-mono font-bold text-indigo-300">EN</span>
              <span className="text-slate-400">encerrada</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="font-mono font-bold text-zinc-300">TR</span>
              <span className="text-slate-400">terminada</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-mono font-bold text-blue-300">AC</span>
              <span className="text-slate-400">a caminho</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-mono font-bold text-purple-300">SU</span>
              <span className="text-slate-400">suspenso</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span className="font-mono font-bold text-zinc-300">TR</span>
              <span className="text-slate-400">terminado</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="font-mono font-bold text-amber-300">ED</span>
              <span className="text-slate-400">em direção</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="font-mono font-bold text-indigo-300">EN</span>
              <span className="text-slate-400">encerramento</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="font-mono font-bold text-cyan-300">DP</span>
              <span className="text-slate-400">despachado</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-mono font-bold text-blue-300">AC</span>
              <span className="text-slate-400">a caminho</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="font-mono font-bold text-slate-300">ER</span>
              <span className="text-slate-400">em retorno</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono font-bold text-emerald-300">NL</span>
              <span className="text-slate-400">no local</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="font-mono font-bold text-orange-300">LI</span>
              <span className="text-slate-400">no local intermediário</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              <span className="font-mono font-bold text-teal-300">EC</span>
              <span className="text-slate-400">em controle</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-mono font-bold text-purple-300">SU</span>
              <span className="text-slate-400">suspenso</span>
            </div>
          </div>
        )}
          </div>
        )}
      </div>

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    </>
  );
};
