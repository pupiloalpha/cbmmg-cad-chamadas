import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ChamadaAtiva } from '../types/cbm';
import { CORES_SITUACAO_ATENDIMENTO, DICIONARIO_SIGLAS } from '../data/catalogoAuxiliares';
import { Maximize2, Minimize2, Navigation, Layers, Flame, ShieldAlert } from 'lucide-react';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<'dark' | 'streets'>('dark');

  // Coordenadas centrais aproximadas de Minas Gerais (Curvelo / Cordisburgo)
  const MG_CENTER: [number, number] = [-18.5, -44.5];
  const DEFAULT_ZOOM = 7;

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

      // Camada de mapa escuro tático (CartoDB Dark Matter)
      const tileUrl =
        mapStyle === 'dark'
          ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        attribution: '&copy; CBMMG CAD • OpenStreetMap contributors',
        maxZoom: 19,
      });
      tileLayer.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      // Não destruímos o mapa em cada render simples para evitar cintilação, mas no unmount sim
    };
  }, []);

  // Atualizar camada de tiles quando o estilo mudar
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    const tileUrl =
      mapStyle === 'dark'
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    L.tileLayer(tileUrl, {
      attribution: '&copy; CBMMG CAD • OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
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
          <div class="w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-125"
               style="background-color: ${corObj.hex}; border: 2.5px solid #ffffff; box-shadow: 0 0 12px ${corObj.hex};">
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
          ? c.recursos.map((r) => `<span class="bg-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-[11px] font-mono mr-1">${r.prefixo}</span>`).join('')
          : '<span class="text-slate-400 italic text-xs">Nenhum recurso empenhado ainda</span>';

      const popupContent = `
        <div class="p-1 min-w-[240px] text-slate-900 font-sans">
          <div class="flex items-center justify-between border-b pb-1 mb-1.5">
            <span class="font-mono font-bold text-xs text-red-700">${c.numeroOcorrencia}</span>
            <span class="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded" style="background-color: ${corObj.hex}20; color: ${corObj.hex};">
              ${sitTexto}
            </span>
          </div>
          <div class="font-bold text-sm text-slate-800 leading-tight mb-1">${c.descricaoNatureza}</div>
          <div class="text-xs text-slate-600 mb-2">
            📍 ${c.endereco.logradouro || ''} ${c.endereco.numero ? ', ' + c.endereco.numero : ''} - ${c.endereco.bairro || ''}, <strong>${c.endereco.municipio}</strong>
          </div>
          <div class="bg-slate-100 p-1.5 rounded text-xs mb-2">
            <div class="text-[10px] text-slate-500 uppercase font-semibold">Unidade Responsável:</div>
            <div class="font-medium text-slate-700">${c.cob} • ${c.bbm} ${c.ciaInd ? '• ' + c.ciaInd : ''}</div>
          </div>
          <div class="mb-2">
            <div class="text-[10px] text-slate-500 uppercase font-semibold mb-1">Viaturas / Efetivo:</div>
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
    <div
      className={`relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl border-red-500/50 shadow-2xl' : 'h-[500px] w-full'
      }`}
    >
      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 shadow-lg text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200 pr-2 border-r border-slate-700">
          <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>Mapa Operacional de Ocorrências</span>
        </div>
        <span className="text-slate-400">
          <strong className="text-amber-400 font-mono font-bold">{chamadasComCoords.length}</strong> plotadas no mapa
        </span>
        {chamadas.length - chamadasComCoords.length > 0 && (
          <span className="text-[11px] text-amber-500/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            {chamadas.length - chamadasComCoords.length} sem GPS
          </span>
        )}
      </div>

      {/* Floating Action Controls */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-700 shadow-lg">
        <button
          onClick={ajustarAosPontos}
          title="Ajustar visualização a todos os pontos filtrados"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition flex items-center gap-1 text-xs px-2"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span>Enquadrar Ocorrências</span>
        </button>

        <button
          onClick={centralizarMinasGerais}
          title="Visão Geral de Minas Gerais"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition text-xs px-2"
        >
          Estado MG
        </button>

        <button
          onClick={() => setMapStyle((s) => (s === 'dark' ? 'streets' : 'dark'))}
          title="Alternar estilo do mapa (Tático Noturno / Claro)"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
        >
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
        </button>

        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Sair da tela cheia' : 'Expandir mapa'}
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/90 backdrop-blur-md p-2 rounded-lg border border-slate-800 shadow-lg text-[11px] text-slate-300 space-y-1">
        <div className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
          <ShieldAlert className="w-3 h-3 text-red-400" />
          <span>Status de Atendimento</span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <span>No Local (NL)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Em Direção (ED)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Despachada (DP)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Em Controle (EC)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
            <span>Aguardando (CL)</span>
          </div>
        </div>
      </div>

      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
