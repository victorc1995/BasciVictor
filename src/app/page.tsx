"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Wallet,
  PiggyBank,
  BadgeDollarSign,
  CreditCard,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  ArrowRightLeft,
  Download,
  FileText,
  AlertCircle,
  CalendarRange,
  Clock,
  Layers,
  Pencil,
  BarChart3,
  TrendingUp,
  PieChart,
  Car,
  Users,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
} from "lucide-react";
import {
  CartaoBanco,
  CompraCartao,
  ContaCasa,
  ContrachequeConfirmadoMes,
  MovimentacaoPoupanca,
  Pagador,
  ParametrosSalario,
  ProjecaoMesContas,
  RendimentoExtraItem,
  TABELA_RS_2026,
  calcularContrachequeRS,
  calcularProjecao6Meses,
  calcularProjecaoParcelasCartao,
  formatarMesAnoLabel,
  formatarMoeda,
  obterStatusVencimento,
  ordenarContasPorUrgencia,
  somarMeses,
} from "@/lib/finance-engine";
import {
  INITIAL_COMPRAS_CARTAO,
  INITIAL_CONTAS_CASA,
  INITIAL_CONTRACHEQUES,
  INITIAL_POUPANCA,
  INITIAL_SALARIO_LETICIA,
  INITIAL_SALARIO_VICTOR,
} from "@/lib/initial-data";
import {
  extrairComprasDePDF,
  extrairDadosQualquerPDF,
  extrairDadosContrachequePDF,
  parsearLinhasFatura,
} from "@/lib/pdf-parser";

const obterMesAtualReal = (): string => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
};

type AbaAtiva = "inicio" | "poupanca" | "salarios" | "cartoes" | "contas" | "analise";

export default function DashboardPage() {
  const [aba, setAba] = useState<AbaAtiva>("inicio");
  const mesAtualReal = useMemo(() => obterMesAtualReal(), []);
  const [mesSelecionado, setMesSelecionado] = useState<string>(() => obterMesAtualReal());
  const [carregado, setCarregado] = useState(false);

  const handleSelecionarMes = (novoMes: string) => {
    if (!novoMes) return;
    setMesSelecionado(novoMes);
    setMesVisualizadoContas(novoMes);
    setMesVisualizadoProjecaoCartao(novoMes);
  };

  // Estados principais (persistidos em LocalStorage + Backup JSON)
  const [contasCasa, setContasCasa] = useState<ContaCasa[]>(INITIAL_CONTAS_CASA);
  const [poupanca, setPoupanca] = useState<MovimentacaoPoupanca[]>(INITIAL_POUPANCA);
  const [salVictor, setSalVictor] = useState<ParametrosSalario>(INITIAL_SALARIO_VICTOR);
  const [salLeticia, setSalLeticia] = useState<ParametrosSalario>(INITIAL_SALARIO_LETICIA);
  const [comprasCartao, setComprasCartao] = useState<CompraCartao[]>(INITIAL_COMPRAS_CARTAO);
  const [contracheques, setContracheques] = useState<Record<string, ContrachequeConfirmadoMes>>(INITIAL_CONTRACHEQUES);
  const [faturasPagas, setFaturasPagas] = useState<Record<string, boolean>>({
    "2026-11-c6-vic": true,
    "2026-11-c6-le": true,
    "2026-11-sicredi-vic": true,
    "2026-11-sicredi-le": true,
  });

  // Modal de inclusão de contas / upload de PDF na Tela Inicial
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoInclusao, setTipoInclusao] = useState<"conta" | "fatura_pdf">("conta");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState<ContaCasa["categoria"]>("Luz");
  const [categoriaManual, setCategoriaManual] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [novoVencimento, setNovoVencimento] = useState("2026-11-20");
  const [novoPagador, setNovoPagador] = useState<Pagador>("DIV");
  const [contaParcelada, setContaParcelada] = useState(false);
  const [parcelaAtual, setParcelaAtual] = useState(1);
  const [totalParcelas, setTotalParcelas] = useState(12);

  // Modal de Edição Rápida de Salários na Tela Inicial
  const [modalSalarioAberto, setModalSalarioAberto] = useState(false);
  const [modalSalarioVictorVal, setModalSalarioVictorVal] = useState("");
  const [modalSalarioLeticiaVal, setModalSalarioLeticiaVal] = useState("");

  // Upload PDF
  const [bancoPDF, setBancoPDF] = useState<CartaoBanco>("C6 Bank");
  const [statusPDF, setStatusPDF] = useState<string>("");

  // Formulário Poupança
  const [poupData, setPoupData] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [poupDesc, setPoupDesc] = useState("");
  const [poupTipo, setPoupTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [poupStatus, setPoupStatus] = useState<"CONFIRMADO" | "PREVISTO">("CONFIRMADO");
  const [poupValor, setPoupValor] = useState("");
  const [poupCat, setPoupCat] = useState<MovimentacaoPoupanca["categoria"]>("Metas / Projetos");

  // Formulário Poupança: Compra Parcelada no Cartão Paga com Saldo da Poupança
  const [compraCartaoPoupDesc, setCompraCartaoPoupDesc] = useState("");
  const [compraCartaoPoupValor, setCompraCartaoPoupValor] = useState("");
  const [compraCartaoPoupBanco, setCompraCartaoPoupBanco] = useState<CartaoBanco>("C6 Bank");
  const [compraCartaoPoupParcelas, setCompraCartaoPoupParcelas] = useState("1");
  const [compraCartaoPoupData, setCompraCartaoPoupData] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [compraCartaoPoupStatus, setCompraCartaoPoupStatus] = useState<"CONFIRMADO" | "PREVISTO">("CONFIRMADO");

  // Filtro & Visualização da Aba 4 (Cartões)
  const [bancoFiltro, setBancoFiltro] = useState<CartaoBanco>("C6 Bank");
  const [visaoCartao, setVisaoCartao] = useState<"fatura_mes" | "projecao">("fatura_mes");
  const [mesVisualizadoProjecaoCartao, setMesVisualizadoProjecaoCartao] = useState<string>("2026-12");

  // Aba 5 Contas & Projeção 6 Meses
  const [mesVisualizadoContas, setMesVisualizadoContas] = useState<string>("2026-11");
  const [contasExcluidas, setContasExcluidas] = useState<string[]>([]);

  // Aba 6: Projeção dos Próximos 6 Meses (Perfil e Mês Expandido)
  const [visaoProjecao6M, setVisaoProjecao6M] = useState<"victor" | "casal" | "leticia">("victor");
  const [mesExpandido6M, setMesExpandido6M] = useState<string | null>(null);

  // Modal / Edição de Contas Fixas
  const [contaEditando, setContaEditando] = useState<ContaCasa | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editCategoria, setEditCategoria] = useState<ContaCasa["categoria"]>("Outros");
  const [editCategoriaManual, setEditCategoriaManual] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [editQuemPaga, setEditQuemPaga] = useState<Pagador>("DIV");

  // Status de Sincronização Multi-Dispositivo e Servidor Central (Google Sheets em Tempo Real)
  const [syncStatus, setSyncStatus] = useState<"sincronizado" | "salvando" | "offline" | "carregando">("carregando");
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string | null>(null);
  const isCarregandoServidorRef = useRef(false);
  const estaSalvandoRef = useRef<boolean>(false);
  const houveEdicaoLocalRef = useRef<boolean>(false);
  const ultimaEdicaoLocalRef = useRef<number>(0);
  const timestampVersaoLocalRef = useRef<number>(0);
  const primeiraCargaConcluidaRef = useRef<boolean>(false);

  // Aplica dados sanitizados aos estados do React
  const aplicarDados = (parsed: any) => {
    if (!parsed) return;
    if (parsed.contasCasa && Array.isArray(parsed.contasCasa)) {
      let contas = parsed.contasCasa.filter(
        (c: any) => c.categoria !== "Fatura Cartão"
      );

      const temAluguelIptuJunto = contas.some(
        (c: any) =>
          c.descricao.toLowerCase().includes("aluguel + iptu") ||
          (c.id === "c1" && c.valor === 1444.35)
      );
      if (temAluguelIptuJunto) {
        contas = contas.filter(
          (c: any) =>
            !c.descricao.toLowerCase().includes("aluguel + iptu") && c.id !== "c1"
        );
        contas.push(
          { id: "c-nov-aluguel", mesAno: "2026-11", descricao: "Aluguel Residencial", categoria: "Aluguel", valor: 1329.00, vencimento: "2026-11-05", quemPaga: "DIV", pago: true, status: "CONFIRMADO", recorrente: true },
          { id: "c-nov-iptu", mesAno: "2026-11", descricao: "IPTU (9/10)", categoria: "Outros", valor: 115.35, vencimento: "2026-11-05", quemPaga: "DIV", pago: true, status: "CONFIRMADO", recorrente: true, parcelada: true, parcelaAtual: 9, totalParcelas: 10 }
        );
      }

      contas = contas.map((c: any) => {
        if (c.categoria === "Aluguel" && (c.valor === 1450 || c.valor === 1444.35 || c.descricao.toLowerCase().includes("aluguel"))) {
          return {
            ...c,
            descricao: "Aluguel Residencial",
            valor: 1329.00,
            vencimento: `${c.mesAno}-05`,
          };
        }
        return c;
      });

      const temIptuDez = contas.some(
        (c: any) => c.mesAno === "2026-12" && c.descricao.toLowerCase().includes("iptu")
      );
      if (!temIptuDez) {
        contas.push({
          id: "c-dez-iptu",
          mesAno: "2026-12",
          descricao: "IPTU (10/10)",
          categoria: "Outros",
          valor: 115.35,
          vencimento: "2026-12-05",
          quemPaga: "DIV",
          pago: false,
          status: "PREVISTO",
          recorrente: true,
          parcelada: true,
          parcelaAtual: 10,
          totalParcelas: 10,
        });
      }

      const mesesExistentes = new Set(contas.map((c: any) => c.mesAno));
      const novosMeses = INITIAL_CONTAS_CASA.filter((c) => !mesesExistentes.has(c.mesAno));
      setContasCasa([...contas, ...novosMeses]);
    }
    if (parsed.poupanca && Array.isArray(parsed.poupanca)) {
      const limpos = parsed.poupanca.map((p: any) => ({
        ...p,
        categoria: (p.categoria === "Carro / Creta" || p.categoria === "Carro/Creta") ? "Metas / Projetos" : p.categoria,
        status: p.status || "CONFIRMADO",
      }));
      setPoupanca(limpos);
    }
    if (parsed.salVictor) setSalVictor(parsed.salVictor);
    if (parsed.salLeticia) setSalLeticia(parsed.salLeticia);
    if (parsed.comprasCartao && Array.isArray(parsed.comprasCartao)) setComprasCartao(parsed.comprasCartao);
    if (parsed.contracheques) setContracheques(parsed.contracheques);
    if (parsed.faturasPagas) setFaturasPagas(parsed.faturasPagas);
    if (parsed.contasExcluidas && Array.isArray(parsed.contasExcluidas)) setContasExcluidas(parsed.contasExcluidas);
  };

  // Carrega a versão mais recente do servidor (/api/finance-data -> Google Sheets)
  const carregarDoServidor = async (silencioso = false, forcar = false) => {
    // Se o usuário está no meio de um salvamento ou editando localmente no exato momento, não sobrescreve
    if (!forcar && (estaSalvandoRef.current || houveEdicaoLocalRef.current)) {
      return;
    }

    try {
      if (!silencioso) setSyncStatus("carregando");
      // Cache-buster para garantir que navegadores móveis (Safari/Chrome iOS) não sirvam cache HTTP estático
      const res = await fetch(`/api/finance-data?_t=${Date.now()}`, {
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        // Se durante a requisição o usuário iniciou uma nova edição, não sobrescreve
        if (!forcar && (estaSalvandoRef.current || houveEdicaoLocalRef.current)) {
          return;
        }

        if (json.success && json.data) {
          const serverTs = json.updatedAt ? new Date(json.updatedAt).getTime() : 0;
          // Aplica do servidor se for mais recente ou se não temos timestamp local definido ou se forçado
          if (forcar || serverTs >= timestampVersaoLocalRef.current || timestampVersaoLocalRef.current === 0) {
            isCarregandoServidorRef.current = true;
            aplicarDados(json.data);
            timestampVersaoLocalRef.current = serverTs;
            try {
              localStorage.setItem(
                "financas_victor_leticia_v3",
                JSON.stringify({ ...json.data, _updatedAt: json.updatedAt })
              );
            } catch {}
            setSyncStatus("sincronizado");
            setUltimaSincronizacao(new Date().toLocaleTimeString());
            return;
          }
        }
      }
      setSyncStatus("sincronizado");
    } catch (e) {
      console.warn("Servidor não acessível, mantendo dados locais:", e);
      setSyncStatus("offline");
    }
  };

  // Inicialização com sincronização imediata
  useEffect(() => {
    let localSavedTimestamp = 0;
    const saved = localStorage.getItem("financas_victor_leticia_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed._updatedAt) {
          localSavedTimestamp = new Date(parsed._updatedAt).getTime();
          timestampVersaoLocalRef.current = localSavedTimestamp;
        }
        aplicarDados(parsed);
      } catch (e) {
        console.error("Erro ao ler dados salvos locais v3:", e);
      }
    } else {
      const oldSaved = localStorage.getItem("financas_victor_leticia_v2");
      if (oldSaved) {
        try {
          const old = JSON.parse(oldSaved);
          if (old.poupanca) setPoupanca(old.poupanca);
          if (old.salVictor) setSalVictor(old.salVictor);
          if (old.salLeticia) setSalLeticia(old.salLeticia);
          if (old.contracheques) setContracheques(old.contracheques);
        } catch {}
      }
      setContasCasa(INITIAL_CONTAS_CASA);
      setComprasCartao(INITIAL_COMPRAS_CARTAO);
    }
    setCarregado(true);

    // Se o dispositivo não tinha dados locais salvos (ex: celular abrindo pela primeira vez), força a carga imediata da nuvem!
    const deveForcarCarga = localSavedTimestamp === 0;
    carregarDoServidor(!deveForcarCarga, deveForcarCarga).finally(() => {
      primeiraCargaConcluidaRef.current = true;
    });

    // Revalidação automática ao voltar para a aba ou janela
    const handleRevalidar = () => {
      if (!estaSalvandoRef.current && !houveEdicaoLocalRef.current) {
        carregarDoServidor(true, false);
      }
    };

    window.addEventListener("focus", handleRevalidar);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleRevalidar();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Polling periódico leve a cada 15s para sincronizar alterações feitas em outros aparelhos
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") handleRevalidar();
    }, 15000);

    return () => {
      window.removeEventListener("focus", handleRevalidar);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  // Salva automaticamente a cada alteração real do usuário com persistência central no servidor
  useEffect(() => {
    // Não salva antes da primeira carga ser concluída
    if (!primeiraCargaConcluidaRef.current || !carregado) return;

    // Se a mudança de estado foi causada por aplicar dados vindos do servidor, NÃO salva de volta
    if (isCarregandoServidorRef.current) {
      isCarregandoServidorRef.current = false;
      return;
    }

    // Marca que houve edição real do usuário
    houveEdicaoLocalRef.current = true;
    const agora = Date.now();
    timestampVersaoLocalRef.current = agora;
    const nowIso = new Date(agora).toISOString();

    const payload = {
      contasCasa,
      poupanca,
      salVictor,
      salLeticia,
      comprasCartao,
      contracheques,
      faturasPagas,
      contasExcluidas,
    };

    // Salva imediatamente em LocalStorage com timestamp
    try {
      localStorage.setItem(
        "financas_victor_leticia_v3",
        JSON.stringify({ ...payload, _updatedAt: nowIso })
      );
    } catch {}

    // Debounce de 400ms para salvar no servidor (/api/finance-data -> Google Sheets)
    setSyncStatus("salvando");
    estaSalvandoRef.current = true;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/finance-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const resJson = await res.json();
          if (resJson.updatedAt) {
            timestampVersaoLocalRef.current = new Date(resJson.updatedAt).getTime();
            try {
              localStorage.setItem(
                "financas_victor_leticia_v3",
                JSON.stringify({ ...payload, _updatedAt: resJson.updatedAt })
              );
            } catch {}
          }
          houveEdicaoLocalRef.current = false;
          setSyncStatus("sincronizado");
          setUltimaSincronizacao(new Date().toLocaleTimeString());
        } else {
          setSyncStatus("offline");
        }
      } catch (e) {
        console.warn("Falha ao salvar no servidor central:", e);
        setSyncStatus("offline");
      } finally {
        estaSalvandoRef.current = false;
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [contasCasa, poupanca, salVictor, salLeticia, comprasCartao, contracheques, faturasPagas, contasExcluidas, carregado]);

  // Sincroniza parâmetros de simulação salvos para o mês específico selecionado
  useEffect(() => {
    const cc = contracheques[mesSelecionado];
    if (cc?.victorParams) {
      setSalVictor(cc.victorParams);
    }
    if (cc?.leticiaParams) {
      setSalLeticia(cc.leticiaParams);
    }
  }, [mesSelecionado]);

  const handleAtualizarSalVictor = (novo: ParametrosSalario) => {
    ultimaEdicaoLocalRef.current = Date.now();
    setSalVictor(novo);
    setContracheques((prev) => {
      const atual = prev[mesSelecionado] || {
        victorConfirmado: false,
        victorValorReal: resVictor.liquidoFolha,
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.liquidoFolha,
      };
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          victorParams: novo,
        },
      };
    });
  };

  const handleAtualizarSalLeticia = (novo: ParametrosSalario) => {
    ultimaEdicaoLocalRef.current = Date.now();
    setSalLeticia(novo);
    setContracheques((prev) => {
      const atual = prev[mesSelecionado] || {
        victorConfirmado: false,
        victorValorReal: resVictor.liquidoFolha,
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.liquidoFolha,
      };
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          leticiaParams: novo,
        },
      };
    });
  };

  // Cálculos de Salários (Legislação RS 2026)
  const resVictor = useMemo(() => calcularContrachequeRS(salVictor), [salVictor]);
  const resLeticia = useMemo(() => calcularContrachequeRS(salLeticia), [salLeticia]);

  // Contracheque do Mês Selecionado (Confirmado vs Previsão)
  const contrachequeMes = contracheques[mesSelecionado] || {
    victorConfirmado: false,
    victorValorReal: resVictor.liquidoFolha,
    leticiaConfirmada: false,
    leticiaValorReal: resLeticia.liquidoFolha,
  };

  const victorGanhosExtras =
    contrachequeMes.victorExtras?.reduce((acc, it) => acc + it.valor, 0) ||
    contrachequeMes.victorGanhosExtras ||
    0;
  const leticiaGanhosExtras =
    contrachequeMes.leticiaExtras?.reduce((acc, it) => acc + it.valor, 0) ||
    contrachequeMes.leticiaGanhosExtras ||
    0;

  const salarioVictorFinal =
    contrachequeMes.victorConfirmado && contrachequeMes.victorSalarioLiquidoFinal !== undefined
      ? contrachequeMes.victorSalarioLiquidoFinal
      : (contrachequeMes.victorConfirmado
          ? contrachequeMes.victorValorReal +
            (salVictor.incluirValeRefeicao ? resVictor.valeRefeicaoIndenizatorio : 0) +
            resVictor.valorDiarias
          : resVictor.totalDisponivelMes) + victorGanhosExtras;

  const salarioLeticiaFinal =
    contrachequeMes.leticiaConfirmada && contrachequeMes.leticiaSalarioLiquidoFinal !== undefined
      ? contrachequeMes.leticiaSalarioLiquidoFinal
      : (contrachequeMes.leticiaConfirmada
          ? contrachequeMes.leticiaValorReal +
            (salLeticia.incluirValeRefeicao ? resLeticia.valeRefeicaoIndenizatorio : 0) +
            resLeticia.valorDiarias
          : resLeticia.totalDisponivelMes) + leticiaGanhosExtras;

  const salarioLiquidoTotalCasal = salarioVictorFinal + salarioLeticiaFinal;
  const salarioPrevistoTotalCasal = resVictor.totalDisponivelMes + resLeticia.totalDisponivelMes + victorGanhosExtras + leticiaGanhosExtras;

  // Handlers para confirmação de salário líquido mensal
  const confirmarSalarioVictor = (
    valorFolha: number,
    valorFinalLiquido: number,
    diferencaCC?: number
  ) => {
    ultimaEdicaoLocalRef.current = Date.now();
    setContracheques((prev) => {
      const atual = prev[mesSelecionado] || {
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.liquidoFolha,
      };
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          victorConfirmado: true,
          victorValorReal: valorFolha,
          victorSalarioLiquidoFinal: valorFinalLiquido,
          victorDiferencaCC: diferencaCC,
          victorParams: salVictor,
        },
      };
    });
  };

  const reverterSalarioVictor = () => {
    ultimaEdicaoLocalRef.current = Date.now();
    setContracheques((prev) => {
      const atual = prev[mesSelecionado];
      if (!atual) return prev;
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          victorConfirmado: false,
          victorSalarioLiquidoFinal: undefined,
          victorDiferencaCC: undefined,
        },
      };
    });
  };

  const confirmarSalarioLeticia = (
    valorFolha: number,
    valorFinalLiquido: number,
    diferencaCC?: number
  ) => {
    ultimaEdicaoLocalRef.current = Date.now();
    setContracheques((prev) => {
      const atual = prev[mesSelecionado] || {
        victorConfirmado: false,
        victorValorReal: resVictor.liquidoFolha,
      };
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          leticiaConfirmada: true,
          leticiaValorReal: valorFolha,
          leticiaSalarioLiquidoFinal: valorFinalLiquido,
          leticiaDiferencaCC: diferencaCC,
          leticiaParams: salLeticia,
        },
      };
    });
  };

  const reverterSalarioLeticia = () => {
    ultimaEdicaoLocalRef.current = Date.now();
    setContracheques((prev) => {
      const atual = prev[mesSelecionado];
      if (!atual) return prev;
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          leticiaConfirmada: false,
          leticiaSalarioLiquidoFinal: undefined,
          leticiaDiferencaCC: undefined,
        },
      };
    });
  };

  // Handlers para rendimentos extras fora do contracheque
  const adicionarExtraVictor = (descricao: string, valor: number) => {
    setContracheques((prev) => {
      const atual = prev[mesSelecionado] || {
        victorConfirmado: false,
        victorValorReal: resVictor.liquidoFolha,
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.liquidoFolha,
      };
      const extras = [...(atual.victorExtras || []), { id: Date.now().toString(), descricao, valor }];
      const totalExtras = extras.reduce((acc, it) => acc + it.valor, 0);
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          victorExtras: extras,
          victorGanhosExtras: totalExtras,
        },
      };
    });
  };

  const removerExtraVictor = (id: string) => {
    setContracheques((prev) => {
      const atual = prev[mesSelecionado];
      if (!atual) return prev;
      const extras = (atual.victorExtras || []).filter((it) => it.id !== id);
      const totalExtras = extras.reduce((acc, it) => acc + it.valor, 0);
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          victorExtras: extras,
          victorGanhosExtras: totalExtras,
        },
      };
    });
  };

  const adicionarExtraLeticia = (descricao: string, valor: number) => {
    setContracheques((prev) => {
      const atual = prev[mesSelecionado] || {
        victorConfirmado: false,
        victorValorReal: resVictor.liquidoFolha,
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.liquidoFolha,
      };
      const extras = [...(atual.leticiaExtras || []), { id: Date.now().toString(), descricao, valor }];
      const totalExtras = extras.reduce((acc, it) => acc + it.valor, 0);
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          leticiaExtras: extras,
          leticiaGanhosExtras: totalExtras,
        },
      };
    });
  };

  const removerExtraLeticia = (id: string) => {
    setContracheques((prev) => {
      const atual = prev[mesSelecionado];
      if (!atual) return prev;
      const extras = (atual.leticiaExtras || []).filter((it) => it.id !== id);
      const totalExtras = extras.reduce((acc, it) => acc + it.valor, 0);
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          leticiaExtras: extras,
          leticiaGanhosExtras: totalExtras,
        },
      };
    });
  };

  // Handlers para modal de edição rápida de salários na Tela Inicial
  const abrirModalSalario = () => {
    setModalSalarioVictorVal(
      contrachequeMes.victorConfirmado
        ? contrachequeMes.victorValorReal.toFixed(2)
        : resVictor.liquidoFolha.toFixed(2)
    );
    setModalSalarioLeticiaVal(
      contrachequeMes.leticiaConfirmada
        ? contrachequeMes.leticiaValorReal.toFixed(2)
        : resLeticia.liquidoFolha.toFixed(2)
    );
    setModalSalarioAberto(true);
  };

  const salvarModalSalario = (e: React.FormEvent) => {
    e.preventDefault();
    const vVal = parseFloat(modalSalarioVictorVal.replace(",", "."));
    const lVal = parseFloat(modalSalarioLeticiaVal.replace(",", "."));

    setContracheques((prev) => {
      const atual = prev[mesSelecionado] || {
        victorConfirmado: false,
        victorValorReal: resVictor.liquidoFolha,
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.liquidoFolha,
      };
      return {
        ...prev,
        [mesSelecionado]: {
          ...atual,
          victorConfirmado: !isNaN(vVal) && vVal > 0 ? true : atual.victorConfirmado,
          victorValorReal: !isNaN(vVal) && vVal > 0 ? vVal : atual.victorValorReal,
          leticiaConfirmada: !isNaN(lVal) && lVal > 0 ? true : atual.leticiaConfirmada,
          leticiaValorReal: !isNaN(lVal) && lVal > 0 ? lVal : atual.leticiaValorReal,
        },
      };
    });
    setModalSalarioAberto(false);
  };

  // Compras de Cartão com "Quem Paga = POUP" mapeadas automaticamente para a Poupança
  const comprasPoupancaAuto = useMemo(() => {
    return comprasCartao
      .filter((c) => c.quemPaga === "POUP")
      .map((c) => {
        let dataIso = `${c.mesFatura}-05`;
        if (c.dataCompra) {
          const matchCompleto = c.dataCompra.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})$/);
          if (matchCompleto) {
            let ano = matchCompleto[3];
            if (ano.length === 2) ano = "20" + ano;
            dataIso = `${ano}-${matchCompleto[2].padStart(2, "0")}-${matchCompleto[1].padStart(2, "0")}`;
          } else {
            const matchDia = c.dataCompra.match(/^(\d{1,2})/);
            if (matchDia) {
              dataIso = `${c.mesFatura}-${matchDia[1].padStart(2, "0")}`;
            }
          }
        }

        const faturaChave = `${c.mesFatura}-${c.banco === "Sicredi" ? "sicredi" : "c6"}-vic`;
        const faturaPaga = Boolean(faturasPagas[faturaChave] || c.mesFatura < mesAtualReal);
        const parcStr = c.parcelaInfo ? ` (${c.parcelaInfo})` : "";

        const mov: MovimentacaoPoupanca = {
          id: `poup-cartao-${c.id}`,
          data: dataIso,
          descricao: `[Cartão ${c.banco}] ${c.descricao}${parcStr}`,
          tipo: "SAIDA",
          valor: c.valor,
          categoria: "Cartão de Crédito",
          status: faturaPaga ? "CONFIRMADO" : "PREVISTO",
          origemCartao: c.banco,
          origemCompraId: c.id,
          mesFatura: c.mesFatura,
        };
        return mov;
      });
  }, [comprasCartao, faturasPagas, mesAtualReal]);

  // Contas da casa com "Quem Paga = POUP" mapeadas automaticamente para a Poupança
  const contasPoupancaAuto = useMemo(() => {
    return contasCasa
      .filter((c) => c.quemPaga === "POUP" && c.categoria !== "Fatura Cartão")
      .map((c) => {
        const mov: MovimentacaoPoupanca = {
          id: `poup-conta-${c.id}`,
          data: c.vencimento,
          descricao: `[Conta Casa] ${c.descricao}`,
          tipo: "SAIDA",
          valor: c.valor,
          categoria: "Outros",
          status: c.pago ? "CONFIRMADO" : "PREVISTO",
          origemContaId: c.id,
          mesFatura: c.mesAno,
        };
        return mov;
      });
  }, [contasCasa]);

  // Lista unificada completa de movimentações da poupança (manuais + automáticas de cartões e contas)
  const poupancaCompleta = useMemo(() => {
    return [...poupanca, ...comprasPoupancaAuto, ...contasPoupancaAuto];
  }, [poupanca, comprasPoupancaAuto, contasPoupancaAuto]);

  // Cálculos de Poupança (Confirmado vs Previsão Futura)
  const resumoPoupanca = useMemo(() => {
    const totalEntradasConfirmadas = poupancaCompleta
      .filter((p) => p.tipo === "ENTRADA" && p.status !== "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const totalSaidasConfirmadas = poupancaCompleta
      .filter((p) => p.tipo === "SAIDA" && p.status !== "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const saldoConfirmado = totalEntradasConfirmadas - totalSaidasConfirmadas;

    const totalEntradasPrevistas = poupancaCompleta
      .filter((p) => p.tipo === "ENTRADA" && p.status === "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const totalSaidasPrevistas = poupancaCompleta
      .filter((p) => p.tipo === "SAIDA" && p.status === "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const saldoPrevistoPendente = totalEntradasPrevistas - totalSaidasPrevistas;
    const saldoTotalProjetado = saldoConfirmado + saldoPrevistoPendente;

    const reservaEmergencia = 5000;
    const saldoLivreConfirmado = Math.max(0, saldoConfirmado - reservaEmergencia);
    const saldoLivreProjetado = Math.max(0, saldoTotalProjetado - reservaEmergencia);

    const totalComprasCartaoPoupanca = comprasPoupancaAuto.reduce((acc, c) => acc + c.valor, 0);
    const comprasCartaoPoupancaConfirmadas = comprasPoupancaAuto
      .filter((c) => c.status === "CONFIRMADO")
      .reduce((acc, c) => acc + c.valor, 0);
    const comprasCartaoPoupancaPrevistas = comprasPoupancaAuto
      .filter((c) => c.status === "PREVISTO")
      .reduce((acc, c) => acc + c.valor, 0);

    return {
      totalEntradasConfirmadas,
      totalSaidasConfirmadas,
      saldoConfirmado,
      saldoTotal: saldoConfirmado,
      totalEntradasPrevistas,
      totalSaidasPrevistas,
      saldoPrevistoPendente,
      saldoTotalProjetado,
      reservaEmergencia,
      saldoLivreConfirmado,
      saldoLivreProjetado,
      saldoLivreMetas: saldoLivreConfirmado,
      totalComprasCartaoPoupanca,
      comprasCartaoPoupancaConfirmadas,
      comprasCartaoPoupancaPrevistas,
    };
  }, [poupancaCompleta, comprasPoupancaAuto]);

  // Lançamentos Confirmados (Realizado: mais recente para a mais antiga) e Previsões Futuras (da data mais próxima para a mais longe)
  const poupancaRealizados = useMemo(() => {
    return [...poupancaCompleta]
      .filter((p) => p.status === "CONFIRMADO")
      .sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [poupancaCompleta]);

  const poupancaPrevistos = useMemo(() => {
    return [...poupancaCompleta]
      .filter((p) => p.status === "PREVISTO")
      .sort((a, b) => (a.data || "").localeCompare(b.data || ""));
  }, [poupancaCompleta]);

  // Projeção dos Próximos 6 Meses para a Aba 5 Contas
  const projecao6Meses = useMemo(() => {
    return calcularProjecao6Meses(mesSelecionado, contasCasa, comprasCartao, contasExcluidas);
  }, [mesSelecionado, contasCasa, comprasCartao, contasExcluidas]);

  // Sincroniza mês visualizado da aba contas quando muda o mês principal
  useEffect(() => {
    setMesVisualizadoContas(mesSelecionado);
  }, [mesSelecionado]);

  // Dados do mês visualizado na Aba 5 (Contas & Projeção)
  const dadosMesVisualizado = useMemo(() => {
    const found = projecao6Meses.find((p) => p.mesAno === mesVisualizadoContas);
    if (found) return found;
    return (
      projecao6Meses[0] || {
        mesAno: mesVisualizadoContas,
        label: formatarMesAnoLabel(mesVisualizadoContas),
        totalContasFixas: 0,
        totalFaturaC6: 0,
        totalFaturaSicredi: 0,
        totalGeral: 0,
        isConfirmado: false,
        totalParcelasVictor: 0,
        totalParcelasLeticia: 0,
        totalContasVictor: 0,
        totalContasLeticia: 0,
        totalGeralVictor: 0,
        totalGeralLeticia: 0,
        contas: [],
        parcelasProjetadas: [],
      }
    );
  }, [projecao6Meses, mesVisualizadoContas]);

  // Dados do mês selecionado ativo (Garante sincronização 100% idêntica entre Tela 1 e Tela 5)
  const dadosMesSelecionado = useMemo(() => {
    const found = projecao6Meses.find((p) => p.mesAno === mesSelecionado);
    return found || dadosMesVisualizado;
  }, [projecao6Meses, mesSelecionado, dadosMesVisualizado]);

  // Projeção Completa dos Próximos 6 Meses com Salários e Comprometimento Detalhado (Aba 6)
  const projecao6MesesCalculada = useMemo(() => {
    return projecao6Meses.map((p) => {
      const mesKey = p.mesAno;
      const isAtual = mesKey === mesSelecionado;
      const cc = contracheques[mesKey];

      // Salário Victor
      const vicConfirmado = !!cc?.victorConfirmado;
      const vicParams = cc?.victorParams || salVictor;
      const vicCalc = calcularContrachequeRS(vicParams);
      const vicExtras = cc?.victorExtras?.reduce((acc, it) => acc + it.valor, 0) ?? (cc?.victorGanhosExtras || 0);

      let salVic = 0;
      let tagSalVic = "Previsão Simulador";
      if (isAtual) {
        salVic = salarioVictorFinal;
        tagSalVic = vicConfirmado ? "Contracheque Oficial" : "Previsão Folha";
      } else if (vicConfirmado && cc?.victorSalarioLiquidoFinal !== undefined) {
        salVic = cc.victorSalarioLiquidoFinal;
        tagSalVic = "Contracheque Oficial";
      } else if (vicConfirmado) {
        salVic =
          cc.victorValorReal +
          (vicParams.incluirValeRefeicao ? vicCalc.valeRefeicaoIndenizatorio : 0) +
          vicCalc.valorDiarias +
          vicExtras;
        tagSalVic = "Contracheque Oficial";
      } else {
        salVic = vicCalc.totalDisponivelMes + vicExtras;
        tagSalVic = cc?.victorParams ? "Simulação Mês" : "Previsão Folha";
      }

      // Salário Letícia
      const letConfirmada = !!cc?.leticiaConfirmada;
      const letParams = cc?.leticiaParams || salLeticia;
      const letCalc = calcularContrachequeRS(letParams);
      const letExtras = cc?.leticiaExtras?.reduce((acc, it) => acc + it.valor, 0) ?? (cc?.leticiaGanhosExtras || 0);

      let salLet = 0;
      let tagSalLet = "Previsão Simulador";
      if (isAtual) {
        salLet = salarioLeticiaFinal;
        tagSalLet = letConfirmada ? "Contracheque Oficial" : "Previsão Folha";
      } else if (letConfirmada && cc?.leticiaSalarioLiquidoFinal !== undefined) {
        salLet = cc.leticiaSalarioLiquidoFinal;
        tagSalLet = "Contracheque Oficial";
      } else if (letConfirmada) {
        salLet =
          cc.leticiaValorReal +
          (letParams.incluirValeRefeicao ? letCalc.valeRefeicaoIndenizatorio : 0) +
          letCalc.valorDiarias +
          letExtras;
        tagSalLet = "Contracheque Oficial";
      } else {
        salLet = letCalc.totalDisponivelMes + letExtras;
        tagSalLet = cc?.leticiaParams ? "Simulação Mês" : "Previsão Folha";
      }

      const rendaCasal = salVic + salLet;

      // Gastos Victor
      const contasVic = p.totalContasVictor;
      const cartoesVic = p.totalParcelasVictor;
      const totalComprometidoVic = p.totalGeralVictor;
      const sobraVic = salVic - totalComprometidoVic;
      const pctComprometidoVic = salVic > 0 ? (totalComprometidoVic / salVic) * 100 : 0;

      // Gastos Letícia
      const contasLet = p.totalContasLeticia;
      const cartoesLet = p.totalParcelasLeticia;
      const totalComprometidoLet = p.totalGeralLeticia;
      const sobraLet = salLet - totalComprometidoLet;
      const pctComprometidoLet = salLet > 0 ? (totalComprometidoLet / salLet) * 100 : 0;

      // Gastos Casal
      const contasCasal = p.totalContasFixas;
      const cartoesCasal = p.totalFaturaC6 + p.totalFaturaSicredi;
      const totalComprometidoCasal = p.totalGeral;
      const sobraCasal = rendaCasal - totalComprometidoCasal;
      const pctComprometidoCasal = rendaCasal > 0 ? (totalComprometidoCasal / rendaCasal) * 100 : 0;

      return {
        ...p,
        isAtual,
        // Victor
        salVic,
        tagSalVic,
        vicConfirmado,
        contasVic,
        cartoesVic,
        totalComprometidoVic,
        sobraVic,
        pctComprometidoVic,
        // Letícia
        salLet,
        tagSalLet,
        letConfirmada,
        contasLet,
        cartoesLet,
        totalComprometidoLet,
        sobraLet,
        pctComprometidoLet,
        // Casal
        rendaCasal,
        contasCasal,
        cartoesCasal,
        totalComprometidoCasal,
        sobraCasal,
        pctComprometidoCasal,
      };
    });
  }, [
    projecao6Meses,
    mesSelecionado,
    contracheques,
    salVictor,
    salLeticia,
    salarioVictorFinal,
    salarioLeticiaFinal,
  ]);

  // Métricas agregadas da Projeção dos Próximos 6 Meses conforme o perfil selecionado
  const metricasProjecao6M = useMemo(() => {
    if (projecao6MesesCalculada.length === 0) {
      return {
        mediaRenda: 0,
        mediaComprometido: 0,
        mediaSobra: 0,
        mediaPct: 0,
        mesMaiorSobra: null as any,
        maiorSobraVal: 0,
        mesMaiorComprometimento: null as any,
        maiorPctVal: 0,
      };
    }

    const n = projecao6MesesCalculada.length;
    let somaRenda = 0;
    let somaComprometido = 0;
    let somaSobra = 0;

    let mesMaiorSobra = projecao6MesesCalculada[0];
    let maiorSobraVal = -Infinity;

    let mesMaiorComprometimento = projecao6MesesCalculada[0];
    let maiorPctVal = -Infinity;

    projecao6MesesCalculada.forEach((m) => {
      const renda = visaoProjecao6M === "victor" ? m.salVic : visaoProjecao6M === "leticia" ? m.salLet : m.rendaCasal;
      const comp = visaoProjecao6M === "victor" ? m.totalComprometidoVic : visaoProjecao6M === "leticia" ? m.totalComprometidoLet : m.totalComprometidoCasal;
      const sobra = visaoProjecao6M === "victor" ? m.sobraVic : visaoProjecao6M === "leticia" ? m.sobraLet : m.sobraCasal;
      const pct = visaoProjecao6M === "victor" ? m.pctComprometidoVic : visaoProjecao6M === "leticia" ? m.pctComprometidoLet : m.pctComprometidoCasal;

      somaRenda += renda;
      somaComprometido += comp;
      somaSobra += sobra;

      if (sobra > maiorSobraVal) {
        maiorSobraVal = sobra;
        mesMaiorSobra = m;
      }

      if (pct > maiorPctVal) {
        maiorPctVal = pct;
        mesMaiorComprometimento = m;
      }
    });

    const mediaRenda = somaRenda / n;
    const mediaComprometido = somaComprometido / n;
    const mediaSobra = somaSobra / n;
    const mediaPct = mediaRenda > 0 ? (mediaComprometido / mediaRenda) * 100 : 0;

    return {
      mediaRenda,
      mediaComprometido,
      mediaSobra,
      mediaPct,
      mesMaiorSobra,
      maiorSobraVal,
      mesMaiorComprometimento,
      maiorPctVal,
    };
  }, [projecao6MesesCalculada, visaoProjecao6M]);

  // Cálculos de Cartões no Mês Selecionado (Geral Casal)
  const resumoCartoesMes = useMemo(() => {
    const doMes = comprasCartao.filter((c) => c.mesFatura === mesSelecionado);
    let vicDireto = 0;
    let leDireto = 0;
    let divTotal = 0;
    let poupTotal = 0;

    let c6Vic = 0;
    let c6Le = 0;
    let c6Div = 0;
    let c6Poup = 0;
    let sicrediVic = 0;
    let sicrediLe = 0;
    let sicrediDiv = 0;
    let sicrediPoup = 0;

    doMes.forEach((item) => {
      if (item.quemPaga === "VIC") {
        vicDireto += item.valor;
        if (item.banco === "C6 Bank") c6Vic += item.valor;
        if (item.banco === "Sicredi") sicrediVic += item.valor;
      } else if (item.quemPaga === "LE") {
        leDireto += item.valor;
        if (item.banco === "C6 Bank") c6Le += item.valor;
        if (item.banco === "Sicredi") sicrediLe += item.valor;
      } else if (item.quemPaga === "POUP") {
        poupTotal += item.valor;
        if (item.banco === "C6 Bank") c6Poup += item.valor;
        if (item.banco === "Sicredi") sicrediPoup += item.valor;
      } else {
        divTotal += item.valor;
        if (item.banco === "C6 Bank") c6Div += item.valor;
        if (item.banco === "Sicredi") sicrediDiv += item.valor;
      }
    });

    const metadeDiv = divTotal / 2;
    return {
      vicDireto,
      leDireto,
      divTotal,
      poupTotal,
      metadeDiv,
      c6Vic,
      c6Le,
      c6Div,
      c6Poup,
      sicrediVic,
      sicrediLe,
      sicrediDiv,
      sicrediPoup,
      totalVictorCartoes: vicDireto + metadeDiv,
      totalLeticiaCartoes: leDireto + metadeDiv,
      totalGeralCartoes: vicDireto + leDireto + divTotal + poupTotal,
    };
  }, [comprasCartao, mesSelecionado]);

  // Cálculos do Cartão Selecionado na Aba 4 (C6 Bank ou Sicredi exclusivamente)
  const resumoCartaoSelecionado = useMemo(() => {
    const doCartao = comprasCartao.filter(
      (c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado
    );
    let vicDireto = 0;
    let leDireto = 0;
    let divTotal = 0;
    let poupTotal = 0;

    doCartao.forEach((item) => {
      if (item.quemPaga === "VIC") vicDireto += item.valor;
      else if (item.quemPaga === "LE") leDireto += item.valor;
      else if (item.quemPaga === "POUP") poupTotal += item.valor;
      else divTotal += item.valor;
    });

    const metadeDiv = divTotal / 2;
    return {
      vicDireto,
      leDireto,
      divTotal,
      poupTotal,
      metadeDiv,
      totalVictorCartao: vicDireto + metadeDiv,
      totalLeticiaCartao: leDireto + metadeDiv,
      totalGeralCartao: vicDireto + leDireto + divTotal + poupTotal,
      quantidadeItens: doCartao.length,
    };
  }, [comprasCartao, bancoFiltro, mesSelecionado]);

  // Projeção de Parcelas Futuras do Cartão Selecionado na Aba 4
  const projecaoCartao = useMemo(() => {
    return calcularProjecaoParcelasCartao(bancoFiltro, mesSelecionado, comprasCartao);
  }, [bancoFiltro, mesSelecionado, comprasCartao]);

  const dadosMesProjecaoCartao = useMemo(() => {
    return (
      projecaoCartao.find((p) => p.mesAno === mesVisualizadoProjecaoCartao) ||
      projecaoCartao[1] ||
      projecaoCartao[0]
    );
  }, [projecaoCartao, mesVisualizadoProjecaoCartao]);

  // Cálculos de Contas da Casa + Cartões (Gasto Total de Cada Um no Mês)
  // FILTRO ESTRITO: categoria !== "Fatura Cartão" para NÃO DOBRAR o valor das faturas!
  const resumoMensalCasal = useMemo(() => {
    const contasDoMes = (dadosMesSelecionado?.contas || []).filter(
      (c) => c.categoria !== "Fatura Cartão"
    );
    let casaVic = 0;
    let casaLe = 0;
    let casaDiv = 0;
    let casaPoup = 0;

    contasDoMes.forEach((c) => {
      if (c.quemPaga === "VIC") casaVic += c.valor;
      else if (c.quemPaga === "LE") casaLe += c.valor;
      else if (c.quemPaga === "POUP") casaPoup += c.valor;
      else casaDiv += c.valor;
    });

    const totalGastoVictor = casaVic + casaDiv / 2 + resumoCartoesMes.totalVictorCartoes;
    const totalGastoLeticia = casaLe + casaDiv / 2 + resumoCartoesMes.totalLeticiaCartoes;
    const totalGastoPoupanca = casaPoup + resumoCartoesMes.poupTotal;
    const totalGastoCasal = totalGastoVictor + totalGastoLeticia + totalGastoPoupanca;

    return {
      contasDoMes,
      totalGastoVictor,
      totalGastoLeticia,
      totalGastoPoupanca,
      totalGastoCasal,
      saldoVictor: salarioVictorFinal - totalGastoVictor,
      saldoLeticia: salarioLeticiaFinal - totalGastoLeticia,
    };
  }, [dadosMesSelecionado, resumoCartoesMes, salarioVictorFinal, salarioLeticiaFinal]);

  // Alterna status pago/pendente de faturas de cartão na Tela Inicial
  const alternarPagoFatura = (chave: string) => {
    setFaturasPagas((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  // Lista unificada de Contas & Faturas do Victor para Tela Inicial (ordenada por urgência em tempo real)
  const contasExibicaoVictor = useMemo(() => {
    const itens: {
      id: string;
      isFaturaCartao: boolean;
      banco?: CartaoBanco;
      descricao: string;
      subtitulo?: string;
      categoria: string;
      vencimento: string;
      valor: number;
      quemPaga: Pagador;
      pago: boolean;
      chaveFatura?: string;
      contaOriginal?: ContaCasa;
    }[] = [];

    // 1. Fatura C6 Bank Victor (se houver valor no mês)
    const valC6Vic = resumoCartoesMes.c6Vic + resumoCartoesMes.c6Div / 2;
    if (valC6Vic > 0) {
      const chave = `${mesSelecionado}-c6-vic`;
      itens.push({
        id: `fatura-c6-${mesSelecionado}-vic`,
        isFaturaCartao: true,
        banco: "C6 Bank",
        descricao: "Fatura C6 Bank",
        subtitulo:
          resumoCartoesMes.c6Div > 0
            ? `Exclusivo: ${formatarMoeda(resumoCartoesMes.c6Vic)} • 50% Dividido: ${formatarMoeda(resumoCartoesMes.c6Div / 2)}`
            : "100% Victor",
        categoria: "Fatura Cartão",
        vencimento: `${mesSelecionado}-01`,
        valor: valC6Vic,
        quemPaga: "VIC",
        pago: !!faturasPagas[chave],
        chaveFatura: chave,
      });
    }

    // 2. Fatura Sicredi Victor (se houver valor no mês)
    const valSicrediVic = resumoCartoesMes.sicrediVic + resumoCartoesMes.sicrediDiv / 2;
    if (valSicrediVic > 0) {
      const chave = `${mesSelecionado}-sicredi-vic`;
      itens.push({
        id: `fatura-sicredi-${mesSelecionado}-vic`,
        isFaturaCartao: true,
        banco: "Sicredi",
        descricao: "Fatura Sicredi",
        subtitulo:
          resumoCartoesMes.sicrediDiv > 0
            ? `Exclusivo: ${formatarMoeda(resumoCartoesMes.sicrediVic)} • 50% Dividido: ${formatarMoeda(resumoCartoesMes.sicrediDiv / 2)}`
            : "100% Victor",
        categoria: "Fatura Cartão",
        vencimento: `${mesSelecionado}-03`,
        valor: valSicrediVic,
        quemPaga: "VIC",
        pago: !!faturasPagas[chave],
        chaveFatura: chave,
      });
    }

    // 3. Contas da Casa do Victor (100% ou 50% divididas)
    resumoMensalCasal.contasDoMes
      .filter((c) => c.quemPaga === "VIC" || c.quemPaga === "DIV")
      .forEach((c) => {
        const valorVic = c.quemPaga === "VIC" ? c.valor : c.valor / 2;
        itens.push({
          id: c.id,
          isFaturaCartao: false,
          descricao: c.descricao,
          subtitulo:
            c.quemPaga === "DIV"
              ? `Dividido (50% de ${formatarMoeda(c.valor)})`
              : "100% Victor",
          categoria: c.categoria,
          vencimento: c.vencimento,
          valor: valorVic,
          quemPaga: c.quemPaga,
          pago: c.pago,
          contaOriginal: c,
        });
      });

    // Ordenação dinâmica por urgência (tempo real: não pagas no topo, vencimento mais perto primeiro)
    return ordenarContasPorUrgencia(itens);
  }, [mesSelecionado, resumoCartoesMes, resumoMensalCasal.contasDoMes, faturasPagas]);

  // Lista unificada de Contas & Faturas da Letícia para Tela Inicial (ordenada por urgência em tempo real)
  const contasExibicaoLeticia = useMemo(() => {
    const itens: {
      id: string;
      isFaturaCartao: boolean;
      banco?: CartaoBanco;
      descricao: string;
      subtitulo?: string;
      categoria: string;
      vencimento: string;
      valor: number;
      quemPaga: Pagador;
      pago: boolean;
      chaveFatura?: string;
      contaOriginal?: ContaCasa;
    }[] = [];

    // 1. Fatura C6 Bank Letícia
    const valC6Le = resumoCartoesMes.c6Le + resumoCartoesMes.c6Div / 2;
    if (valC6Le > 0) {
      const chave = `${mesSelecionado}-c6-le`;
      itens.push({
        id: `fatura-c6-${mesSelecionado}-le`,
        isFaturaCartao: true,
        banco: "C6 Bank",
        descricao: "Fatura C6 Bank",
        subtitulo:
          resumoCartoesMes.c6Div > 0
            ? `Exclusivo: ${formatarMoeda(resumoCartoesMes.c6Le)} • 50% Dividido: ${formatarMoeda(resumoCartoesMes.c6Div / 2)}`
            : "100% Letícia",
        categoria: "Fatura Cartão",
        vencimento: `${mesSelecionado}-01`,
        valor: valC6Le,
        quemPaga: "LE",
        pago: !!faturasPagas[chave],
        chaveFatura: chave,
      });
    }

    // 2. Fatura Sicredi Letícia
    const valSicrediLe = resumoCartoesMes.sicrediLe + resumoCartoesMes.sicrediDiv / 2;
    if (valSicrediLe > 0) {
      const chave = `${mesSelecionado}-sicredi-le`;
      itens.push({
        id: `fatura-sicredi-${mesSelecionado}-le`,
        isFaturaCartao: true,
        banco: "Sicredi",
        descricao: "Fatura Sicredi",
        subtitulo:
          resumoCartoesMes.sicrediDiv > 0
            ? `Exclusivo: ${formatarMoeda(resumoCartoesMes.sicrediLe)} • 50% Dividido: ${formatarMoeda(resumoCartoesMes.sicrediDiv / 2)}`
            : "100% Letícia",
        categoria: "Fatura Cartão",
        vencimento: `${mesSelecionado}-03`,
        valor: valSicrediLe,
        quemPaga: "LE",
        pago: !!faturasPagas[chave],
        chaveFatura: chave,
      });
    }

    // 3. Contas da Casa da Letícia (100% ou 50% divididas)
    resumoMensalCasal.contasDoMes
      .filter((c) => c.quemPaga === "LE" || c.quemPaga === "DIV")
      .forEach((c) => {
        const valorLe = c.quemPaga === "LE" ? c.valor : c.valor / 2;
        itens.push({
          id: c.id,
          isFaturaCartao: false,
          descricao: c.descricao,
          subtitulo:
            c.quemPaga === "DIV"
              ? `Dividido (50% de ${formatarMoeda(c.valor)})`
              : "100% Letícia",
          categoria: c.categoria,
          vencimento: c.vencimento,
          valor: valorLe,
          quemPaga: c.quemPaga,
          pago: c.pago,
          contaOriginal: c,
        });
      });

    // Ordenação dinâmica por urgência (tempo real: não pagas no topo, vencimento mais perto primeiro)
    return ordenarContasPorUrgencia(itens);
  }, [mesSelecionado, resumoCartoesMes, resumoMensalCasal.contasDoMes, faturasPagas]);

  // Contas fixas da Aba 5 ordenadas por urgência em tempo real (não pagas no topo)
  const contasOrdenadasAba5 = useMemo(() => {
    return ordenarContasPorUrgencia(dadosMesVisualizado.contas);
  }, [dadosMesVisualizado.contas]);

  // Handlers
  const CATEGORIAS_PADRAO = ["Luz", "Água", "Internet", "Telefone", "Aluguel", "Carro", "Fatura Cartão"];

  const adicionarContaCasa = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(novoValor.replace(",", "."));
    if (!novaDescricao || isNaN(val) || val <= 0) return;

    const mesDaConta = novoVencimento ? novoVencimento.slice(0, 7) : (aba === "contas" ? mesVisualizadoContas : mesSelecionado);
    const diaVencimento = novoVencimento ? novoVencimento.slice(8, 10) : "02";

    const categoriaFinal = (novaCategoria === "Outros" && categoriaManual.trim())
      ? categoriaManual.trim()
      : novaCategoria;

    let descFinal = novaDescricao.trim();
    if (contaParcelada) {
      const cleanDesc = descFinal.replace(/\s*\(\d+\/\d+\)/, "").trim();
      descFinal = `${cleanDesc} (${parcelaAtual}/${totalParcelas})`;
    }

    const nova: ContaCasa = {
      id: `conta-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      mesAno: mesDaConta,
      descricao: descFinal,
      categoria: categoriaFinal,
      valor: val,
      vencimento: novoVencimento || `${mesDaConta}-${diaVencimento}`,
      quemPaga: novoPagador,
      pago: false,
      status: "CONFIRMADO",
      parcelada: contaParcelada,
      parcelaAtual: contaParcelada ? parcelaAtual : undefined,
      totalParcelas: contaParcelada ? totalParcelas : undefined,
    };

    const contasNovas: ContaCasa[] = [nova];

    // Se for boleto/conta parcelada, cria automaticamente as parcelas futuras para os meses subsequentes
    if (contaParcelada && totalParcelas > parcelaAtual) {
      const baseYear = parseInt(mesDaConta.slice(0, 4), 10);
      const baseMonth = parseInt(mesDaConta.slice(5, 7), 10);
      const cleanDesc = novaDescricao.replace(/\s*\(\d+\/\d+\)/, "").trim();

      for (let p = parcelaAtual + 1; p <= totalParcelas; p++) {
        const offset = p - parcelaAtual;
        const totalMeses = baseMonth - 1 + offset;
        const futYear = baseYear + Math.floor(totalMeses / 12);
        const futMonth = (totalMeses % 12) + 1;
        const futMesAno = `${futYear}-${String(futMonth).padStart(2, "0")}`;
        const futVencimento = `${futMesAno}-${diaVencimento}`;

        contasNovas.push({
          id: `conta-${Date.now()}-${p}-${Math.random().toString(36).substring(2, 7)}`,
          mesAno: futMesAno,
          descricao: `${cleanDesc} (${p}/${totalParcelas})`,
          categoria: categoriaFinal,
          valor: val,
          vencimento: futVencimento,
          quemPaga: novoPagador,
          pago: false,
          status: "PREVISTO",
          parcelada: true,
          parcelaAtual: p,
          totalParcelas: totalParcelas,
        });
      }
    }

    setContasCasa((prev) => [...prev, ...contasNovas]);
    setNovaDescricao("");
    setNovoValor("");
    setNovoVencimento("");
    setCategoriaManual("");
    setContaParcelada(false);
    setParcelaAtual(1);
    setTotalParcelas(12);
    setStatusPDF("");
    setModalAberto(false);

    // Se estiver na aba contas, atualiza o mês visualizado para a conta adicionada
    if (aba === "contas") {
      setMesVisualizadoContas(mesDaConta);
    } else if (mesDaConta !== mesSelecionado) {
      setMesSelecionado(mesDaConta);
    }
  };

  const iniciarEdicaoConta = (conta: ContaCasa) => {
    setContaEditando(conta);
    setEditDescricao(conta.descricao);
    if (CATEGORIAS_PADRAO.includes(conta.categoria)) {
      setEditCategoria(conta.categoria);
      setEditCategoriaManual("");
    } else {
      setEditCategoria("Outros");
      setEditCategoriaManual(conta.categoria === "Outros" ? "" : conta.categoria);
    }
    setEditValor(conta.valor.toString());
    setEditVencimento(conta.vencimento);
    setEditQuemPaga(conta.quemPaga);
  };

  const salvarEdicaoConta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaEditando) return;
    const val = parseFloat(editValor.replace(",", "."));
    if (isNaN(val) || val <= 0 || !editDescricao.trim()) return;

    const mesDaConta = editVencimento ? editVencimento.slice(0, 7) : contaEditando.mesAno;
    const categoriaFinal = (editCategoria === "Outros" && editCategoriaManual.trim())
      ? editCategoriaManual.trim()
      : editCategoria;

    setContasCasa((prev) => {
      const existe = prev.some((c) => c.id === contaEditando.id);
      if (existe) {
        return prev.map((c) =>
          c.id === contaEditando.id
            ? {
                ...c,
                descricao: editDescricao.trim(),
                categoria: categoriaFinal,
                valor: val,
                vencimento: editVencimento,
                quemPaga: editQuemPaga,
                mesAno: mesDaConta,
              }
            : c
        );
      } else {
        return [
          ...prev,
          {
            ...contaEditando,
            descricao: editDescricao.trim(),
            categoria: categoriaFinal,
            valor: val,
            vencimento: editVencimento,
            quemPaga: editQuemPaga,
            mesAno: mesDaConta,
          },
        ];
      }
    });
    setContaEditando(null);
  };

  const deletarConta = (id: string, mesOpcional?: string) => {
    const mesAlvo = mesOpcional || (aba === "contas" ? mesVisualizadoContas : mesSelecionado);

    // Procura a conta para obter a descrição
    const item =
      contasCasa.find((c) => c.id === id && (c.mesAno === mesAlvo || !c.mesAno)) ||
      dadosMesVisualizado.contas.find((c) => c.id === id) ||
      dadosMesSelecionado.contas.find((c) => c.id === id);

    setContasCasa((prev) => prev.filter((c) => !(c.id === id && (c.mesAno === mesAlvo || !c.mesAno))));

    const chaveId = `${mesAlvo}:${id}`;
    const chaveDesc = item?.descricao ? `${mesAlvo}:${item.descricao.toLowerCase().trim()}` : null;

    setContasExcluidas((prev) => {
      const novas = [...prev];
      if (!novas.includes(chaveId)) novas.push(chaveId);
      if (chaveDesc && !novas.includes(chaveDesc)) novas.push(chaveDesc);
      return novas;
    });

    if (contaEditando?.id === id) {
      setContaEditando(null);
    }
  };

  const restaurarFaturasOriginaisNovembro = () => {
    setComprasCartao((prev) => [
      ...prev.filter((c) => c.mesFatura !== "2026-11"),
      ...INITIAL_COMPRAS_CARTAO,
    ]);
    setContasCasa((prev) => [
      ...prev.filter((c) => c.mesAno !== "2026-11" && c.categoria !== "Fatura Cartão"),
      ...INITIAL_CONTAS_CASA,
    ]);
  };

  const handleUploadQualquerPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusPDF("Lendo arquivo PDF e analisando dados...");
    try {
      const dados = await extrairDadosQualquerPDF(file);
      const mesAlvo = dados.mesAno || (dados.vencimento ? dados.vencimento.slice(0, 7) : mesSelecionado);

      // Preenche os campos do formulário para visualização/conferência do usuário
      if (dados.valor > 0) {
        setNovoValor(dados.valor.toFixed(2));
      }
      if (dados.vencimento) {
        setNovoVencimento(dados.vencimento);
      }
      if (dados.descricao) {
        setNovaDescricao(dados.descricao);
      }
      if (dados.categoria) {
        setNovaCategoria(dados.categoria);
      }

      // Se for fatura de cartão (C6 Bank ou Sicredi)
      if (dados.isFaturaCartao && dados.bancoCartao) {
        const banco = dados.bancoCartao;
        const compras = parsearLinhasFatura(dados.textoCompleto, banco, mesAlvo);
        const totalFatura = dados.valor > 0 ? dados.valor : (compras.length > 0 ? Math.round(compras.reduce((acc, c) => acc + c.valor, 0) * 100) / 100 : 0);

        if (compras.length > 0) {
          const comIds: CompraCartao[] = compras.map((item, idx) => {
            const jaExistia = comprasCartao.some(
              (c) =>
                c.banco === banco &&
                c.mesFatura < mesAlvo &&
                c.descricao.toLowerCase().trim() === item.descricao.toLowerCase().trim()
            );
            const isNova = !jaExistia || (item.parcelaInfo && item.parcelaInfo.startsWith("1/"));
            return {
              ...item,
              id: `${Date.now()}-${idx}`,
              isNova: Boolean(isNova),
            };
          });

          // Substitui ou inclui as compras do mês alvo deste banco
          setComprasCartao((prev) => [
            ...comIds,
            ...prev.filter((c) => !(c.banco === banco && c.mesFatura === mesAlvo)),
          ]);
        }

        // Registra automaticamente a fatura em contasCasa para o mês alvo
        setContasCasa((prev) => {
          const faturaId = `fatura-${banco === "Sicredi" ? "sicredi" : "c6"}-${mesAlvo}`;
          const idx = prev.findIndex(
            (c) =>
              c.mesAno === mesAlvo &&
              (c.id === faturaId ||
                (c.categoria === "Fatura Cartão" &&
                  c.descricao.toLowerCase().includes(banco === "Sicredi" ? "sicredi" : "c6")))
          );
          const contaFatura: ContaCasa = {
            id: idx >= 0 ? prev[idx].id : faturaId,
            mesAno: mesAlvo,
            descricao: dados.descricao,
            categoria: "Fatura Cartão",
            valor: totalFatura,
            vencimento: dados.vencimento,
            quemPaga: "DIV",
            pago: false,
            status: "CONFIRMADO",
            recorrente: true,
          };
          if (idx >= 0) {
            const cp = [...prev];
            cp[idx] = contaFatura;
            return cp;
          }
          return [...prev, contaFatura];
        });

        // Alterna a visão para o mês alvo importado
        setMesSelecionado(mesAlvo);
        setMesVisualizadoContas(mesAlvo);
        if (compras.length > 0) {
          setBancoFiltro(banco);
        }

        setStatusPDF(
          `✓ ${dados.descricao} importada com sucesso para ${mesAlvo}! Valor: R$ ${totalFatura.toFixed(2)} • Vencimento: ${dados.vencimento} • ${compras.length} compras adicionadas a Cartões e salva no sistema.`
        );
      } else {
        // Conta de consumo / boleto geral (Luz, Água, Internet, Carro, IPTU, etc.)
        const valorConta = dados.valor > 0 ? dados.valor : 0;
        const quemPagaConta = dados.categoria === "Telefone" ? "VIC" : "DIV";

        setContasCasa((prev) => {
          const idx = prev.findIndex(
            (c) =>
              c.mesAno === mesAlvo &&
              (c.categoria === dados.categoria ||
                c.descricao.toLowerCase().trim() === dados.descricao.toLowerCase().trim())
          );
          const idConta = idx >= 0 ? prev[idx].id : `conta-${Date.now()}`;
          const novaConta: ContaCasa = {
            id: idConta,
            mesAno: mesAlvo,
            descricao: dados.descricao,
            categoria: dados.categoria,
            valor: valorConta,
            vencimento: dados.vencimento,
            quemPaga: idx >= 0 ? prev[idx].quemPaga : quemPagaConta,
            pago: idx >= 0 ? prev[idx].pago : false,
            status: "CONFIRMADO",
            recorrente: true,
          };
          if (idx >= 0) {
            const cp = [...prev];
            cp[idx] = novaConta;
            return cp;
          }
          return [...prev, novaConta];
        });

        // Alterna a visão para o mês alvo importado
        setMesSelecionado(mesAlvo);
        setMesVisualizadoContas(mesAlvo);

        setStatusPDF(
          `✓ Conta "${dados.descricao}" importada para ${mesAlvo}! Valor: R$ ${valorConta.toFixed(2)} • Vencimento: ${dados.vencimento || "Padrão do mês"} • Salva no sistema.`
        );
      }

      // Alterna automaticamente para a aba de conferência manual
      setTipoInclusao("conta");
    } catch (err) {
      console.error(err);
      setStatusPDF("Erro ao processar o PDF. Verifique se o arquivo não possui senha ou se é legível.");
    }
  };

  const adicionarMovPoupanca = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(poupValor.replace(",", "."));
    if (!poupDesc || isNaN(val) || val <= 0) return;
    setPoupanca((prev) => [
      {
        id: Date.now().toString(),
        data: poupData || new Date().toISOString().slice(0, 10),
        descricao: poupDesc,
        tipo: poupTipo,
        valor: val,
        categoria: poupCat,
        status: poupStatus,
      },
      ...prev,
    ]);
    setPoupDesc("");
    setPoupValor("");
  };

  const alternarStatusPoupanca = (movOuId: MovimentacaoPoupanca | string) => {
    const mov = typeof movOuId === "string" ? poupancaCompleta.find((p) => p.id === movOuId) : movOuId;
    if (!mov) return;

    if (mov.origemCompraId) {
      const faturaChave = `${mov.mesFatura}-${mov.origemCartao === "Sicredi" ? "sicredi" : "c6"}-vic`;
      setFaturasPagas((prev) => ({
        ...prev,
        [faturaChave]: !prev[faturaChave],
      }));
    } else if (mov.origemContaId) {
      alternarPagoConta(mov.origemContaId, mov.mesFatura);
    } else {
      setPoupanca((prev) =>
        prev.map((p) =>
          p.id === mov.id
            ? { ...p, status: p.status === "PREVISTO" ? "CONFIRMADO" : "PREVISTO" }
            : p
        )
      );
    }
  };

  const removerMovimentacaoPoupanca = (mov: MovimentacaoPoupanca) => {
    if (mov.origemCompraId) {
      setComprasCartao((prev) => prev.filter((c) => c.id !== mov.origemCompraId));
    } else if (mov.origemContaId) {
      setContasCasa((prev) => prev.filter((c) => c.id !== mov.origemContaId));
    } else {
      setPoupanca((prev) => prev.filter((p) => p.id !== mov.id));
    }
  };

  const alterarDataPoupanca = (mov: MovimentacaoPoupanca, novaData: string) => {
    if (mov.origemCompraId) {
      const mesNovo = novaData.slice(0, 7);
      setComprasCartao((prev) =>
        prev.map((c) =>
          c.id === mov.origemCompraId ? { ...c, mesFatura: mesNovo } : c
        )
      );
    } else if (mov.origemContaId) {
      const mesNovo = novaData.slice(0, 7);
      setContasCasa((prev) =>
        prev.map((c) =>
          c.id === mov.origemContaId ? { ...c, vencimento: novaData, mesAno: mesNovo } : c
        )
      );
    } else {
      setPoupanca((prev) =>
        prev.map((p) => (p.id === mov.id ? { ...p, data: novaData } : p))
      );
    }
  };

  const adicionarCompraCartaoPoupanca = (e: React.FormEvent) => {
    e.preventDefault();
    const valTotal = parseFloat(compraCartaoPoupValor.replace(",", "."));
    if (!compraCartaoPoupDesc.trim() || isNaN(valTotal) || valTotal <= 0) return;

    const numParcelas = parseInt(compraCartaoPoupParcelas, 10) || 1;
    const valorParcela = Math.round((valTotal / numParcelas) * 100) / 100;
    const dataBase = compraCartaoPoupData || new Date().toISOString().slice(0, 10);
    const anoBase = parseInt(dataBase.slice(0, 4), 10);
    const mesBase = parseInt(dataBase.slice(5, 7), 10);
    const diaBase = dataBase.slice(8, 10);

    const novasCompras: CompraCartao[] = [];
    for (let p = 1; p <= numParcelas; p++) {
      const offset = p - 1;
      const totalMeses = mesBase - 1 + offset;
      const futYear = anoBase + Math.floor(totalMeses / 12);
      const futMonth = (totalMeses % 12) + 1;
      const futMesAno = `${futYear}-${String(futMonth).padStart(2, "0")}`;

      const compra: CompraCartao = {
        id: `compra-poup-${Date.now()}-${p}`,
        banco: compraCartaoPoupBanco,
        descricao: compraCartaoPoupDesc.trim(),
        valor: p === numParcelas ? Math.round((valTotal - valorParcela * (numParcelas - 1)) * 100) / 100 : valorParcela,
        dataCompra: `${diaBase}/${String(mesBase).padStart(2, "0")}/${anoBase}`,
        mesFatura: futMesAno,
        quemPaga: "POUP",
        titularCartao: "Victor Roque",
        parcelaInfo: numParcelas > 1 ? `${p}/${numParcelas}` : undefined,
        isNova: false,
        pagadorDefinido: true,
      };
      novasCompras.push(compra);
    }

    setComprasCartao((prev) => [...novasCompras, ...prev]);
    setCompraCartaoPoupDesc("");
    setCompraCartaoPoupValor("");
    setCompraCartaoPoupParcelas("1");
  };

  const alternarPagoConta = (id: string, mesOpcional?: string) => {
    const mesAlvo = mesOpcional || (aba === "contas" ? mesVisualizadoContas : mesSelecionado);
    setContasCasa((prev) => {
      const index = prev.findIndex((c) => c.id === id && (c.mesAno === mesAlvo || !c.mesAno));
      if (index >= 0) {
        const item = prev[index];
        const novoPago = !item.pago;
        const copia = [...prev];
        copia[index] = {
          ...item,
          pago: novoPago,
          status: novoPago ? "CONFIRMADO" : "PREVISTO",
        };
        return copia;
      }
      // Se não existia ainda em contasCasa (ex: conta gerada padrão do mês), localiza e adiciona em contasCasa com pago: true
      const itemOrig =
        dadosMesVisualizado.contas.find((c) => c.id === id) ||
        dadosMesSelecionado.contas.find((c) => c.id === id);
      if (itemOrig) {
        const novoItem: ContaCasa = {
          ...itemOrig,
          mesAno: mesAlvo,
          pago: true,
          status: "CONFIRMADO",
        };
        return [...prev, novoItem];
      }
      return prev;
    });
  };

  const alterarPagadorCompra = (id: string, novoPagador: Pagador) => {
    setComprasCartao((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, quemPaga: novoPagador, isNova: false, pagadorDefinido: true } : c
      )
    );
  };

  const exportarBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ contasCasa, poupanca, salVictor, salLeticia, comprasCartao, contracheques }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-financas-victor-leticia-${mesSelecionado}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header Superior */}
      <header className="bg-slate-900 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Gestão Financeira — Victor & Letícia
            </h1>
            <p className="text-xs text-slate-400">CBMRS / BMRS • Sistema Autônomo Sem Planilha</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => carregarDoServidor(false, true)}
              title={
                syncStatus === "sincronizado"
                  ? `Sincronizado com o servidor central às ${ultimaSincronizacao || "agora"}. Clique para atualizar dados de outros navegadores/dispositivos.`
                  : syncStatus === "salvando"
                  ? "Salvando alterações no servidor..."
                  : "Clique para sincronizar com o servidor"
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                syncStatus === "sincronizado"
                  ? "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                  : syncStatus === "salvando"
                  ? "bg-amber-950/50 border-amber-500/40 text-amber-300"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "salvando" || syncStatus === "carregando" ? "animate-spin text-amber-400" : "text-emerald-400"}`} />
              <span className="hidden md:inline">
                {syncStatus === "sincronizado" && "Sincronizado (Multi-Dispositivo)"}
                {syncStatus === "salvando" && "Salvando no Servidor..."}
                {syncStatus === "carregando" && "Sincronizando..."}
                {syncStatus === "offline" && "Modo Local"}
              </span>
            </button>

            <button
              onClick={exportarBackup}
              title="Baixar backup dos dados"
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navegação das 6 Abas */}
        <nav className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto border-t border-slate-800">
          {[
            { id: "inicio", label: "1. Tela Inicial", icon: Wallet },
            { id: "poupanca", label: "2. Poupança & Metas", icon: PiggyBank },
            { id: "salarios", label: "3. Salários (Legislação RS)", icon: BadgeDollarSign },
            { id: "cartoes", label: "4. Cartões (C6 & Sicredi)", icon: CreditCard },
            { id: "contas", label: "5. Contas & Projeção 6 Meses", icon: CalendarRange },
            { id: "analise", label: "6. Análise Victor & Letícia", icon: BarChart3 },
          ].map((item) => {
            const Icon = item.icon;
            const ativo = aba === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setAba(item.id as AbaAtiva)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                  ativo
                    ? "border-emerald-400 text-emerald-400 bg-slate-800/50"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6">
        {/* ========================================================= */}
        {/* ABA 1: TELA INICIAL                                       */}
        {/* ========================================================= */}
        {aba === "inicio" && (
          <div className="space-y-6">
            {/* Barra de Seleção de Mês (Mês Atual como Rumo Zero) */}
            <BarraSeletorMes
              mesSelecionado={mesSelecionado}
              mesAtual={mesAtualReal}
              onSelecionarMes={handleSelecionarMes}
              subtitulo="Selecione qualquer mês para conferir o extrato geral, salários, faturas e contas daquele período"
              modoDark={false}
            />

            {/* Barra de Ação Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Resumo Geral do Mês ({formatarMesAnoLabel(mesSelecionado)})</h2>
                <p className="text-sm text-slate-500">
                  Consolidado automático dos salários líquidos, faturas importadas e contas da casa.
                </p>
              </div>
              <button
                onClick={() => setModalAberto(true)}
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition"
              >
                <Plus className="w-5 h-5" />
                Incluir Contas / Fatura PDF
              </button>
            </div>

            {/* 4 Cards Principais (KPIs) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">Salário Líquido Total (Casal)</span>
                  <button
                    onClick={abrirModalSalario}
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-bold hover:underline flex items-center gap-1"
                    title="Editar ou confirmar os valores líquidos do salário"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar / Confirmar
                  </button>
                </div>
                <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                  {formatarMoeda(salarioLiquidoTotalCasal)}
                </p>
                <div className="flex flex-col gap-1 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span>Victor: <strong className="text-slate-800">{formatarMoeda(salarioVictorFinal)}</strong></span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${contrachequeMes.victorConfirmado ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {contrachequeMes.victorConfirmado ? "✓ Confirmado" : "⏳ Previsão"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Letícia: <strong className="text-slate-800">{formatarMoeda(salarioLeticiaFinal)}</strong></span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${contrachequeMes.leticiaConfirmada ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {contrachequeMes.leticiaConfirmada ? "✓ Confirmado" : "⏳ Previsão"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Gastos Victor no Mês</span>
                <p className="text-2xl font-extrabold text-blue-600 mt-1">
                  {formatarMoeda(resumoMensalCasal.totalGastoVictor)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Saldo restante: <strong className={resumoMensalCasal.saldoVictor >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatarMoeda(resumoMensalCasal.saldoVictor)}</strong>
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Gastos Letícia no Mês</span>
                <p className="text-2xl font-extrabold text-purple-600 mt-1">
                  {formatarMoeda(resumoMensalCasal.totalGastoLeticia)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Saldo restante: <strong className={resumoMensalCasal.saldoLeticia >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatarMoeda(resumoMensalCasal.saldoLeticia)}</strong>
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs font-semibold uppercase text-slate-400">Poupança Atualizada</span>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {formatarMoeda(resumoPoupanca.saldoConfirmado)}
                </p>
                <div className="flex justify-between items-center text-xs mt-2">
                  <span className="text-amber-600 font-medium">
                    Livre: {formatarMoeda(resumoPoupanca.saldoLivreConfirmado)}
                  </span>
                  <span className="text-slate-400">
                    Projetado: {formatarMoeda(resumoPoupanca.saldoTotalProjetado)}
                  </span>
                </div>
              </div>
            </div>

            {/* Divisão de Gastos: Lado Esquerdo (Victor) e Lado Direito (Letícia) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Lado Esquerdo: Gastos Victor no Mês */}
              <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base">Gastos Victor no Mês ({formatarMesAnoLabel(mesSelecionado)})</h3>
                      <span className="bg-blue-800/70 text-blue-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        CBMRS
                      </span>
                    </div>
                    <p className="text-xs text-blue-100 mt-0.5">
                      Contas 100% Victor + 50% das contas divididas + Faturas de cartões
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-blue-200 font-bold block">Total a Pagar</span>
                    <span className="text-xl font-black text-white">{formatarMoeda(resumoMensalCasal.totalGastoVictor)}</span>
                  </div>
                </div>

                {/* Sub-resumo Salário vs Gastos Victor */}
                <div className="bg-blue-50/70 border-b border-blue-100 px-6 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">
                      Salário Líquido: <strong>{formatarMoeda(salarioVictorFinal)}</strong>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${contrachequeMes.victorConfirmado ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {contrachequeMes.victorConfirmado ? "✓ Confirmado" : "⏳ Previsão"}
                    </span>
                    <button
                      onClick={abrirModalSalario}
                      className="text-[11px] text-blue-600 hover:text-blue-800 underline font-semibold ml-1 flex items-center gap-0.5"
                      title="Editar ou confirmar salário"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                  </div>
                  <span className={resumoMensalCasal.saldoVictor >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                    Saldo Restante: {formatarMoeda(resumoMensalCasal.saldoVictor)}
                  </span>
                </div>

                {/* Lista Unificada de Contas & Faturas do Victor (Ordenadas por Urgência em Tempo Real) */}
                <div className="divide-y divide-slate-100">
                  {contasExibicaoVictor.length === 0 ? (
                    <p className="p-6 text-xs text-slate-400 text-center">Nenhuma conta atribuída ao Victor neste mês.</p>
                  ) : (
                    contasExibicaoVictor.map((item) => {
                      const statusVenc = obterStatusVencimento(item.vencimento, item.pago);
                      return (
                        <div
                          key={item.id}
                          className={`px-6 py-3.5 flex items-center justify-between transition ${
                            item.pago ? "bg-slate-50/40 opacity-75" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={item.pago}
                              onChange={() => {
                                if (item.isFaturaCartao && item.chaveFatura) {
                                  alternarPagoFatura(item.chaveFatura);
                                } else {
                                  alternarPagoConta(item.id);
                                }
                              }}
                              className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                              title={item.pago ? "Marcar como pendente" : "Marcar como pago"}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.isFaturaCartao && (
                                  <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                )}
                                <p
                                  className={`text-sm font-semibold ${
                                    item.pago ? "line-through text-slate-400" : "text-slate-800"
                                  }`}
                                >
                                  {item.descricao}
                                </p>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full border ${statusVenc.classe}`}
                                >
                                  {statusVenc.texto}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.categoria} • Venc: {item.vencimento.split("-").reverse().join("/")} •{" "}
                                <span className={item.quemPaga === "DIV" ? "text-amber-700 font-semibold" : "text-blue-700 font-semibold"}>
                                  {item.subtitulo}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold mr-1 ${
                                item.pago ? "text-slate-400 line-through" : "text-slate-900"
                              }`}
                            >
                              {formatarMoeda(item.valor)}
                            </span>
                            {item.isFaturaCartao ? (
                              <button
                                onClick={() => {
                                  setAba("cartoes");
                                  if (item.banco) setBancoFiltro(item.banco);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200 transition flex items-center gap-1"
                                title="Ver compras e detalhes na aba de cartões"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ver Fatura
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => item.contaOriginal && iniciarEdicaoConta(item.contaOriginal)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Alterar valor ou detalhes"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deletarConta(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Excluir conta"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Lado Direito: Gastos Letícia no Mês */}
              <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-700 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base">Gastos Letícia no Mês ({formatarMesAnoLabel(mesSelecionado)})</h3>
                      <span className="bg-purple-800/70 text-purple-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        BMRS
                      </span>
                    </div>
                    <p className="text-xs text-purple-100 mt-0.5">
                      Contas 100% Letícia + 50% das contas divididas + Faturas de cartões
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-purple-200 font-bold block">Total a Pagar</span>
                    <span className="text-xl font-black text-white">{formatarMoeda(resumoMensalCasal.totalGastoLeticia)}</span>
                  </div>
                </div>

                {/* Sub-resumo Salário vs Gastos Letícia */}
                <div className="bg-purple-50/70 border-b border-purple-100 px-6 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">
                      Salário Líquido: <strong>{formatarMoeda(salarioLeticiaFinal)}</strong>
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${contrachequeMes.leticiaConfirmada ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {contrachequeMes.leticiaConfirmada ? "✓ Confirmado" : "⏳ Previsão"}
                    </span>
                    <button
                      onClick={abrirModalSalario}
                      className="text-[11px] text-purple-600 hover:text-purple-800 underline font-semibold ml-1 flex items-center gap-0.5"
                      title="Editar ou confirmar salário"
                    >
                      <Pencil className="w-3 h-3" />
                      Editar
                    </button>
                  </div>
                  <span className={resumoMensalCasal.saldoLeticia >= 0 ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                    Saldo Restante: {formatarMoeda(resumoMensalCasal.saldoLeticia)}
                  </span>
                </div>

                {/* Lista Unificada de Contas & Faturas da Letícia (Ordenadas por Urgência em Tempo Real) */}
                <div className="divide-y divide-slate-100">
                  {contasExibicaoLeticia.length === 0 ? (
                    <p className="p-6 text-xs text-slate-400 text-center">Nenhuma conta atribuída à Letícia neste mês.</p>
                  ) : (
                    contasExibicaoLeticia.map((item) => {
                      const statusVenc = obterStatusVencimento(item.vencimento, item.pago);
                      return (
                        <div
                          key={item.id}
                          className={`px-6 py-3.5 flex items-center justify-between transition ${
                            item.pago ? "bg-slate-50/40 opacity-75" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={item.pago}
                              onChange={() => {
                                if (item.isFaturaCartao && item.chaveFatura) {
                                  alternarPagoFatura(item.chaveFatura);
                                } else {
                                  alternarPagoConta(item.id);
                                }
                              }}
                              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                              title={item.pago ? "Marcar como pendente" : "Marcar como pago"}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {item.isFaturaCartao && (
                                  <CreditCard className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                )}
                                <p
                                  className={`text-sm font-semibold ${
                                    item.pago ? "line-through text-slate-400" : "text-slate-800"
                                  }`}
                                >
                                  {item.descricao}
                                </p>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full border ${statusVenc.classe}`}
                                >
                                  {statusVenc.texto}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {item.categoria} • Venc: {item.vencimento.split("-").reverse().join("/")} •{" "}
                                <span className={item.quemPaga === "DIV" ? "text-amber-700 font-semibold" : "text-purple-700 font-semibold"}>
                                  {item.subtitulo}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold mr-1 ${
                                item.pago ? "text-slate-400 line-through" : "text-slate-900"
                              }`}
                            >
                              {formatarMoeda(item.valor)}
                            </span>
                            {item.isFaturaCartao ? (
                              <button
                                onClick={() => {
                                  setAba("cartoes");
                                  if (item.banco) setBancoFiltro(item.banco);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-purple-200 transition flex items-center gap-1"
                                title="Ver compras e detalhes na aba de cartões"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ver Fatura
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => item.contaOriginal && iniciarEdicaoConta(item.contaOriginal)}
                                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                                  title="Alterar valor ou detalhes"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deletarConta(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Excluir conta"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 2: POUPANÇA DIRETA & PREVISÕES FUTURAS                */}
        {/* ========================================================= */}
        {aba === "poupanca" && (
          <div className="space-y-6">
            <BarraSeletorMes
              mesSelecionado={mesSelecionado}
              mesAtual={mesAtualReal}
              onSelecionarMes={handleSelecionarMes}
              subtitulo="Extrato contínuo da poupança (realizados da mais recente à mais antiga) e previsões futuras (da data mais próxima à mais distante)"
              modoDark={false}
            />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm">
                <span className="text-xs uppercase text-slate-400 font-semibold">Saldo Atual Confirmado</span>
                <p className="text-2xl font-extrabold mt-1 text-emerald-400">{formatarMoeda(resumoPoupanca.saldoConfirmado)}</p>
                <p className="text-[11px] text-slate-400 mt-1">Efetivado na conta agora</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl">
                <span className="text-xs uppercase text-blue-700 font-semibold">Previsões Pendentes</span>
                <p className={`text-2xl font-extrabold mt-1 ${resumoPoupanca.saldoPrevistoPendente >= 0 ? "text-blue-700" : "text-rose-600"}`}>
                  {resumoPoupanca.saldoPrevistoPendente >= 0 ? "+" : ""}{formatarMoeda(resumoPoupanca.saldoPrevistoPendente)}
                </p>
                <p className="text-[11px] text-blue-600 mt-1">Entradas e saídas futuras</p>
              </div>
              <div className="bg-slate-100 border border-slate-300 p-5 rounded-2xl">
                <span className="text-xs uppercase text-slate-600 font-semibold">Saldo Projetado Final</span>
                <p className="text-2xl font-extrabold mt-1 text-slate-900">{formatarMoeda(resumoPoupanca.saldoTotalProjetado)}</p>
                <p className="text-[11px] text-slate-500 mt-1">Confirmado + Previsões</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                <span className="text-xs uppercase text-amber-700 font-semibold">Reserva de Emergência</span>
                <p className="text-2xl font-extrabold text-amber-800 mt-1">{formatarMoeda(resumoPoupanca.reservaEmergencia)}</p>
                <p className="text-[11px] text-amber-700 mt-1">
                  Livre p/ Metas: <strong>{formatarMoeda(resumoPoupanca.saldoLivreConfirmado)}</strong>
                </p>
              </div>
            </div>

            {/* Formulário Direto na Tela com Seleção Manual de Data e Previsão Futura */}
            <form onSubmit={adicionarMovPoupanca} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={poupData}
                  onChange={(e) => setPoupData(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição do Lançamento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Diárias Op. Verão Dezembro ou Difa Banrisul"
                  value={poupDesc}
                  onChange={(e) => setPoupDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
                <select
                  value={poupTipo}
                  onChange={(e) => setPoupTipo(e.target.value as "ENTRADA" | "SAIDA")}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <option value="ENTRADA">+ Entrada (Guardar)</option>
                  <option value="SAIDA">- Saída (Resgatar)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Situação / Status</label>
                <select
                  value={poupStatus}
                  onChange={(e) => setPoupStatus(e.target.value as "CONFIRMADO" | "PREVISTO")}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
                >
                  <option value="CONFIRMADO">✓ Já Entrou / Confirmado</option>
                  <option value="PREVISTO">⏳ Previsão Futura</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={poupValor}
                  onChange={(e) => setPoupValor(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm">
                Registrar
              </button>
            </form>

            {/* Card Informativo: Compras de Cartão Vinculadas Automaticamente à Poupança */}
            {resumoPoupanca.totalComprasCartaoPoupanca > 0 && (
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                    <CreditCard className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                      Compras de Cartão Vinculadas à Poupança
                      <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {comprasPoupancaAuto.length} {comprasPoupancaAuto.length === 1 ? "compra" : "compras"}
                      </span>
                    </p>
                    <p className="text-slate-500 mt-0.5">
                      Compras marcadas como <strong>Poup</strong> nos cartões de crédito entram automaticamente neste extrato com valor e cartão.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-emerald-200/80 shrink-0">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Faturas Pagas (Realizado):</span>
                    <strong className="text-emerald-700 text-sm font-black">{formatarMoeda(resumoPoupanca.comprasCartaoPoupancaConfirmadas)}</strong>
                  </div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Faturas Abertas (Previsão):</span>
                    <strong className="text-amber-700 text-sm font-black">{formatarMoeda(resumoPoupanca.comprasCartaoPoupancaPrevistas)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Formulário Especial: Compra Parcelada no Cartão Paga com Saldo da Poupança */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    Compensar Compra no Cartão com Saldo da Poupança
                  </h3>
                  <p className="text-xs text-slate-500">
                    Mesmo comprando no cartão de crédito de forma parcelada, o valor será pago com o dinheiro guardado na poupança.
                  </p>
                </div>
                <span className="text-xs bg-amber-200/80 text-amber-900 font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                  💳 Débito da Poupança
                </span>
              </div>

              <form onSubmit={adicionarCompraCartaoPoupanca} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Compra</label>
                  <input
                    type="date"
                    required
                    value={compraCartaoPoupData}
                    onChange={(e) => setCompraCartaoPoupData(e.target.value)}
                    className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm font-medium bg-white"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Descrição da Compra</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Passagens Férias, Celular, Geladeira..."
                    value={compraCartaoPoupDesc}
                    onChange={(e) => setCompraCartaoPoupDesc(e.target.value)}
                    className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cartão Utilizado</label>
                  <select
                    value={compraCartaoPoupBanco}
                    onChange={(e) => setCompraCartaoPoupBanco(e.target.value as CartaoBanco)}
                    className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm font-semibold bg-white"
                  >
                    <option value="C6 Bank">C6 Bank</option>
                    <option value="Sicredi">Sicredi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parcelas</label>
                  <select
                    value={compraCartaoPoupParcelas}
                    onChange={(e) => setCompraCartaoPoupParcelas(e.target.value)}
                    className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm bg-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                      <option key={n} value={n.toString()}>
                        {n}x {n === 1 ? "(À vista)" : "vezes"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={compraCartaoPoupValor}
                    onChange={(e) => setCompraCartaoPoupValor(e.target.value)}
                    className="w-full border border-amber-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors shadow-sm"
                >
                  Abater da Poupança
                </button>
              </form>
            </div>

            {/* ========================================================= */}
            {/* 1. EXTRATO REALIZADO (CONFIRMADO / EM CONTA)              */}
            {/* ========================================================= */}
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
              <div className="px-6 py-4 bg-emerald-50/70 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">Extrato Realizado (Confirmado)</h3>
                    <span className="bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      {poupancaRealizados.length} {poupancaRealizados.length === 1 ? "lançamento" : "lançamentos"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Lançamentos efetivados e creditados/debitados na poupança • Ordem: mais recente para o mais antigo
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Total Realizado em Conta</span>
                    <p className="text-lg font-black text-emerald-700 leading-tight">
                      {formatarMoeda(resumoPoupanca.saldoConfirmado)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {poupancaRealizados.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhum lançamento confirmado registrado. Adicione um lançamento confirmado acima ou confirme uma previsão pendente.
                  </div>
                ) : (
                  poupancaRealizados.map((mov) => (
                    <div key={mov.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{mov.descricao}</p>
                          {mov.origemCartao && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-emerald-600" />
                              {mov.origemCartao} {mov.mesFatura ? `• Fatura ${mov.mesFatura}` : ""}
                            </span>
                          )}
                          {mov.origemContaId && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-300 flex items-center gap-1">
                              🏠 Conta da Casa
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
                            ✓ Confirmado
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="date"
                            value={mov.data}
                            onChange={(e) => alterarDataPoupanca(mov, e.target.value)}
                            className="text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer font-medium"
                            title="Clique para editar a data deste lançamento"
                          />
                          <span className="text-xs text-slate-400">• {mov.categoria}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-base ${mov.tipo === "ENTRADA" ? "text-emerald-600" : "text-rose-600"}`}>
                          {mov.tipo === "ENTRADA" ? "+" : "-"} {formatarMoeda(mov.valor)}
                        </span>

                        <button
                          type="button"
                          onClick={() => alternarStatusPoupanca(mov)}
                          className="text-[11px] text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition"
                          title="Mover de volta para previsão futura"
                        >
                          Tornar Previsão
                        </button>

                        <button
                          onClick={() => removerMovimentacaoPoupanca(mov)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ========================================================= */}
            {/* 2. PREVISÕES FUTURAS (A REALIZAR / PLANEJADO)             */}
            {/* ========================================================= */}
            <div className="bg-white rounded-2xl shadow-sm border border-blue-200 overflow-hidden">
              <div className="px-6 py-4 bg-blue-50/70 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-800 text-base">Previsões Futuras (A Realizar)</h3>
                    <span className="bg-blue-600 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                      {poupancaPrevistos.length} {poupancaPrevistos.length === 1 ? "previsão" : "previsões"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Previsões de receitas e saídas futuras • Ordem: da data mais próxima para a mais distante da data atual • Confirme com 1 clique no dia
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">Saldo das Previsões</span>
                    <p className={`text-lg font-black leading-tight ${resumoPoupanca.saldoPrevistoPendente >= 0 ? "text-blue-700" : "text-rose-600"}`}>
                      {resumoPoupanca.saldoPrevistoPendente >= 0 ? "+" : ""}{formatarMoeda(resumoPoupanca.saldoPrevistoPendente)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {poupancaPrevistos.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Nenhuma previsão futura pendente. Adicione previsões futuras pelo formulário acima.
                  </div>
                ) : (
                  poupancaPrevistos.map((mov) => (
                    <div key={mov.id} className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{mov.descricao}</p>
                          {mov.origemCartao && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-300 flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-emerald-600" />
                              {mov.origemCartao} {mov.mesFatura ? `• Fatura ${mov.mesFatura}` : ""}
                            </span>
                          )}
                          {mov.origemContaId && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-300 flex items-center gap-1">
                              🏠 Conta da Casa
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                            ⏳ Previsão Futura
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="date"
                            value={mov.data}
                            onChange={(e) => alterarDataPoupanca(mov, e.target.value)}
                            className="text-xs text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer font-medium"
                            title="Clique para editar a data desta previsão"
                          />
                          <span className="text-xs text-slate-400">• {mov.categoria}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-base ${mov.tipo === "ENTRADA" ? "text-emerald-600" : "text-rose-600"}`}>
                          {mov.tipo === "ENTRADA" ? "+" : "-"} {formatarMoeda(mov.valor)}
                        </span>

                        {/* Botão de confirmação com 1 clique para previsões futuras */}
                        <button
                          type="button"
                          onClick={() => alternarStatusPoupanca(mov)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1.5"
                          title="Confirmar que o valor entrou/saiu na conta hoje e mover para o Extrato Realizado"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmar {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                        </button>

                        <button
                          onClick={() => removerMovimentacaoPoupanca(mov)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 3: SALÁRIOS (VICTOR ROQUE & LETÍCIA ROQUE)            */}
        {/* ========================================================= */}
        {aba === "salarios" && (
          <div className="space-y-6">
            <BarraSeletorMes
              mesSelecionado={mesSelecionado}
              mesAtual={mesAtualReal}
              onSelecionarMes={handleSelecionarMes}
              subtitulo="Consulte o contracheque e as regras salariais de qualquer mês ou volte ao mês atual"
              modoDark={false}
            />
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">Salários & Previsionamento ({formatarMesAnoLabel(mesSelecionado)})</h2>
                  <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                    Legislação RS 2026
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Victor Roque • Letícia Roque. Simule as regras salariais, adicione rendimentos extras e confirme com o contracheque oficial do mês.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Total Disponível do Casal</span>
                  <span className="text-xl font-black text-emerald-400">{formatarMoeda(salarioLiquidoTotalCasal)}</span>
                  <span className="text-[10px] text-slate-400 block">
                    (Previsto: {formatarMoeda(salarioPrevistoTotalCasal)})
                  </span>
                </div>
              </div>
            </div>

            {/* Divisão da tela: Victor Roque & Letícia Roque */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Victor Roque */}
              <SalarioCard
                titulo="Victor Roque"
                cor="blue"
                params={salVictor}
                onChange={handleAtualizarSalVictor}
                resultado={resVictor}
                mesAnoLabel={formatarMesAnoLabel(mesSelecionado)}
                mesAno={mesSelecionado}
                contrachequeConfirmado={contrachequeMes.victorConfirmado}
                valorRealContracheque={contrachequeMes.victorValorReal}
                salarioLiquidoFinalConfirmado={contrachequeMes.victorSalarioLiquidoFinal}
                diferencaCCConfirmada={contrachequeMes.victorDiferencaCC}
                onConfirmarSalario={confirmarSalarioVictor}
                onReverterSalario={reverterSalarioVictor}
                rendimentosExtras={contrachequeMes.victorExtras || []}
                onAdicionarExtra={adicionarExtraVictor}
                onRemoverExtra={removerExtraVictor}
              />

              {/* Letícia Roque */}
              <SalarioCard
                titulo="Letícia Roque"
                cor="purple"
                params={salLeticia}
                onChange={handleAtualizarSalLeticia}
                resultado={resLeticia}
                mesAnoLabel={formatarMesAnoLabel(mesSelecionado)}
                mesAno={mesSelecionado}
                contrachequeConfirmado={contrachequeMes.leticiaConfirmada}
                valorRealContracheque={contrachequeMes.leticiaValorReal}
                salarioLiquidoFinalConfirmado={contrachequeMes.leticiaSalarioLiquidoFinal}
                diferencaCCConfirmada={contrachequeMes.leticiaDiferencaCC}
                onConfirmarSalario={confirmarSalarioLeticia}
                onReverterSalario={reverterSalarioLeticia}
                rendimentosExtras={contrachequeMes.leticiaExtras || []}
                onAdicionarExtra={adicionarExtraLeticia}
                onRemoverExtra={removerExtraLeticia}
              />
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 4: CARTÕES DE CRÉDITO (C6 BANK & SICREDI)             */}
        {/* ========================================================= */}
        {aba === "cartoes" && (
          <div className="space-y-6">
            {/* Barra de Seleção de Mês (Mês Atual como Rumo Zero) */}
            <BarraSeletorMes
              mesSelecionado={mesSelecionado}
              mesAtual={mesAtualReal}
              onSelecionarMes={handleSelecionarMes}
              subtitulo="Consulte as faturas dos cartões C6 e Sicredi de qualquer mês ou confira o mês corrente"
              modoDark={false}
            />

            {/* Seletor C6 Bank vs Sicredi + Alternador de Visualização (Fatura Atual vs Projeção) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                  {(["C6 Bank", "Sicredi"] as CartaoBanco[]).map((banco) => (
                    <button
                      key={banco}
                      onClick={() => setBancoFiltro(banco)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                        bancoFiltro === banco
                          ? "bg-slate-900 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {banco}
                    </button>
                  ))}
                </div>

                {/* Alternador de Visualização: Fatura Atual vs Projeção Futura */}
                <div className="flex gap-1 bg-emerald-50 border border-emerald-200 p-1 rounded-xl">
                  <button
                    onClick={() => setVisaoCartao("fatura_mes")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      visaoCartao === "fatura_mes"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    💳 Fatura ({formatarMesAnoLabel(mesSelecionado)})
                  </button>
                  <button
                    onClick={() => setVisaoCartao("projecao")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                      visaoCartao === "projecao"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    📈 Projeção das Parcelas (6 Meses)
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={restaurarFaturasOriginaisNovembro}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 transition"
                  title="Recarregar os 81 lançamentos oficiais dos PDFs anexos de C6 e Sicredi"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
                  Recarregar Faturas Oficiais Nov/26
                </button>
                <button
                  onClick={() => {
                    setTipoInclusao("fatura_pdf");
                    setBancoPDF(bancoFiltro);
                    setModalAberto(true);
                  }}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm"
                >
                  <Upload className="w-4 h-4" />
                  Importar PDF {bancoFiltro}
                </button>
              </div>
            </div>

            {visaoCartao === "fatura_mes" ? (
              <>
                {/* Sub-header identificando o cartão selecionado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 px-1 gap-1">
                  <span>
                    Exibindo cálculos exclusivos para o cartão <strong className="text-slate-800">{bancoFiltro}</strong> ({resumoCartaoSelecionado.quantidadeItens} compras no mês {mesSelecionado})
                  </span>
                  <span>
                    Total da Fatura {bancoFiltro}: <strong className="text-slate-800 font-bold">{formatarMoeda(resumoCartaoSelecionado.totalGeralCartao)}</strong>
                  </span>
                </div>

                {/* Cards de Divisão do Cartão Selecionado (VIC / LE / DIV 50-50 / POUP) */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Exclusivo Victor ({bancoFiltro})</span>
                    <p className="text-xl font-bold text-blue-600 mt-1">{formatarMoeda(resumoCartaoSelecionado.vicDireto)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Compras exclusivas do Victor</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Exclusivo Letícia ({bancoFiltro})</span>
                    <p className="text-xl font-bold text-purple-600 mt-1">{formatarMoeda(resumoCartaoSelecionado.leDireto)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Compras exclusivas da Letícia</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Dividido ({bancoFiltro})</span>
                    <p className="text-xl font-bold text-amber-600 mt-1">{formatarMoeda(resumoCartaoSelecionado.divTotal)}</p>
                    <p className="text-xs text-slate-500 mt-1">Metade p/ cada: {formatarMoeda(resumoCartaoSelecionado.metadeDiv)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
                    <span className="text-xs text-emerald-700 font-semibold uppercase flex items-center gap-1">
                      <PiggyBank className="w-3.5 h-3.5 text-emerald-600" /> Da Poupança ({bancoFiltro})
                    </span>
                    <p className="text-xl font-bold text-emerald-600 mt-1">{formatarMoeda(resumoCartaoSelecionado.poupTotal)}</p>
                    <p className="text-[11px] text-emerald-600/80 mt-1">Abatido da Poupança & Metas</p>
                  </div>
                  <div className="bg-slate-900 text-white p-4 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Rateio {bancoFiltro}</span>
                    <p className="text-sm mt-1">
                      Victor: <strong className="text-blue-400">{formatarMoeda(resumoCartaoSelecionado.totalVictorCartao)}</strong>
                    </p>
                    <p className="text-sm">
                      Letícia: <strong className="text-purple-400">{formatarMoeda(resumoCartaoSelecionado.totalLeticiaCartao)}</strong>
                    </p>
                    {resumoCartaoSelecionado.poupTotal > 0 && (
                      <p className="text-xs text-emerald-400 mt-1 border-t border-slate-800 pt-1">
                        Poupança: <strong>{formatarMoeda(resumoCartaoSelecionado.poupTotal)}</strong>
                      </p>
                    )}
                  </div>
                </div>

                {/* Alerta de Novas Compras Pendentes de Definição de Pagador */}
                {comprasCartao.filter((c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado && c.isNova).length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Atenção: <strong>{comprasCartao.filter((c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado && c.isNova).length} nova(s) compra(s) detectada(s)</strong> nesta fatura em relação ao mês anterior (destacadas em vermelho). Clique em <strong>VIC</strong>, <strong>LE</strong>, <strong>DIV</strong> ou <strong>POUP</strong> para definir quem paga.
                      </span>
                    </div>
                  </div>
                )}

                {/* Tabela de Lançamentos do Cartão Selecionado */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Lançamentos — {bancoFiltro} ({mesSelecionado})</h3>
                    <span className="text-xs text-slate-500">Clique em VIC / LE / DIV / POUP para definir quem paga e recalcular na hora</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="px-6 py-3">Data</th>
                          <th className="px-6 py-3">Estabelecimento / Parcela</th>
                          <th className="px-6 py-3">Valor</th>
                          <th className="px-6 py-3">Quem Paga</th>
                          <th className="px-6 py-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {comprasCartao
                          .filter((c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado)
                          .map((compra) => {
                            const isNova = Boolean(compra.isNova);
                            return (
                              <tr
                                key={compra.id}
                                className={`transition-colors ${
                                  isNova
                                    ? "bg-rose-50/90 hover:bg-rose-100/90 border-l-4 border-l-rose-500"
                                    : "hover:bg-slate-50"
                                }`}
                              >
                                <td className="px-6 py-3 text-slate-500 whitespace-nowrap">{compra.dataCompra}</td>
                                <td className="px-6 py-3 font-medium text-slate-800">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span>{compra.descricao}</span>
                                    {compra.parcelaInfo && (
                                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                                        {compra.parcelaInfo}
                                      </span>
                                    )}
                                    {isNova && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                                        Nova Compra • Definir Quem Paga
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-3 font-bold text-slate-800 whitespace-nowrap">
                                  {formatarMoeda(compra.valor)}
                                </td>
                                <td className="px-6 py-3">
                                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                                    {(["VIC", "LE", "DIV", "POUP"] as Pagador[]).map((opcao) => (
                                      <button
                                        key={opcao}
                                        onClick={() => alterarPagadorCompra(compra.id, opcao)}
                                        className={`px-2.5 py-1 text-xs font-bold transition ${
                                          compra.quemPaga === opcao
                                            ? opcao === "VIC"
                                              ? "bg-blue-600 text-white"
                                              : opcao === "LE"
                                              ? "bg-purple-600 text-white"
                                              : opcao === "DIV"
                                              ? "bg-amber-500 text-white"
                                              : "bg-emerald-600 text-white"
                                            : "bg-white text-slate-500 hover:bg-slate-100"
                                        }`}
                                      >
                                        {opcao === "POUP" ? "Poup" : opcao}
                                      </button>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-6 py-3 text-right">
                                  <button
                                    onClick={() => setComprasCartao((prev) => prev.filter((c) => c.id !== compra.id))}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                    title="Excluir lançamento"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              /* MODO PROJEÇÃO DE PARCELAS FUTURAS DA ABA 4 */
              <div className="space-y-6">
                <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-400" />
                      Projeção de Parcelas Futuras — {bancoFiltro}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Acompanhe as parcelas ativas deste cartão nos próximos 6 meses com divisão automática entre Victor e Letícia.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 block">Total Mês {dadosMesProjecaoCartao.label}</span>
                    <span className="text-xl font-black text-emerald-400">{formatarMoeda(dadosMesProjecaoCartao.totalFatura)}</span>
                  </div>
                </div>

                {/* Linha do Tempo das Parcelas do Cartão */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {projecaoCartao.map((pMes) => {
                    const isAtivo = mesVisualizadoProjecaoCartao === pMes.mesAno;
                    return (
                      <button
                        key={pMes.mesAno}
                        type="button"
                        onClick={() => setMesVisualizadoProjecaoCartao(pMes.mesAno)}
                        className={`p-4 rounded-2xl border text-left transition-all ${
                          isAtivo
                            ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-bold ${isAtivo ? "text-emerald-400" : "text-slate-700"}`}>
                            {pMes.label.split("/")[0]}
                          </span>
                          <span className="text-[10px] text-slate-400">{pMes.parcelas.length} parc.</span>
                        </div>
                        <p className="text-base font-extrabold mt-1">{formatarMoeda(pMes.totalFatura)}</p>
                        <div
                          className={`mt-2 pt-2 border-t text-[11px] space-y-0.5 ${
                            isAtivo ? "border-slate-800 text-slate-300" : "border-slate-100 text-slate-600"
                          }`}
                        >
                          <div className="flex justify-between text-blue-600 font-semibold">
                            <span>Victor:</span>
                            <span>{formatarMoeda(pMes.totalVictor)}</span>
                          </div>
                          <div className="flex justify-between text-purple-600 font-semibold">
                            <span>Letícia:</span>
                            <span>{formatarMoeda(pMes.totalLeticia)}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Tabela de Parcelas do Mês Selecionado na Projeção */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        Parcelas Ativas em {dadosMesProjecaoCartao.label} ({bancoFiltro})
                      </h4>
                      <p className="text-xs text-slate-500">
                        {dadosMesProjecaoCartao.parcelas.length} parcelas programadas para esta fatura
                      </p>
                    </div>

                    <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Victor:</span>
                        <strong className="text-blue-600">{formatarMoeda(dadosMesProjecaoCartao.totalVictor)}</strong>
                      </div>
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-slate-500 block text-[10px]">Letícia:</span>
                        <strong className="text-purple-600">{formatarMoeda(dadosMesProjecaoCartao.totalLeticia)}</strong>
                      </div>
                      {Boolean(dadosMesProjecaoCartao.totalPoupanca && dadosMesProjecaoCartao.totalPoupanca > 0) && (
                        <>
                          <div className="h-6 w-px bg-slate-200" />
                          <div>
                            <span className="text-slate-500 block text-[10px]">Poupança:</span>
                            <strong className="text-emerald-600">{formatarMoeda(dadosMesProjecaoCartao.totalPoupanca || 0)}</strong>
                          </div>
                        </>
                      )}
                      <div className="h-6 w-px bg-slate-200" />
                      <div>
                        <span className="text-slate-500 block text-[10px]">Total:</span>
                        <strong className="text-slate-900">{formatarMoeda(dadosMesProjecaoCartao.totalFatura)}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="px-6 py-3">Estabelecimento</th>
                          <th className="px-6 py-3">Titular</th>
                          <th className="px-6 py-3">Parcela</th>
                          <th className="px-6 py-3">Valor da Parcela</th>
                          <th className="px-6 py-3">Quem Paga</th>
                          <th className="px-6 py-3 text-right">Rateio (Victor / Letícia / Poupança)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dadosMesProjecaoCartao.parcelas.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-xs text-slate-400">
                              Nenhuma parcela ativa prevista para {dadosMesProjecaoCartao.label} no {bancoFiltro}.
                            </td>
                          </tr>
                        ) : (
                          dadosMesProjecaoCartao.parcelas.map((parc) => (
                            <tr key={parc.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 font-semibold text-slate-800">{parc.descricao}</td>
                              <td className="px-6 py-3 text-xs text-slate-500">{parc.titularCartao}</td>
                              <td className="px-6 py-3">
                                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                                  {parc.parcelaAtual}/{parc.totalParcelas}
                                </span>
                              </td>
                              <td className="px-6 py-3 font-extrabold text-slate-900">{formatarMoeda(parc.valor)}</td>
                              <td className="px-6 py-3">
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                    parc.quemPaga === "VIC"
                                      ? "bg-blue-50 text-blue-700"
                                      : parc.quemPaga === "LE"
                                      ? "bg-purple-50 text-purple-700"
                                      : parc.quemPaga === "POUP"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {parc.quemPaga === "DIV" ? "Dividido (50/50)" : parc.quemPaga === "VIC" ? "100% Victor" : parc.quemPaga === "LE" ? "100% Letícia" : "Poupança"}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right text-xs">
                                {parc.quemPaga === "POUP" ? (
                                  <span className="text-emerald-600 font-bold">Poupança: {formatarMoeda(parc.valor)}</span>
                                ) : (
                                  <>
                                    <span className="text-blue-600 font-bold">V: {formatarMoeda(parc.valorVictor)}</span>
                                    <span className="text-slate-300 mx-1.5">•</span>
                                    <span className="text-purple-600 font-bold">L: {formatarMoeda(parc.valorLeticia)}</span>
                                  </>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 5: CONTAS DA CASA & PROJEÇÃO 6 MESES                   */}
        {/* ========================================================= */}
        {aba === "contas" && (
          <div className="space-y-6">
            {/* Barra de Seleção de Mês (Mês Atual como Rumo Zero) */}
            <BarraSeletorMes
              mesSelecionado={mesSelecionado}
              mesAtual={mesAtualReal}
              onSelecionarMes={handleSelecionarMes}
              subtitulo="Defina o mês de referência para detalhar as contas fixas e calcular a projeção de 6 meses"
              modoDark={false}
            />
            {/* Header da Aba com explicação */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Contas da Casa & Projeção para 6 Meses</h2>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    Previsão Futura
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Projeta automaticamente contas fixas e parcelas futuras dos cartões. Ao receber a nova fatura do mês, confirme o valor exato fechado.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setNovaCategoria("Outros");
                    setCategoriaManual("");
                    setNovaDescricao("");
                    setNovoValor("");
                    setNovoVencimento(`${mesVisualizadoContas}-10`);
                    setTipoInclusao("conta");
                    setModalAberto(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nova Conta / Importar Fatura
                </button>
              </div>
            </div>

            {/* Linha do Tempo: Cards dos Próximos 6 Meses */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-emerald-600" />
                  Visão dos Próximos 6 Meses (Vencimentos)
                </h3>
                <span className="text-xs text-slate-500">Clique em um mês para detalhar abaixo</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {projecao6Meses.map((proj) => {
                  const isMesAtivo = mesVisualizadoContas === proj.mesAno;
                  return (
                    <button
                      key={proj.mesAno}
                      type="button"
                      onClick={() => handleSelecionarMes(proj.mesAno)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isMesAtivo
                          ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500"
                          : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-bold ${isMesAtivo ? "text-emerald-400" : "text-slate-600"}`}>
                          {proj.label.split("/")[0]}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            proj.isConfirmado
                              ? isMesAtivo
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-emerald-50 text-emerald-700"
                              : isMesAtivo
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {proj.isConfirmado ? "Confirmado" : "Previsto"}
                        </span>
                      </div>
                      <p className="text-lg font-extrabold mt-1">
                        {formatarMoeda(proj.totalGeral)}
                      </p>
                      <div
                        className={`mt-2 pt-2 border-t text-[11px] space-y-0.5 ${
                          isMesAtivo ? "border-slate-800 text-slate-400" : "border-slate-100 text-slate-500"
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>Cartões / Parc:</span>
                          <span className="font-medium">{formatarMoeda(proj.totalFaturaC6 + proj.totalFaturaSicredi)}</span>
                        </div>
                        <div className="flex justify-between text-blue-600 font-semibold pt-0.5 border-t border-slate-100/60">
                          <span>Victor (Parc):</span>
                          <span>{formatarMoeda(proj.totalParcelasVictor)}</span>
                        </div>
                        <div className="flex justify-between text-purple-600 font-semibold">
                          <span>Letícia (Parc):</span>
                          <span>{formatarMoeda(proj.totalParcelasLeticia)}</span>
                        </div>
                        {Boolean(proj.totalParcelasPoupanca && proj.totalParcelasPoupanca > 0) && (
                          <div className="flex justify-between text-emerald-600 font-semibold">
                            <span>Poupança (Parc):</span>
                            <span>{formatarMoeda(proj.totalParcelasPoupanca || 0)}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Listas Detalhadas de Contas e Parcelas do Mês Selecionado */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Contas Fixas do Mês */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Contas Fixas da Casa ({formatarMesAnoLabel(mesVisualizadoContas)})
                    </h4>
                    <span className="text-xs font-bold text-slate-600">
                      Total: {formatarMoeda(dadosMesVisualizado.totalContasFixas)}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNovaCategoria("Outros");
                      setCategoriaManual("");
                      setNovaDescricao("");
                      setNovoValor("");
                      setNovoVencimento(`${mesVisualizadoContas}-10`);
                      setTipoInclusao("conta");
                      setModalAberto(true);
                    }}
                    className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Conta
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {contasOrdenadasAba5.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma conta fixa lançada para este mês.
                    </div>
                  ) : (
                    contasOrdenadasAba5.map((c) => {
                      const statusVenc = obterStatusVencimento(c.vencimento, c.pago);
                      return (
                        <div
                          key={c.id}
                          className={`px-6 py-3.5 flex items-center justify-between transition ${
                            c.pago ? "bg-slate-50/40 opacity-75" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={c.pago}
                              onChange={() => alternarPagoConta(c.id)}
                              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                              title={c.pago ? "Marcar como pendente" : "Marcar como pago"}
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-semibold ${c.pago ? "line-through text-slate-400" : "text-slate-800"}`}>
                                  {c.descricao}
                                </p>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusVenc.classe}`}>
                                  {statusVenc.texto}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Venc: {c.vencimento.split("-").reverse().join("/")} • {c.categoria} •{" "}
                                <span className={c.quemPaga === "DIV" ? "text-amber-700 font-semibold" : c.quemPaga === "POUP" ? "text-emerald-700 font-semibold" : c.quemPaga === "VIC" ? "text-blue-700 font-semibold" : "text-purple-700 font-semibold"}>
                                  {c.quemPaga === "DIV" ? "50/50" : c.quemPaga === "VIC" ? "Victor" : c.quemPaga === "LE" ? "Letícia" : "Poupança"}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold mr-1 ${c.pago ? "text-slate-400 line-through" : "text-slate-900"}`}>
                              {formatarMoeda(c.valor)}
                            </span>
                            <button
                              onClick={() => alternarPagoConta(c.id)}
                              className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition ${
                                c.pago
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {c.pago ? "Pago" : "Pendente"}
                            </button>
                            <button
                              onClick={() => iniciarEdicaoConta(c)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Alterar valor ou detalhes desta conta neste mês"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletarConta(c.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Excluir esta conta deste mês"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Coluna 2: Parcelas Futuras Projetadas dos Cartões */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Parcelas dos Cartões Previstas ({formatarMesAnoLabel(mesVisualizadoContas)})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Previsão de parcelas ativas separada por Victor e Letícia
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">
                    Total: {formatarMoeda(dadosMesVisualizado.totalFaturaC6 + dadosMesVisualizado.totalFaturaSicredi)}
                  </span>
                </div>

                {/* Destaque de Rateio: Parte Victor vs Parte Letícia nas Parcelas */}
                <div className="grid grid-cols-2 divide-x divide-slate-100 bg-slate-50 border-b border-slate-100 text-center py-2.5 px-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-blue-600 block">Parte Victor (Parcelas)</span>
                    <span className="text-base font-extrabold text-blue-700">
                      {formatarMoeda(dadosMesVisualizado.totalParcelasVictor)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-purple-600 block">Parte Letícia (Parcelas)</span>
                    <span className="text-base font-extrabold text-purple-700">
                      {formatarMoeda(dadosMesVisualizado.totalParcelasLeticia)}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                  {dadosMesVisualizado.parcelasProjetadas.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma parcela parcelada ativa prevista para este mês.
                    </div>
                  ) : (
                    dadosMesVisualizado.parcelasProjetadas.map((p) => (
                      <div key={p.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{p.descricao}</p>
                          <p className="text-xs text-slate-500">
                            {p.banco} • {p.titularCartao} • Parcela {p.parcelaAtual}/{p.totalParcelas}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-slate-900 block">{formatarMoeda(p.valor)}</span>
                          <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1.5 mt-0.5">
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                p.quemPaga === "VIC"
                                  ? "bg-blue-50 text-blue-700"
                                  : p.quemPaga === "LE"
                                  ? "bg-purple-50 text-purple-700"
                                  : p.quemPaga === "POUP"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {p.quemPaga === "DIV" ? "Dividido 50/50" : p.quemPaga === "VIC" ? "100% Victor" : p.quemPaga === "LE" ? "100% Letícia" : "Poupança"}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              {p.quemPaga === "POUP" ? `(Poupança: ${formatarMoeda(p.valor)})` : `(V: ${formatarMoeda(p.valorVictor)} • L: ${formatarMoeda(p.valorLeticia)})`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA 6: ANÁLISE INDIVIDUAL (VICTOR & LETÍCIA) & PROJEÇÃO    */}
        {/* ========================================================= */}
        {aba === "analise" && (
          <div className="space-y-6">
            {/* Barra de Seleção de Mês (Mês Atual como Rumo Zero) */}
            <BarraSeletorMes
              mesSelecionado={mesSelecionado}
              mesAtual={mesAtualReal}
              onSelecionarMes={handleSelecionarMes}
              subtitulo="Demonstrativo contábil detalhado para Victor e Letícia no mês selecionado"
              modoDark={false}
            />

            {/* Header da Aba 6 */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Análise Mensal Individual & Projeção Futura</h2>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    {formatarMesAnoLabel(mesSelecionado)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Demonstrativo contábil mês a mês separado para Victor e Letícia: Salário Líquido real vs Contas a Pagar, taxa de comprometimento, saldo individual e projeção dos próximos meses.
                </p>
              </div>
            </div>

            {/* Síntese Geral da Família no Mês Selecionado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block uppercase">Renda Familiar Líquida</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatarMoeda(salarioLiquidoTotalCasal)}</p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Victor: {formatarMoeda(salarioVictorFinal)} • Letícia: {formatarMoeda(salarioLeticiaFinal)}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block uppercase">Total Contas & Cartões</span>
                <p className="text-2xl font-black text-slate-900 mt-1">{formatarMoeda(resumoMensalCasal.totalGastoCasal)}</p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Contas Fixas + Faturas C6 & Sicredi
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block uppercase">Sobra Líquida Conjunta</span>
                <p
                  className={`text-2xl font-black mt-1 ${
                    salarioLiquidoTotalCasal - resumoMensalCasal.totalGastoCasal >= 0
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {formatarMoeda(salarioLiquidoTotalCasal - resumoMensalCasal.totalGastoCasal)}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {salarioLiquidoTotalCasal - resumoMensalCasal.totalGastoCasal >= 0
                    ? "✓ Superávit positivo para poupança"
                    : "⚠ Gastos acima da renda no mês"}
                </span>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-xs text-slate-500 font-semibold block uppercase">Comprometimento Familiar</span>
                <p className="text-2xl font-black text-slate-900 mt-1">
                  {salarioLiquidoTotalCasal > 0
                    ? `${((resumoMensalCasal.totalGastoCasal / salarioLiquidoTotalCasal) * 100).toFixed(1)}%`
                    : "0%"}
                </p>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {((resumoMensalCasal.totalGastoCasal / salarioLiquidoTotalCasal) * 100) <= 70
                    ? "✓ Faixa saudável (< 70%)"
                    : "⚠ Alerta de comprometimento"}
                </span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* DIVISÃO EM 2 LADOS: VICTOR (ESQUERDA) & LETÍCIA (DIREITA)  */}
            {/* ========================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* ======================================================= */}
              {/* VICTOR ROQUE                                             */}
              {/* ======================================================= */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-200" />
                    <div>
                      <h3 className="font-bold text-base">Victor Roque</h3>
                      <p className="text-[11px] text-blue-100">Análise Financeira Individual</p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      contrachequeMes.victorConfirmado
                        ? "bg-white/20 text-white"
                        : "bg-amber-400/30 text-amber-100"
                    }`}
                  >
                    {contrachequeMes.victorConfirmado ? "✓ Contracheque Oficial" : "⏳ Previsão Folha"}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Cards de Resumo Victor */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Salário Líquido</span>
                      <p className="text-base font-black text-blue-800 mt-0.5">{formatarMoeda(salarioVictorFinal)}</p>
                      <span className="text-[10px] text-blue-600 font-medium">Líquido em Conta</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 block">Total a Pagar</span>
                      <p className="text-base font-black text-slate-800 mt-0.5">{formatarMoeda(resumoMensalCasal.totalGastoVictor)}</p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {salarioVictorFinal > 0
                          ? `${((resumoMensalCasal.totalGastoVictor / salarioVictorFinal) * 100).toFixed(1)}% renda`
                          : "0%"}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border ${
                        resumoMensalCasal.saldoVictor >= 0
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-slate-500 block">Saldo Livre</span>
                      <p className="text-base font-black mt-0.5">{formatarMoeda(resumoMensalCasal.saldoVictor)}</p>
                      <span className="text-[10px] font-bold">
                        {resumoMensalCasal.saldoVictor >= 0 ? "✓ Superávit" : "⚠ Déficit"}
                      </span>
                    </div>
                  </div>

                  {/* 1. Faturas de Cartão do Victor */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                        Faturas de Cartão — Parte do Victor
                      </h4>
                      <span className="text-xs font-black text-blue-700">
                        {formatarMoeda(resumoCartoesMes.totalVictorCartoes)}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800">Fatura C6 Bank</p>
                          <p className="text-[11px] text-slate-500">
                            Exclusivo: {formatarMoeda(resumoCartoesMes.c6Vic)} • 50% Dividido: {formatarMoeda(resumoCartoesMes.c6Div / 2)}
                          </p>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          {formatarMoeda(resumoCartoesMes.c6Vic + resumoCartoesMes.c6Div / 2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800">Fatura Sicredi</p>
                          <p className="text-[11px] text-slate-500">
                            Exclusivo: {formatarMoeda(resumoCartoesMes.sicrediVic)} • 50% Dividido: {formatarMoeda(resumoCartoesMes.sicrediDiv / 2)}
                          </p>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          {formatarMoeda(resumoCartoesMes.sicrediVic + resumoCartoesMes.sicrediDiv / 2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Contas Fixas & Boletos da Casa do Victor */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                        Contas da Casa & Boletos — Parte do Victor
                      </h4>
                      <span className="text-xs font-black text-slate-800">
                        {formatarMoeda(resumoMensalCasal.totalGastoVictor - resumoCartoesMes.totalVictorCartoes)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200/70">
                      {resumoMensalCasal.contasDoMes.filter((c) => c.quemPaga === "VIC" || c.quemPaga === "DIV").length === 0 ? (
                        <p className="py-3 text-xs text-slate-400 text-center">Nenhuma conta atribuída ao Victor neste mês.</p>
                      ) : (
                        ordenarContasPorUrgencia(
                          resumoMensalCasal.contasDoMes.filter((c) => c.quemPaga === "VIC" || c.quemPaga === "DIV")
                        ).map((conta) => {
                          const valorVictor = conta.quemPaga === "VIC" ? conta.valor : conta.valor / 2;
                          const statusVenc = obterStatusVencimento(conta.vencimento, conta.pago);
                          return (
                            <div key={conta.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={conta.pago}
                                  onChange={() => alternarPagoConta(conta.id)}
                                  className="w-4 h-4 accent-blue-600 rounded"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`font-semibold ${conta.pago ? "line-through text-slate-400" : "text-slate-800"}`}>
                                      {conta.descricao}
                                    </p>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${statusVenc.classe}`}>
                                      {statusVenc.texto}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    Venc: {conta.vencimento.split("-").reverse().join("/")} •{" "}
                                    <span className={conta.quemPaga === "DIV" ? "text-amber-700 font-semibold" : "text-blue-700 font-semibold"}>
                                      {conta.quemPaga === "DIV" ? `Dividido (50% de ${formatarMoeda(conta.valor)})` : "100% Victor"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <span className={`font-bold ${conta.pago ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                {formatarMoeda(valorVictor)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Totalizador Geral Victor */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-900 uppercase">Total das Obrigações do Victor</p>
                      <p className="text-[11px] text-blue-700">Cartões + Contas Fixas</p>
                    </div>
                    <span className="text-lg font-black text-blue-800">
                      {formatarMoeda(resumoMensalCasal.totalGastoVictor)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ======================================================= */}
              {/* LETÍCIA ROQUE                                            */}
              {/* ======================================================= */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-purple-600 text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-200" />
                    <div>
                      <h3 className="font-bold text-base">Letícia Roque</h3>
                      <p className="text-[11px] text-purple-100">Análise Financeira Individual</p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      contrachequeMes.leticiaConfirmada
                        ? "bg-white/20 text-white"
                        : "bg-amber-400/30 text-amber-100"
                    }`}
                  >
                    {contrachequeMes.leticiaConfirmada ? "✓ Contracheque Oficial" : "⏳ Previsão Folha"}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Cards de Resumo Letícia */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-purple-50/70 p-3.5 rounded-xl border border-purple-100">
                      <span className="text-[11px] font-semibold text-slate-500 block">Salário Líquido</span>
                      <p className="text-base font-black text-purple-800 mt-0.5">{formatarMoeda(salarioLeticiaFinal)}</p>
                      <span className="text-[10px] text-purple-600 font-medium">Líquido em Conta</span>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[11px] font-semibold text-slate-500 block">Total a Pagar</span>
                      <p className="text-base font-black text-slate-800 mt-0.5">{formatarMoeda(resumoMensalCasal.totalGastoLeticia)}</p>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {salarioLeticiaFinal > 0
                          ? `${((resumoMensalCasal.totalGastoLeticia / salarioLeticiaFinal) * 100).toFixed(1)}% renda`
                          : "0%"}
                      </span>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border ${
                        resumoMensalCasal.saldoLeticia >= 0
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      <span className="text-[11px] font-semibold text-slate-500 block">Saldo Livre</span>
                      <p className="text-base font-black mt-0.5">{formatarMoeda(resumoMensalCasal.saldoLeticia)}</p>
                      <span className="text-[10px] font-bold">
                        {resumoMensalCasal.saldoLeticia >= 0 ? "✓ Superávit" : "⚠ Déficit"}
                      </span>
                    </div>
                  </div>

                  {/* 1. Faturas de Cartão da Letícia */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                        Faturas de Cartão — Parte da Letícia
                      </h4>
                      <span className="text-xs font-black text-purple-700">
                        {formatarMoeda(resumoCartoesMes.totalLeticiaCartoes)}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800">Fatura C6 Bank</p>
                          <p className="text-[11px] text-slate-500">
                            Exclusivo: {formatarMoeda(resumoCartoesMes.c6Le)} • 50% Dividido: {formatarMoeda(resumoCartoesMes.c6Div / 2)}
                          </p>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          {formatarMoeda(resumoCartoesMes.c6Le + resumoCartoesMes.c6Div / 2)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-800">Fatura Sicredi</p>
                          <p className="text-[11px] text-slate-500">
                            Exclusivo: {formatarMoeda(resumoCartoesMes.sicrediLe)} • 50% Dividido: {formatarMoeda(resumoCartoesMes.sicrediDiv / 2)}
                          </p>
                        </div>
                        <span className="font-extrabold text-slate-900">
                          {formatarMoeda(resumoCartoesMes.sicrediLe + resumoCartoesMes.sicrediDiv / 2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Contas Fixas & Boletos da Casa da Letícia */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                        <CalendarRange className="w-3.5 h-3.5 text-purple-600" />
                        Contas da Casa & Boletos — Parte da Letícia
                      </h4>
                      <span className="text-xs font-black text-slate-800">
                        {formatarMoeda(resumoMensalCasal.totalGastoLeticia - resumoCartoesMes.totalLeticiaCartoes)}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-200/70">
                      {resumoMensalCasal.contasDoMes.filter((c) => c.quemPaga === "LE" || c.quemPaga === "DIV").length === 0 ? (
                        <p className="py-3 text-xs text-slate-400 text-center">Nenhuma conta atribuída à Letícia neste mês.</p>
                      ) : (
                        ordenarContasPorUrgencia(
                          resumoMensalCasal.contasDoMes.filter((c) => c.quemPaga === "LE" || c.quemPaga === "DIV")
                        ).map((conta) => {
                          const valorLeticia = conta.quemPaga === "LE" ? conta.valor : conta.valor / 2;
                          const statusVenc = obterStatusVencimento(conta.vencimento, conta.pago);
                          return (
                            <div key={conta.id} className="py-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={conta.pago}
                                  onChange={() => alternarPagoConta(conta.id)}
                                  className="w-4 h-4 accent-purple-600 rounded"
                                />
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className={`font-semibold ${conta.pago ? "line-through text-slate-400" : "text-slate-800"}`}>
                                      {conta.descricao}
                                    </p>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full border ${statusVenc.classe}`}>
                                      {statusVenc.texto}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500">
                                    Venc: {conta.vencimento.split("-").reverse().join("/")} •{" "}
                                    <span className={conta.quemPaga === "DIV" ? "text-amber-700 font-semibold" : "text-purple-700 font-semibold"}>
                                      {conta.quemPaga === "DIV" ? `Dividido (50% de ${formatarMoeda(conta.valor)})` : "100% Letícia"}
                                    </span>
                                  </p>
                                </div>
                              </div>
                              <span className={`font-bold ${conta.pago ? "text-slate-400 line-through" : "text-slate-900"}`}>
                                {formatarMoeda(valorLeticia)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Totalizador Geral Letícia */}
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-purple-900 uppercase">Total das Obrigações da Letícia</p>
                      <p className="text-[11px] text-purple-700">Cartões + Contas Fixas</p>
                    </div>
                    <span className="text-lg font-black text-purple-800">
                      {formatarMoeda(resumoMensalCasal.totalGastoLeticia)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* PROJEÇÃO DOS PRÓXIMOS 6 MESES (SALÁRIO X GASTOS)         */}
            {/* ========================================================= */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-6 p-6">
              {/* Header da Projeção com Seletor de Perfil */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-lg text-slate-900">
                      Projeção dos Próximos 6 Meses: Salário Previsto x Gastos Comprometidos
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Preveja exatamente quanto você vai receber de salário e quanto já está comprometido (contas fixas, parcelas de cartões e novos compromissos) para cada mês.
                  </p>
                </div>

                {/* Seletor de Perfil (Filtro para ver Victor, Casal ou Letícia) */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => setVisaoProjecao6M("victor")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      visaoProjecao6M === "victor"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-blue-700 hover:bg-slate-200/60"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Parte do Victor Roque
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisaoProjecao6M("casal")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      visaoProjecao6M === "casal"
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Visão Geral Casal
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisaoProjecao6M("leticia")}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                      visaoProjecao6M === "leticia"
                        ? "bg-purple-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-purple-700 hover:bg-slate-200/60"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Parte da Letícia Roque
                  </button>
                </div>
              </div>

              {/* Destaques das Regras e Marcos Futuros */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-start gap-2.5 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                  <span className="text-base">💡</span>
                  <div>
                    <strong className="text-amber-900 block font-bold">Dezembro/2026: Novas Contas Fixas</strong>
                    <span className="text-amber-800">
                      Aluguel R$ 1.450 (dia 02) • Luz R$ 350 • Água R$ 120 • Internet R$ 135
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <Car className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-900 block font-bold">Janeiro/2027: Parcela do Carro</strong>
                    <span className="text-emerald-700">
                      Início em 12/01/2027: R$ 1.750,00/mês (Dividido: R$ 875,00 Victor / R$ 875,00 Letícia)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                  <span className="text-base">📉</span>
                  <div>
                    <strong className="text-blue-900 block font-bold">Redução Progressiva de Cartões</strong>
                    <span className="text-blue-800">
                      Parcelas antigas são quitadas mês a mês, aliviando o orçamento e aumentando a sobra livre
                    </span>
                  </div>
                </div>
              </div>

              {/* Cards de Métricas Semestrais da Visão Selecionada */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    {visaoProjecao6M === "victor" ? "Salário Médio Victor" : visaoProjecao6M === "leticia" ? "Salário Médio Letícia" : "Renda Média Familiar"}
                  </span>
                  <p className="text-xl font-black text-slate-900 mt-1">
                    {formatarMoeda(metricasProjecao6M.mediaRenda)}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Média mensal prevista (6 meses)
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Gastos Comprometidos Médios
                  </span>
                  <p className="text-xl font-black text-slate-900 mt-1">
                    {formatarMoeda(metricasProjecao6M.mediaComprometido)}
                  </p>
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                    {metricasProjecao6M.mediaPct.toFixed(1)}% da renda média
                  </span>
                </div>

                <div className={`p-4 rounded-xl border ${metricasProjecao6M.mediaSobra >= 0 ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50 border-rose-200"}`}>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Sobra Líquida Média
                  </span>
                  <p className={`text-xl font-black mt-1 ${metricasProjecao6M.mediaSobra >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    {formatarMoeda(metricasProjecao6M.mediaSobra)}
                  </p>
                  <span className="text-[10px] font-semibold mt-0.5 block text-emerald-800">
                    {metricasProjecao6M.mediaSobra >= 0 ? "✓ Capacidade de poupança" : "⚠ Atenção ao déficit"}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                    Maior Folga vs Maior Aperto
                  </span>
                  <p className="text-xs font-bold text-emerald-700 mt-1.5 flex items-center justify-between">
                    <span>Folga: {metricasProjecao6M.mesMaiorSobra?.label.split("/")[0]}</span>
                    <span>+{formatarMoeda(metricasProjecao6M.maiorSobraVal)}</span>
                  </p>
                  <p className="text-xs font-bold text-amber-700 mt-1 flex items-center justify-between">
                    <span>Aperto: {metricasProjecao6M.mesMaiorComprometimento?.label.split("/")[0]}</span>
                    <span>{metricasProjecao6M.maiorPctVal.toFixed(1)}% comp.</span>
                  </p>
                </div>
              </div>

              {/* Grid dos Próximos 6 Meses (Cockpit Mensal com Comprometimento) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarRange className="w-4 h-4 text-blue-600" />
                    Detalhamento Mês a Mês ({visaoProjecao6M === "victor" ? "Victor Roque" : visaoProjecao6M === "leticia" ? "Letícia Roque" : "Casal"})
                  </h4>
                  <span className="text-xs text-slate-400">
                    Clique em &quot;Ver Detalhes&quot; para abrir contas e parcelas
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {projecao6MesesCalculada.map((m) => {
                    const sal = visaoProjecao6M === "victor" ? m.salVic : visaoProjecao6M === "leticia" ? m.salLet : m.rendaCasal;
                    const comp = visaoProjecao6M === "victor" ? m.totalComprometidoVic : visaoProjecao6M === "leticia" ? m.totalComprometidoLet : m.totalComprometidoCasal;
                    const contasVal = visaoProjecao6M === "victor" ? m.contasVic : visaoProjecao6M === "leticia" ? m.contasLet : m.contasCasal;
                    const cartoesVal = visaoProjecao6M === "victor" ? m.cartoesVic : visaoProjecao6M === "leticia" ? m.cartoesLet : m.cartoesCasal;
                    const sobra = visaoProjecao6M === "victor" ? m.sobraVic : visaoProjecao6M === "leticia" ? m.sobraLet : m.sobraCasal;
                    const pct = visaoProjecao6M === "victor" ? m.pctComprometidoVic : visaoProjecao6M === "leticia" ? m.pctComprometidoLet : m.pctComprometidoCasal;
                    const tagSal = visaoProjecao6M === "victor" ? m.tagSalVic : visaoProjecao6M === "leticia" ? m.tagSalLet : (m.vicConfirmado && m.letConfirmada ? "100% Confirmado" : "Previsão Folha");
                    const isExpandido = mesExpandido6M === m.mesAno;

                    // Cor do termômetro
                    const corPct = pct <= 60 ? "bg-emerald-500" : pct <= 75 ? "bg-amber-500" : "bg-rose-500";
                    const corTextoPct = pct <= 60 ? "text-emerald-700" : pct <= 75 ? "text-amber-700" : "text-rose-700";

                    return (
                      <div
                        key={m.mesAno}
                        className={`rounded-2xl border transition shadow-xs flex flex-col justify-between ${
                          m.isAtual
                            ? "bg-amber-50/20 border-amber-300 ring-2 ring-amber-200"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="p-5 space-y-4">
                          {/* Topo do Card */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h5 className="font-extrabold text-base text-slate-900">{m.label}</h5>
                                {m.isAtual && (
                                  <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full border border-amber-300">
                                    Mês Atual
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {tagSal}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                pct <= 60
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : pct <= 75
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-rose-50 text-rose-800 border-rose-200"
                              }`}
                            >
                              {pct.toFixed(1)}% comprometido
                            </span>
                          </div>

                          {/* Comparativo Salário vs Comprometido */}
                          <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Salário Previsto</span>
                              <p className="text-sm font-black text-blue-900 mt-0.5">{formatarMoeda(sal)}</p>
                              {visaoProjecao6M === "casal" && (
                                <span className="text-[9px] text-slate-400 block">
                                  V: {formatarMoeda(m.salVic)} • L: {formatarMoeda(m.salLet)}
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">Comprometido</span>
                              <p className="text-sm font-black text-slate-900 mt-0.5">{formatarMoeda(comp)}</p>
                              <span className="text-[9px] text-slate-400 block">
                                Fixas: {formatarMoeda(contasVal)} • Cart: {formatarMoeda(cartoesVal)}
                              </span>
                            </div>
                          </div>

                          {/* Barra de Progresso / Termômetro de Comprometimento */}
                          <div>
                            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
                              <span className={corTextoPct}>{pct.toFixed(1)}% da renda</span>
                              <span className="text-slate-500 font-medium">
                                Livre: {Math.max(0, 100 - pct).toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${corPct}`}
                                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                              />
                            </div>
                          </div>

                          {/* Sobra Líquida Prevista no Mês */}
                          <div className={`p-3 rounded-xl border flex items-center justify-between ${
                            sobra >= 0 ? "bg-emerald-50/60 border-emerald-200 text-emerald-900" : "bg-rose-50 border-rose-200 text-rose-900"
                          }`}>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">Sobra Líquida Livre</span>
                              <span className="text-[11px] font-semibold text-slate-600">Disponível no mês</span>
                            </div>
                            <span className="text-base font-black">
                              {sobra >= 0 ? "+" : ""}{formatarMoeda(sobra)}
                            </span>
                          </div>

                          {/* Destaques / Avisos do Mês */}
                          {m.mesAno === "2026-11" && (
                            <p className="text-[11px] text-blue-700 font-medium bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                              💳 Faturas de cartão fechadas e conferidas (C6 + Sicredi)
                            </p>
                          )}
                          {m.mesAno === "2026-12" && (
                            <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2 rounded-lg border border-amber-200">
                              💡 Novas contas fixas (Aluguel R$ 1.450, Luz R$ 350, Água R$ 120, Net R$ 135)
                            </p>
                          )}
                          {m.mesAno === "2027-01" && (
                            <p className="text-[11px] text-emerald-800 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                              🚗 Início Parcela Carro (R$ 1.750,00 em 12/01/2027)
                            </p>
                          )}
                          {m.mesAno > "2027-01" && (
                            <p className="text-[11px] text-slate-600 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
                              🚗 Parcela Carro R$ 1.750 + amortização progressiva de parcelas antigas
                            </p>
                          )}
                        </div>

                        {/* Botão de Expansão */}
                        <div className="border-t border-slate-100 p-3 bg-slate-50/50 rounded-b-2xl">
                          <button
                            type="button"
                            onClick={() => setMesExpandido6M(isExpandido ? null : m.mesAno)}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 transition flex items-center justify-center gap-1.5"
                          >
                            {isExpandido ? (
                              <>
                                <ChevronUp className="w-4 h-4 text-slate-500" />
                                Ocultar Detalhes das Contas & Parcelas
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                                Ver Detalhes ({m.contas.length} contas • {m.parcelasProjetadas.length} parcelas)
                              </>
                            )}
                          </button>
                        </div>

                        {/* Painel de Detalhamento do Mês Expandido */}
                        {isExpandido && (
                          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4 rounded-b-2xl text-xs">
                            {/* 1. Contas Fixas do Mês */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <strong className="text-slate-800 font-bold flex items-center gap-1">
                                  <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                                  Contas Fixas & Boletos ({m.label})
                                </strong>
                                <span className="font-extrabold text-slate-900">{formatarMoeda(contasVal)}</span>
                              </div>

                              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                {m.contas.map((c) => {
                                  const vVic = c.quemPaga === "VIC" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;
                                  const vLet = c.quemPaga === "LE" ? c.valor : c.quemPaga === "DIV" ? c.valor / 2 : 0;
                                  const valPerfil = visaoProjecao6M === "victor" ? vVic : visaoProjecao6M === "leticia" ? vLet : c.valor;

                                  if (visaoProjecao6M !== "casal" && valPerfil === 0) return null;

                                  return (
                                    <div key={c.id} className="py-1.5 flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-slate-800">{c.descricao}</p>
                                        <span className="text-[10px] text-slate-400">
                                          Venc: {c.vencimento.split("-").reverse().join("/")} • {c.quemPaga === "DIV" ? "Dividido (50%)" : c.quemPaga === "VIC" ? "100% Victor" : c.quemPaga === "LE" ? "100% Letícia" : "Poupança"}
                                        </span>
                                      </div>
                                      <span className="font-bold text-slate-900">{formatarMoeda(valPerfil)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* 2. Parcelas de Cartão Ativas no Mês */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                <strong className="text-slate-800 font-bold flex items-center gap-1">
                                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                                  Parcelas dos Cartões ({m.label})
                                </strong>
                                <span className="font-extrabold text-slate-900">{formatarMoeda(cartoesVal)}</span>
                              </div>

                              {m.parcelasProjetadas.length === 0 ? (
                                <p className="text-[11px] text-slate-400 py-1 text-center">Nenhuma parcela ativa neste mês.</p>
                              ) : (
                                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                  {m.parcelasProjetadas.map((parc) => {
                                    const valPerfil = visaoProjecao6M === "victor" ? parc.valorVictor : visaoProjecao6M === "leticia" ? parc.valorLeticia : parc.valor;
                                    if (visaoProjecao6M !== "casal" && valPerfil === 0) return null;

                                    return (
                                      <div key={parc.id} className="py-1.5 flex items-center justify-between">
                                        <div>
                                          <p className="font-semibold text-slate-800">{parc.descricao}</p>
                                          <span className="text-[10px] text-slate-400">
                                            {parc.banco} • Parcela {parc.parcelaAtual}/{parc.totalParcelas} • {parc.quemPaga === "DIV" ? "Dividido" : parc.quemPaga === "VIC" ? "Victor" : parc.quemPaga === "LE" ? "Letícia" : "Poupança"}
                                          </span>
                                        </div>
                                        <span className="font-bold text-slate-900">{formatarMoeda(valPerfil)}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Atalhos Rápidos */}
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelecionarMes(m.mesAno);
                                  setAba("salarios");
                                }}
                                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ajustar Salário de {m.label.split("/")[0]}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleSelecionarMes(m.mesAno);
                                  setAba("contas");
                                }}
                                className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ver Contas de {m.label.split("/")[0]}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabela Comparativa Consolidada dos 6 Meses */}
              <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-sm">Quadro Comparativo Consolidado (Próximos 6 Meses)</h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Visão ativa: {visaoProjecao6M === "victor" ? "Victor Roque" : visaoProjecao6M === "leticia" ? "Letícia Roque" : "Casal (Familiar)"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Mês / Ano</th>
                        <th className="px-4 py-3 text-blue-900 bg-blue-50/50">Salário Previsto</th>
                        <th className="px-4 py-3">Contas Fixas</th>
                        <th className="px-4 py-3">Parcelas Cartões</th>
                        <th className="px-4 py-3 font-extrabold text-slate-900 bg-slate-50">Total Comprometido</th>
                        <th className="px-4 py-3 text-center">Taxa Comprometida</th>
                        <th className="px-4 py-3 text-emerald-900 bg-emerald-50/50">Sobra Livre</th>
                        <th className="px-4 py-3">Destaques / Eventos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {projecao6MesesCalculada.map((p) => {
                        const isAtual = p.isAtual;
                        const sal = visaoProjecao6M === "victor" ? p.salVic : visaoProjecao6M === "leticia" ? p.salLet : p.rendaCasal;
                        const contasVal = visaoProjecao6M === "victor" ? p.contasVic : visaoProjecao6M === "leticia" ? p.contasLet : p.contasCasal;
                        const cartoesVal = visaoProjecao6M === "victor" ? p.cartoesVic : visaoProjecao6M === "leticia" ? p.cartoesLet : p.cartoesCasal;
                        const totalComp = visaoProjecao6M === "victor" ? p.totalComprometidoVic : visaoProjecao6M === "leticia" ? p.totalComprometidoLet : p.totalComprometidoCasal;
                        const sobra = visaoProjecao6M === "victor" ? p.sobraVic : visaoProjecao6M === "leticia" ? p.sobraLet : p.sobraCasal;
                        const pct = visaoProjecao6M === "victor" ? p.pctComprometidoVic : visaoProjecao6M === "leticia" ? p.pctComprometidoLet : p.pctComprometidoCasal;

                        return (
                          <tr
                            key={p.mesAno}
                            className={`hover:bg-slate-50 transition ${
                              isAtual ? "bg-amber-50/40 font-semibold" : ""
                            }`}
                          >
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <span className="font-bold text-slate-900">{p.label}</span>
                              {isAtual && (
                                <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                  Atual
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap bg-blue-50/30 font-bold text-blue-900">
                              {formatarMoeda(sal)}
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                              {formatarMoeda(contasVal)}
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">
                              {formatarMoeda(cartoesVal)}
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap bg-slate-50 font-black text-slate-900">
                              {formatarMoeda(totalComp)}
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap text-center">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                  pct <= 60
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                    : pct <= 75
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-rose-100 text-rose-800 border-rose-300"
                                }`}
                              >
                                {pct.toFixed(1)}%
                              </span>
                            </td>

                            <td className="px-4 py-3.5 whitespace-nowrap bg-emerald-50/30">
                              <span
                                className={`font-black text-xs ${
                                  sobra >= 0 ? "text-emerald-700" : "text-rose-600"
                                }`}
                              >
                                {formatarMoeda(sobra)}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-[11px] text-slate-600">
                              {p.mesAno === "2026-11" && (
                                <span className="text-blue-700 font-semibold">
                                  Faturas fechadas (C6 + Sicredi)
                                </span>
                              )}
                              {p.mesAno === "2026-12" && (
                                <span className="text-amber-700 font-semibold">
                                  💡 Novas contas fixas (Aluguel R$ 1.450, Luz R$ 350, Água R$ 120, Internet R$ 135)
                                </span>
                              )}
                              {p.mesAno === "2027-01" && (
                                <span className="text-emerald-700 font-bold">
                                  🚗 Início Parcela Carro (R$ 1.750,00 em 12/01/2027)
                                </span>
                              )}
                              {p.mesAno > "2027-01" && (
                                <span className="text-slate-500">
                                  🚗 Parcela Carro R$ 1.750 + amortização progressiva de parcelas
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL: INCLUIR CONTAS DA CASA OU FATURA PDF               */}
      {/* ========================================================= */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-800">Incluir Contas / Faturas</h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            {/* Seletor de Tipo */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTipoInclusao("conta")}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  tipoInclusao === "conta" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Preenchimento Manual / Conferência
              </button>
              <button
                type="button"
                onClick={() => setTipoInclusao("fatura_pdf")}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  tipoInclusao === "fatura_pdf" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                📄 Importar Qualquer PDF
              </button>
            </div>

            {statusPDF && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span className="font-medium leading-relaxed">{statusPDF}</span>
              </div>
            )}

            {tipoInclusao === "conta" ? (
              <form onSubmit={adicionarContaCasa} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                  <select
                    value={novaCategoria}
                    onChange={(e) => {
                      const val = e.target.value as ContaCasa["categoria"];
                      setNovaCategoria(val);
                      if (val !== "Outros") {
                        setCategoriaManual("");
                      }
                    }}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Luz">Luz (Energia Elétrica - CEEE / Equatorial / RGE)</option>
                    <option value="Água">Água / Saneamento (Corsan / DMAE)</option>
                    <option value="Internet">Internet Residencial (Vero / Fibra)</option>
                    <option value="Telefone">Telefone / Celular (Vivo / Claro / Tim)</option>
                    <option value="Aluguel">Aluguel / Condomínio / IPTU</option>
                    <option value="Carro">Carro / Seguro / IPVA / Financiamento</option>
                    <option value="Fatura Cartão">Fatura de Cartão (C6 Bank / Sicredi)</option>
                    <option value="Outros">Outros Boletos (Digitar Categoria Manual)</option>
                  </select>
                </div>

                {novaCategoria === "Outros" && (
                  <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 space-y-1.5 animate-in fade-in duration-200">
                    <label className="block text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                      Digite a Categoria Manual:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Farmácia, Mercado, Condomínio, Academia, Streaming..."
                      value={categoriaManual}
                      onChange={(e) => setCategoriaManual(e.target.value)}
                      className="w-full border border-emerald-300 bg-white rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-slate-400"
                    />
                    <p className="text-[11px] text-emerald-700">
                      Esta conta será classificada com o nome que você digitar acima.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conta de Luz CEEE"
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Valor a Pagar (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0,00"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Vencimento</label>
                    <input
                      type="date"
                      value={novoVencimento}
                      onChange={(e) => setNovoVencimento(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Quem Paga?</label>
                  <select
                    value={novoPagador}
                    onChange={(e) => setNovoPagador(e.target.value as Pagador)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="DIV">Dividido (50% Victor / 50% Letícia)</option>
                    <option value="VIC">100% Victor</option>
                    <option value="LE">100% Letícia</option>
                    <option value="POUP">Poupança (Abater da Poupança)</option>
                  </select>
                </div>

                {/* Opção Conta / Boleto Parcelado (Acordo Nubank, Empréstimo, Carnê) */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contaParcelada}
                      onChange={(e) => setContaParcelada(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>Conta / Boleto Parcelado (Acordo Nubank, Empréstimo, Carnê)</span>
                  </label>
                  {contaParcelada && (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Parcela Atual
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={totalParcelas}
                          value={parcelaAtual}
                          onChange={(e) => setParcelaAtual(parseInt(e.target.value) || 1)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Total de Parcelas
                        </label>
                        <input
                          type="number"
                          min={parcelaAtual}
                          value={totalParcelas}
                          onChange={(e) => setTotalParcelas(parseInt(e.target.value) || 12)}
                          className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md shadow-emerald-600/20 transition">
                    Salvar Conta no Mês
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="font-semibold text-slate-700 mb-1">💡 Leitor Inteligente de Contas & Faturas:</p>
                  <p>Envie o PDF de qualquer boleto (Luz, Água, Internet, Telefone, Carro, Aluguel ou Fatura de Cartão). O sistema extrai automaticamente o <strong>valor a pagar</strong>, a <strong>data de vencimento</strong> e a <strong>categoria</strong>.</p>
                </div>

                <label className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 bg-emerald-50/40 hover:bg-emerald-50/70 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                  <FileText className="w-10 h-10 text-emerald-600 mb-3 group-hover:scale-110 transition transform" />
                  <span className="text-sm font-bold text-slate-800">Clique para selecionar qualquer conta em PDF</span>
                  <span className="text-xs text-slate-500 mt-1 max-w-sm">
                    Luz (CEEE), Água (Corsan), Vero, Vivo, Claro, Financiamento, Boletos gerais ou Faturas (C6/Sicredi).
                  </span>
                  <span className="mt-3 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                    Extração automática instantânea
                  </span>
                  <input type="file" accept="application/pdf" onChange={handleUploadQualquerPDF} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDITAR CONTA FIXA / LANÇADA                        */}
      {/* ========================================================= */}
      {contaEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Alterar Conta Fixa</h3>
                <p className="text-xs text-slate-500">Altere o valor ou os detalhes para o mês selecionado</p>
              </div>
              <button
                onClick={() => setContaEditando(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarEdicaoConta} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                <select
                  value={CATEGORIAS_PADRAO.includes(editCategoria) ? editCategoria : "Outros"}
                  onChange={(e) => {
                    const val = e.target.value as ContaCasa["categoria"];
                    setEditCategoria(val);
                    if (val !== "Outros") {
                      setEditCategoriaManual("");
                    }
                  }}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Luz">Luz (Energia Elétrica)</option>
                  <option value="Água">Água / Saneamento</option>
                  <option value="Internet">Internet Residencial</option>
                  <option value="Telefone">Telefone / Celular</option>
                  <option value="Aluguel">Aluguel / Condomínio / IPTU</option>
                  <option value="Carro">Carro / Seguro / IPVA / Financiamento</option>
                  <option value="Fatura Cartão">Fatura de Cartão</option>
                  <option value="Outros">Outros Boletos (Digitar Categoria Manual)</option>
                </select>
              </div>

              {(!CATEGORIAS_PADRAO.includes(editCategoria) || editCategoria === "Outros") && (
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200 space-y-1.5 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    Digite a Categoria Manual:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Farmácia, Mercado, Condomínio, Academia..."
                    value={editCategoriaManual}
                    onChange={(e) => {
                      setEditCategoriaManual(e.target.value);
                    }}
                    className="w-full border border-blue-300 bg-white rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400"
                  />
                  <p className="text-[11px] text-blue-700">
                    A conta será atualizada com esta categoria personalizada.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editValor}
                    onChange={(e) => setEditValor(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={editVencimento}
                    onChange={(e) => setEditVencimento(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quem Paga?</label>
                <select
                  value={editQuemPaga}
                  onChange={(e) => setEditQuemPaga(e.target.value as Pagador)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="DIV">Dividido (50% Victor / 50% Letícia)</option>
                  <option value="VIC">100% Victor</option>
                  <option value="LE">100% Letícia</option>
                  <option value="POUP">Poupança (Abater da Poupança)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl shadow-sm transition text-sm"
                >
                  Salvar Alterações
                </button>
                <button
                  type="button"
                  onClick={() => setContaEditando(null)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold rounded-xl text-sm"
                >
                  Cancelar
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => deletarConta(contaEditando.id)}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1.5 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir esta conta deste mês
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIÇÃO RÁPIDA / CONFIRMAÇÃO DE SALÁRIOS            */}
      {/* ========================================================= */}
      {modalSalarioAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Salários Líquidos do Mês</h3>
                <p className="text-xs text-slate-500">Confirme ou altere os valores recebidos para ({formatarMesAnoLabel(mesSelecionado)})</p>
              </div>
              <button
                onClick={() => setModalSalarioAberto(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={salvarModalSalario} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Victor Roque — Líquido em Conta (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={modalSalarioVictorVal}
                  onChange={(e) => setModalSalarioVictorVal(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="0,00"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {contrachequeMes.victorConfirmado ? "✓ Atualmente confirmado" : "⏳ Previsão simulador: " + formatarMoeda(resVictor.liquidoFolha)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Letícia Roque — Líquido em Conta (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={modalSalarioLeticiaVal}
                  onChange={(e) => setModalSalarioLeticiaVal(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-purple-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  placeholder="0,00"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {contrachequeMes.leticiaConfirmada ? "✓ Atualmente confirmado" : "⏳ Previsão simulador: " + formatarMoeda(resLeticia.liquidoFolha)}
                </span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-600/20 transition text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar e Atualizar Tela Inicial
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalSalarioAberto(false);
                    setAba("salarios");
                  }}
                  className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                >
                  Abrir Cálculo Detalhado / Simulador (Aba 3)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Barra de Seleção de Mês Contextual (Mês Atual como Rumo Zero)
function BarraSeletorMes({
  mesSelecionado,
  mesAtual,
  onSelecionarMes,
  subtitulo,
  modoDark = false,
}: {
  mesSelecionado: string;
  mesAtual: string;
  onSelecionarMes: (mes: string) => void;
  subtitulo?: string;
  modoDark?: boolean;
}) {
  const isAtual = mesSelecionado === mesAtual;

  const navegarMes = (delta: number) => {
    const [anoStr, mesStr] = mesSelecionado.split("-");
    const ano = parseInt(anoStr, 10);
    const mes = parseInt(mesStr, 10);
    const d = new Date(ano, mes - 1 + delta, 1);
    const novoAno = d.getFullYear();
    const novoMes = String(d.getMonth() + 1).padStart(2, "0");
    onSelecionarMes(`${novoAno}-${novoMes}`);
  };

  return (
    <div
      className={`p-3.5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 border transition ${
        modoDark
          ? "bg-slate-800/90 border-slate-700/80 text-white shadow-sm"
          : "bg-white border-slate-200 text-slate-800 shadow-sm"
      }`}
    >
      <div className="flex items-center gap-2.5 flex-wrap">
        {isAtual ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Mês Atual: {formatarMesAnoLabel(mesAtual)} (Rumo Zero)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <CalendarRange className="w-3.5 h-3.5 text-amber-400" />
            Visualizando Histórico: {formatarMesAnoLabel(mesSelecionado)}
          </span>
        )}

        {subtitulo ? (
          <span className={`text-xs ${modoDark ? "text-slate-400" : "text-slate-500"}`}>
            {subtitulo}
          </span>
        ) : (
          <span className={`text-xs ${modoDark ? "text-slate-400" : "text-slate-500"}`}>
            {isAtual
              ? "Exibindo dados do mês corrente em tempo real"
              : "Exibindo dados do mês selecionado"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Botão de Voltar ao Mês Atual (Aparece quando outro mês é selecionado) */}
        {!isAtual && (
          <button
            type="button"
            onClick={() => onSelecionarMes(mesAtual)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            title="Voltar instantaneamente para o mês atual em tempo real"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Voltar ao Mês Atual ({formatarMesAnoLabel(mesAtual)})
          </button>
        )}

        {/* Setas de navegação mês anterior / próximo mês */}
        <div className="flex items-center bg-slate-900/10 dark:bg-slate-950/40 p-0.5 rounded-xl border border-slate-300/40 dark:border-slate-700">
          <button
            type="button"
            onClick={() => navegarMes(-1)}
            title="Ver mês anterior"
            className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
              modoDark
                ? "text-slate-300 hover:text-white hover:bg-slate-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            ◀ Ant.
          </button>
          <button
            type="button"
            onClick={() => navegarMes(1)}
            title="Ver próximo mês"
            className={`px-2 py-1 text-xs font-bold rounded-lg transition ${
              modoDark
                ? "text-slate-300 hover:text-white hover:bg-slate-700"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            }`}
          >
            Próx. ▶
          </button>
        </div>

        {/* Input / Seletor de Mês específico */}
        <label
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition ${
            modoDark
              ? "bg-slate-900/60 border-slate-700 text-slate-200 hover:border-slate-500"
              : "bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400"
          }`}
          title="Clique para selecionar qualquer mês ou ano"
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Mês:</span>
          <input
            type="month"
            value={mesSelecionado}
            onChange={(e) => {
              if (e.target.value) onSelecionarMes(e.target.value);
            }}
            className="bg-transparent border-0 text-xs font-bold cursor-pointer focus:outline-none"
          />
        </label>
      </div>
    </div>
  );
}

// Componente Reutilizável da Aba 3 (Salários & Rendimentos) com Fluxo em 5 Passos
function SalarioCard({
  titulo,
  cor,
  params,
  onChange,
  resultado,
  mesAnoLabel,
  mesAno,
  contrachequeConfirmado,
  valorRealContracheque,
  salarioLiquidoFinalConfirmado,
  diferencaCCConfirmada,
  onConfirmarSalario,
  onReverterSalario,
  rendimentosExtras = [],
  onAdicionarExtra,
  onRemoverExtra,
}: {
  titulo: string;
  cor: "blue" | "purple";
  params: ParametrosSalario;
  onChange: (p: ParametrosSalario) => void;
  resultado: ReturnType<typeof calcularContrachequeRS>;
  mesAnoLabel: string;
  mesAno: string;
  contrachequeConfirmado: boolean;
  valorRealContracheque: number;
  salarioLiquidoFinalConfirmado?: number;
  diferencaCCConfirmada?: number;
  onConfirmarSalario: (valorFolha: number, valorFinalLiquido: number, diferencaCC?: number) => void;
  onReverterSalario: () => void;
  rendimentosExtras?: RendimentoExtraItem[];
  onAdicionarExtra?: (descricao: string, valor: number) => void;
  onRemoverExtra?: (id: string) => void;
}) {
  const badgeColor = cor === "blue" ? "bg-blue-600" : "bg-purple-600";
  const borderHighlight = cor === "blue" ? "border-blue-200" : "border-purple-200";

  // Estado local para o valor líquido do contracheque militar (digitado ou via upload)
  const [valorFolhaInput, setValorFolhaInput] = useState<string>(() =>
    valorRealContracheque > 0 ? valorRealContracheque.toFixed(2) : resultado.liquidoFolha.toFixed(2)
  );
  const [statusPDFContracheque, setStatusPDFContracheque] = useState<string>("");
  const [novoExtraDesc, setNovoExtraDesc] = useState("");
  const [novoExtraValor, setNovoExtraValor] = useState("");
  const [editandoValor, setEditandoValor] = useState(false);
  const [feedbackSalvo, setFeedbackSalvo] = useState(false);

  // Sincroniza o valor de folha quando o mês ou status de confirmação muda
  useEffect(() => {
    if (contrachequeConfirmado && valorRealContracheque > 0) {
      setValorFolhaInput(valorRealContracheque.toFixed(2));
    } else {
      setValorFolhaInput(resultado.liquidoFolha.toFixed(2));
    }
    setEditandoValor(false);
  }, [mesAno, contrachequeConfirmado, valorRealContracheque, resultado.liquidoFolha]);

  const valorFolhaAtual = parseFloat(valorFolhaInput.replace(",", ".")) || resultado.liquidoFolha;
  const diferencaCC = valorFolhaAtual - resultado.liquidoFolha;
  const totalGanhosExtras = rendimentosExtras.reduce((acc, it) => acc + it.valor, 0);
  const valeRefeicao = params.incluirValeRefeicao ? resultado.valeRefeicaoIndenizatorio : 0;
  const diarias = resultado.valorDiarias;
  const totalLiquidoCalculado = valorFolhaAtual + valeRefeicao + diarias + totalGanhosExtras;

  const handleUploadContrachequePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusPDFContracheque("Lendo PDF do contracheque militar RS...");
    try {
      const titularPadrao = cor === "blue" ? "Victor" : "Leticia";
      const dados = await extrairDadosContrachequePDF(file, titularPadrao);
      if (dados.valorLiquido > 0) {
        setValorFolhaInput(dados.valorLiquido.toFixed(2));
        const diff = dados.valorLiquido - resultado.liquidoFolha;
        const totalFinal = dados.valorLiquido + valeRefeicao + diarias + totalGanhosExtras;
        onConfirmarSalario(dados.valorLiquido, totalFinal, diff);
        setStatusPDFContracheque(
          `✓ Contracheque militar ${dados.titularDetectado ? `(${dados.titularDetectado})` : ""} lido com sucesso! Líquido oficial: ${formatarMoeda(dados.valorLiquido)}`
        );
        setFeedbackSalvo(true);
        setTimeout(() => setFeedbackSalvo(false), 4000);
      } else {
        setStatusPDFContracheque(
          "Não foi possível extrair a linha 'LÍQUIDO A RECEBER' automaticamente. Digite o valor no campo do 2º passo abaixo."
        );
      }
    } catch (err: any) {
      console.error(err);
      setStatusPDFContracheque("Erro ao ler o PDF: " + (err?.message || "Arquivo protegido ou ilegível."));
    }
  };

  const executarSalvarEConfirmar = () => {
    const totalFinal = valorFolhaAtual + valeRefeicao + diarias + totalGanhosExtras;
    onConfirmarSalario(valorFolhaAtual, totalFinal, diferencaCC);
    setEditandoValor(false);
    setFeedbackSalvo(true);
    setTimeout(() => setFeedbackSalvo(false), 4000);
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${borderHighlight} overflow-hidden space-y-0`}>
      {/* Cabeçalho do Card */}
      <div className={`${badgeColor} text-white px-6 py-4 flex items-center justify-between`}>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base">{titulo}</h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                contrachequeConfirmado
                  ? "bg-white/20 text-white"
                  : "bg-amber-400/30 text-amber-100"
              }`}
            >
              {contrachequeConfirmado ? "✓ Salário Confirmado no Mês" : "⏳ Previsão Simulador"}
            </span>
          </div>
          <p className="text-xs text-white/80 mt-0.5">
            Gestão Salarial RS 2026 • {mesAnoLabel}
          </p>
        </div>
        <span className="text-xs bg-white/10 px-2.5 py-1 rounded-full font-semibold border border-white/20">
          5 Passos
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* ========================================================= */}
        {/* 1º PASSO: PREVISÃO DE SALÁRIO (SIMULADOR RS 2026)         */}
        {/* ========================================================= */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                1º
              </span>
              Previsão de Salário • Simulador Militar RS 2026
            </h4>
            <span className="text-[11px] font-semibold text-slate-500">
              Previsto: {formatarMoeda(resultado.totalDisponivelMes)}
            </span>
          </div>

          {/* Campos do Simulador */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subsídio Base (R$)</label>
              <input
                type="number"
                step="0.01"
                value={params.subsídioBase}
                onChange={(e) => onChange({ ...params, subsídioBase: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Substituição de Posto</label>
              <select
                value={params.tipoSubstituicao}
                onChange={(e) => {
                  const novoTipo = e.target.value as ParametrosSalario["tipoSubstituicao"];
                  const novosDias = novoTipo === "NENHUMA" ? 0 : (params.diasSubstituicao > 0 ? params.diasSubstituicao : 30);
                  onChange({
                    ...params,
                    tipoSubstituicao: novoTipo,
                    diasSubstituicao: novosDias,
                  });
                }}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
              >
                <option value="NENHUMA">Sem Substituição</option>
                <option value="2_SGT">Substituição 2º Sgt</option>
                <option value="1_SGT">Substituição 1º Sgt</option>
                <option value="1_TEN">Substituição 1º Ten</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Dias Substit.</label>
              <input
                type="number"
                min={0}
                max={30}
                value={params.diasSubstituicao === 0 && params.tipoSubstituicao === "NENHUMA" ? "" : params.diasSubstituicao}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value;
                  const val = raw === "" ? 0 : parseInt(raw, 10);
                  const dias = isNaN(val) ? 0 : Math.min(30, Math.max(0, val));
                  const novoTipo = dias > 0 && params.tipoSubstituicao === "NENHUMA"
                    ? (cor === "blue" ? "1_SGT" : "2_SGT")
                    : params.tipoSubstituicao;
                  onChange({
                    ...params,
                    tipoSubstituicao: novoTipo,
                    diasSubstituicao: dias,
                  });
                }}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Horas-Extra (h)</label>
              <input
                type="number"
                min={0}
                value={params.horasExtrasQtd}
                onChange={(e) => onChange({ ...params, horasExtrasQtd: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Dias Férias (1/3)</label>
              <input
                type="number"
                min={0}
                max={30}
                value={params.diasFerias}
                onChange={(e) => onChange({ ...params, diasFerias: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-600 mb-1">Diárias (Qtd)</label>
              <input
                type="number"
                min={0}
                value={params.diariasQtd}
                onChange={(e) => onChange({ ...params, diariasQtd: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Acordo Banrisul (R$)</label>
              <input
                type="number"
                step="0.01"
                value={params.descontoBanrisul}
                onChange={(e) => onChange({ ...params, descontoBanrisul: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Outros Consignados (GBOEX)</label>
              <input
                type="number"
                step="0.01"
                value={params.outrosDescontosFixos}
                onChange={(e) => onChange({ ...params, outrosDescontosFixos: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1">
            <input
              type="checkbox"
              checked={params.incluirValeRefeicao}
              onChange={(e) => onChange({ ...params, incluirValeRefeicao: e.target.checked })}
              className="w-4 h-4 accent-emerald-600"
            />
            Incluir Auxílio-Refeição RS (Dia 20 — {formatarMoeda(TABELA_RS_2026.VALE_REFEICAO_MENSAL)})
          </label>

          {/* Demonstrativo do Cálculo Previsto */}
          <div className="bg-white rounded-lg p-3 space-y-1.5 text-xs border border-slate-200">
            <div className="flex justify-between text-slate-600">
              <span>(+) Subsídio Base:</span>
              <span className="font-semibold">{formatarMoeda(resultado.subsidio)}</span>
            </div>
            {resultado.valorSubstituicao > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>(+) Substituição ({params.diasSubstituicao}d):</span>
                <span>+{formatarMoeda(resultado.valorSubstituicao)}</span>
              </div>
            )}
            {resultado.valorHorasExtras > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>(+) Horas-Extra ({params.horasExtrasQtd}h):</span>
                <span>+{formatarMoeda(resultado.valorHorasExtras)}</span>
              </div>
            )}
            {resultado.valorFeriasTerco > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>(+) 1/3 Férias ({params.diasFerias}d):</span>
                <span>+{formatarMoeda(resultado.valorFeriasTerco)}</span>
              </div>
            )}
            <div className="border-t border-slate-100 pt-1 flex justify-between font-bold text-slate-800">
              <span>Total Bruto Tributável:</span>
              <span>{formatarMoeda(resultado.totalBrutoTributavel)}</span>
            </div>
            <div className="flex justify-between text-rose-600 text-[11px]">
              <span>(-) Previdência Militar (14%):</span>
              <span>-{formatarMoeda(resultado.ipePrev)}</span>
            </div>
            <div className="flex justify-between text-rose-600 text-[11px]">
              <span>(-) IPE Saúde (3,1%):</span>
              <span>-{formatarMoeda(resultado.ipeSaude)}</span>
            </div>
            <div className="flex justify-between text-rose-600 text-[11px]">
              <span>(-) IRRF RS:</span>
              <span>-{formatarMoeda(resultado.irrf)}</span>
            </div>
            {resultado.descontosConsignados > 0 && (
              <div className="flex justify-between text-rose-600 text-[11px]">
                <span>(-) Consignados / Banrisul:</span>
                <span>-{formatarMoeda(resultado.descontosConsignados)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-extrabold text-slate-900">
              <span>Líquido Folha Previsto (CC):</span>
              <span className="text-blue-700">{formatarMoeda(resultado.liquidoFolha)}</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 2º PASSO: ENVIO DO CONTRACHEQUE & COMPARATIVO DE DIFERENÇAS */}
        {/* ========================================================= */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span className="bg-purple-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                2º
              </span>
              Envio do Contracheque & Comparativo de Diferenças
            </h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                contrachequeConfirmado
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}
            >
              {contrachequeConfirmado ? "✓ CC Confirmado" : "Aguardando CC"}
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Envie o PDF do contracheque militar ou informe o valor líquido oficial da folha para confrontar com a previsão do simulador:
          </p>

          {/* Botão de Envio de PDF */}
          <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl shadow-sm transition">
            <FileText className="w-4 h-4 text-blue-600" />
            📄 Enviar PDF do Contracheque Militar ({titulo.split(" ")[0]})
            <input
              type="file"
              accept="application/pdf"
              onChange={handleUploadContrachequePDF}
              className="hidden"
            />
          </label>

          {statusPDFContracheque && (
            <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 p-2 rounded-lg font-medium">
              {statusPDFContracheque}
            </p>
          )}

          {/* Campo de Digitação Manual do Líquido do CC */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Líquido do CC (R$):
            </span>
            <input
              type="number"
              step="0.01"
              value={valorFolhaInput}
              onChange={(e) => setValorFolhaInput(e.target.value)}
              placeholder={resultado.liquidoFolha.toFixed(2)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {/* Box de Comparativo de Diferenças (CC vs Previsão Calculada) */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Líquido Contracheque:</span>
              <strong className="text-slate-800">{formatarMoeda(valorFolhaAtual)}</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Previsão Simulador:</span>
              <strong className="text-slate-600">{formatarMoeda(resultado.liquidoFolha)}</strong>
            </div>
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center justify-between font-bold ${
                diferencaCC > 0.05
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : diferencaCC < -0.05
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
            >
              <span>Diferença (CC vs Previsão):</span>
              <span>
                {diferencaCC > 0.05
                  ? `+ ${formatarMoeda(diferencaCC)} (CC veio a maior)`
                  : diferencaCC < -0.05
                  ? `- ${formatarMoeda(Math.abs(diferencaCC))} (CC veio a menor)`
                  : "R$ 0,00 (Exatamente conforme previsto)"}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 3º PASSO: ADIÇÃO DE VALORES EXTRAS FORA DO CONTRACHEQUE    */}
        {/* ========================================================= */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span className="bg-amber-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                3º
              </span>
              Valores Extras Fora do Contracheque
            </h4>
            <span className="text-xs font-black text-amber-700">
              Total: + {formatarMoeda(totalGanhosExtras)}
            </span>
          </div>

          <p className="text-[11px] text-slate-500">
            Adicione valores recebidos fora da folha oficial (bicos, plantões extras, vendas, freelas, diárias extras):
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Descrição (ex: Plantão extra, Bico)"
              value={novoExtraDesc}
              onChange={(e) => setNovoExtraDesc(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={novoExtraValor}
              onChange={(e) => setNovoExtraValor(e.target.value)}
              className="w-24 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                const val = parseFloat(novoExtraValor.replace(",", "."));
                if (novoExtraDesc.trim() && !isNaN(val) && val > 0 && onAdicionarExtra) {
                  onAdicionarExtra(novoExtraDesc.trim(), val);
                  setNovoExtraDesc("");
                  setNovoExtraValor("");
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-sm whitespace-nowrap"
            >
              + Adicionar
            </button>
          </div>

          {rendimentosExtras && rendimentosExtras.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {rendimentosExtras.map((extra) => (
                <div key={extra.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
                  <span className="font-medium text-slate-700">{extra.descricao}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-600">+ {formatarMoeda(extra.valor)}</span>
                    {onRemoverExtra && (
                      <button
                        type="button"
                        onClick={() => onRemoverExtra(extra.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5 font-bold"
                        title="Remover este ganho extra"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 4º PASSO: CONFIRMAÇÃO DO SALÁRIO LÍQUIDO MENSAL           */}
        {/* ========================================================= */}
        <div className="border border-emerald-300 bg-emerald-50/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-2">
              <span className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                4º
              </span>
              Composição do Salário Líquido Mensal
            </h4>
            <span className="text-xs font-bold text-emerald-700">
              Total a Receber
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-700">
              <span>Líquido da Folha (CC):</span>
              <span className="font-bold">{formatarMoeda(valorFolhaAtual)}</span>
            </div>
            {valeRefeicao > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>(+) Auxílio-Refeição (Dia 20):</span>
                <span className="font-bold">+{formatarMoeda(valeRefeicao)}</span>
              </div>
            )}
            {diarias > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>(+) Diárias do Mês:</span>
                <span className="font-bold">+{formatarMoeda(diarias)}</span>
              </div>
            )}
            {totalGanhosExtras > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>(+) Ganhos Extras Fora CC:</span>
                <span className="font-bold">+{formatarMoeda(totalGanhosExtras)}</span>
              </div>
            )}
            <div className="border-t border-emerald-200 pt-2 flex justify-between items-baseline">
              <span className="font-black text-slate-900 text-sm">Salário Líquido Total Disponível:</span>
              <span className="font-black text-emerald-700 text-lg">
                {formatarMoeda(totalLiquidoCalculado)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 5º PASSO: SALVAR PARA O MÊS E LEVAR PARA A TELA 1         */}
        {/* ========================================================= */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <span className="bg-slate-900 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">
                5º
              </span>
              Salvar Valor e Levar para a Tela 1 (Tela Inicial)
            </h4>
          </div>

          {feedbackSalvo && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                ✓ Salário de {mesAnoLabel} salvo com sucesso! O valor de {formatarMoeda(totalLiquidoCalculado)} já está sincronizado com a Tela Inicial.
              </span>
            </div>
          )}

          {contrachequeConfirmado ? (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-extrabold uppercase text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Salário Líquido Confirmado e Salvo no Banco
                  </span>
                  <p className="text-xl font-black text-emerald-700 mt-0.5">
                    {formatarMoeda(salarioLiquidoFinalConfirmado || totalLiquidoCalculado)}
                  </p>
                  <p className="text-[11px] text-emerald-800/80 mt-0.5">
                    Ativo na Tela Inicial (KPIs, saldos individuais e balanço familiar).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoValor(true)}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 shadow-sm transition"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  Editar / Reajustar Valores
                </button>
                <button
                  type="button"
                  onClick={onReverterSalario}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                  title="Voltar para a previsão calculada do simulador"
                >
                  ↺ Voltar para Previsão
                </button>
              </div>

              {editandoValor && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 pt-2">
                  <p className="text-xs text-slate-600 font-semibold">
                    Deseja alterar o valor líquido final para salvar novamente?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={executarSalvarEConfirmar}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition"
                    >
                      Salvar Novo Valor ({formatarMoeda(totalLiquidoCalculado)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditandoValor(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={executarSalvarEConfirmar}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm py-3 px-4 rounded-xl shadow-md shadow-emerald-600/25 transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar e Salvar Salário Líquido ({formatarMoeda(totalLiquidoCalculado)})
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                Clique acima para confirmar o fechamento do mês. O valor será transportado para a Tela Inicial e gravado no banco de dados.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
