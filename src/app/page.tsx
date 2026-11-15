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

type AbaAtiva = "inicio" | "poupanca" | "salarios" | "cartoes" | "contas" | "analise";

export default function DashboardPage() {
  const [aba, setAba] = useState<AbaAtiva>("inicio");
  const [mesSelecionado, setMesSelecionado] = useState<string>("2026-11");
  const [carregado, setCarregado] = useState(false);

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

  // Modal / Edição de Contas Fixas
  const [contaEditando, setContaEditando] = useState<ContaCasa | null>(null);
  const [editDescricao, setEditDescricao] = useState("");
  const [editCategoria, setEditCategoria] = useState<ContaCasa["categoria"]>("Outros");
  const [editCategoriaManual, setEditCategoriaManual] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editVencimento, setEditVencimento] = useState("");
  const [editQuemPaga, setEditQuemPaga] = useState<Pagador>("DIV");

  // Status de Sincronização Multi-Dispositivo e Servidor Central
  const [syncStatus, setSyncStatus] = useState<"sincronizado" | "salvando" | "offline" | "carregando">("carregando");
  const [ultimaSincronizacao, setUltimaSincronizacao] = useState<string | null>(null);
  const isCarregandoServidorRef = useRef(false);

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

  // Carrega a versão mais recente do servidor (/api/finance-data)
  const carregarDoServidor = async (silencioso = false) => {
    try {
      if (!silencioso) setSyncStatus("carregando");
      const res = await fetch("/api/finance-data");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          isCarregandoServidorRef.current = true;
          aplicarDados(json.data);
          localStorage.setItem("financas_victor_leticia_v3", JSON.stringify(json.data));
          setSyncStatus("sincronizado");
          setUltimaSincronizacao(new Date().toLocaleTimeString());
          return;
        }
      }
      setSyncStatus("offline");
    } catch (e) {
      console.warn("Servidor não acessível, mantendo dados locais:", e);
      setSyncStatus("offline");
    }
  };

  // Inicialização com sincronização imediata
  useEffect(() => {
    const saved = localStorage.getItem("financas_victor_leticia_v3");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
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

    // Busca do servidor para garantir sincronismo com outros dispositivos / navegadores
    carregarDoServidor(true);

    // Revalidação automática ao voltar para a aba ou janela
    const handleFocus = () => carregarDoServidor(true);
    window.addEventListener("focus", handleFocus);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") carregarDoServidor(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Polling periódico leve a cada 20s para atualizar se houver alterações de outro aparelho
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") carregarDoServidor(true);
    }, 20000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, []);

  // Salva automaticamente a cada alteração com persistência central no servidor
  useEffect(() => {
    if (!carregado) return;
    if (isCarregandoServidorRef.current) {
      isCarregandoServidorRef.current = false;
      return;
    }

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

    // Salva imediatamente em LocalStorage
    localStorage.setItem("financas_victor_leticia_v3", JSON.stringify(payload));

    // Debounce de 600ms para salvar no servidor (/api/finance-data)
    setSyncStatus("salvando");
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/finance-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          setSyncStatus("sincronizado");
          setUltimaSincronizacao(new Date().toLocaleTimeString());
        } else {
          setSyncStatus("offline");
        }
      } catch (e) {
        console.warn("Falha ao salvar no servidor central:", e);
        setSyncStatus("offline");
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [contasCasa, poupanca, salVictor, salLeticia, comprasCartao, contracheques, faturasPagas, contasExcluidas, carregado]);

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
    (contrachequeMes.victorConfirmado
      ? contrachequeMes.victorValorReal +
        (salVictor.incluirValeRefeicao ? resVictor.valeRefeicaoIndenizatorio : 0) +
        resVictor.valorDiarias
      : resVictor.totalDisponivelMes) + victorGanhosExtras;

  const salarioLeticiaFinal =
    (contrachequeMes.leticiaConfirmada
      ? contrachequeMes.leticiaValorReal +
        (salLeticia.incluirValeRefeicao ? resLeticia.valeRefeicaoIndenizatorio : 0) +
        resLeticia.valorDiarias
      : resLeticia.totalDisponivelMes) + leticiaGanhosExtras;

  const salarioLiquidoTotalCasal = salarioVictorFinal + salarioLeticiaFinal;
  const salarioPrevistoTotalCasal = resVictor.totalDisponivelMes + resLeticia.totalDisponivelMes + victorGanhosExtras + leticiaGanhosExtras;

  // Handlers para confirmação de contracheques
  const confirmarContrachequeVictor = (valor: number) => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          leticiaConfirmada: false,
          leticiaValorReal: resLeticia.liquidoFolha,
        }),
        victorConfirmado: true,
        victorValorReal: valor,
      },
    }));
  };

  const reverterContrachequeVictor = () => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          leticiaConfirmada: false,
          leticiaValorReal: resLeticia.liquidoFolha,
        }),
        victorConfirmado: false,
        victorValorReal: resVictor.liquidoFolha,
      },
    }));
  };

  const confirmarContrachequeLeticia = (valor: number) => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          victorConfirmado: false,
          victorValorReal: resVictor.liquidoFolha,
        }),
        leticiaConfirmada: true,
        leticiaValorReal: valor,
      },
    }));
  };

  const reverterContrachequeLeticia = () => {
    setContracheques((prev) => ({
      ...prev,
      [mesSelecionado]: {
        ...(prev[mesSelecionado] || {
          victorConfirmado: false,
          victorValorReal: resVictor.liquidoFolha,
        }),
        leticiaConfirmada: false,
        leticiaValorReal: resLeticia.liquidoFolha,
      },
    }));
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

  // Cálculos de Poupança (Confirmado vs Previsão Futura)
  const resumoPoupanca = useMemo(() => {
    const totalEntradasConfirmadas = poupanca
      .filter((p) => p.tipo === "ENTRADA" && p.status !== "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const totalSaidasConfirmadas = poupanca
      .filter((p) => p.tipo === "SAIDA" && p.status !== "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const saldoConfirmado = totalEntradasConfirmadas - totalSaidasConfirmadas;

    const totalEntradasPrevistas = poupanca
      .filter((p) => p.tipo === "ENTRADA" && p.status === "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const totalSaidasPrevistas = poupanca
      .filter((p) => p.tipo === "SAIDA" && p.status === "PREVISTO")
      .reduce((acc, p) => acc + p.valor, 0);

    const saldoPrevistoPendente = totalEntradasPrevistas - totalSaidasPrevistas;
    const saldoTotalProjetado = saldoConfirmado + saldoPrevistoPendente;

    const reservaEmergencia = 5000;
    const saldoLivreConfirmado = Math.max(0, saldoConfirmado - reservaEmergencia);
    const saldoLivreProjetado = Math.max(0, saldoTotalProjetado - reservaEmergencia);

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
    };
  }, [poupanca]);

  // Lançamentos Confirmados (Realizado) e Previsões Futuras (ordenados estritamente da data mais recente para a mais antiga)
  const poupancaRealizados = useMemo(() => {
    return [...poupanca]
      .filter((p) => p.status === "CONFIRMADO")
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [poupanca]);

  const poupancaPrevistos = useMemo(() => {
    return [...poupanca]
      .filter((p) => p.status === "PREVISTO")
      .sort((a, b) => b.data.localeCompare(a.data));
  }, [poupanca]);

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

  // Cálculos de Cartões no Mês Selecionado (Geral Casal)
  const resumoCartoesMes = useMemo(() => {
    const doMes = comprasCartao.filter((c) => c.mesFatura === mesSelecionado);
    let vicDireto = 0;
    let leDireto = 0;
    let divTotal = 0;

    let c6Vic = 0;
    let c6Le = 0;
    let c6Div = 0;
    let sicrediVic = 0;
    let sicrediLe = 0;
    let sicrediDiv = 0;

    doMes.forEach((item) => {
      if (item.quemPaga === "VIC") {
        vicDireto += item.valor;
        if (item.banco === "C6 Bank") c6Vic += item.valor;
        if (item.banco === "Sicredi") sicrediVic += item.valor;
      } else if (item.quemPaga === "LE") {
        leDireto += item.valor;
        if (item.banco === "C6 Bank") c6Le += item.valor;
        if (item.banco === "Sicredi") sicrediLe += item.valor;
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
      metadeDiv,
      c6Vic,
      c6Le,
      c6Div,
      sicrediVic,
      sicrediLe,
      sicrediDiv,
      totalVictorCartoes: vicDireto + metadeDiv,
      totalLeticiaCartoes: leDireto + metadeDiv,
      totalGeralCartoes: vicDireto + leDireto + divTotal,
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

    doCartao.forEach((item) => {
      if (item.quemPaga === "VIC") vicDireto += item.valor;
      else if (item.quemPaga === "LE") leDireto += item.valor;
      else divTotal += item.valor;
    });

    const metadeDiv = divTotal / 2;
    return {
      vicDireto,
      leDireto,
      divTotal,
      metadeDiv,
      totalVictorCartao: vicDireto + metadeDiv,
      totalLeticiaCartao: leDireto + metadeDiv,
      totalGeralCartao: vicDireto + leDireto + divTotal,
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
    const contasDoMes = contasCasa.filter(
      (c) => c.mesAno === mesSelecionado && c.categoria !== "Fatura Cartão"
    );
    let casaVic = 0;
    let casaLe = 0;
    let casaDiv = 0;

    contasDoMes.forEach((c) => {
      if (c.quemPaga === "VIC") casaVic += c.valor;
      else if (c.quemPaga === "LE") casaLe += c.valor;
      else casaDiv += c.valor;
    });

    const totalGastoVictor = casaVic + casaDiv / 2 + resumoCartoesMes.totalVictorCartoes;
    const totalGastoLeticia = casaLe + casaDiv / 2 + resumoCartoesMes.totalLeticiaCartoes;
    const totalGastoCasal = totalGastoVictor + totalGastoLeticia;

    return {
      contasDoMes,
      totalGastoVictor,
      totalGastoLeticia,
      totalGastoCasal,
      saldoVictor: salarioVictorFinal - totalGastoVictor,
      saldoLeticia: salarioLeticiaFinal - totalGastoLeticia,
    };
  }, [contasCasa, mesSelecionado, resumoCartoesMes, salarioVictorFinal, salarioLeticiaFinal]);

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

  const deletarConta = (id: string) => {
    setContasCasa((prev) => prev.filter((c) => c.id !== id));
    setContasExcluidas((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
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

      // Preenche os campos do formulário para o usuário
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

      // Se for fatura de cartão (C6 Bank ou Sicredi), também extrai as compras itemizadas para a aba Cartões
      if (dados.isFaturaCartao && dados.bancoCartao) {
        const banco = dados.bancoCartao;
        const compras = parsearLinhasFatura(dados.textoCompleto, banco, mesSelecionado);
        if (compras.length > 0) {
          const comIds: CompraCartao[] = compras.map((item, idx) => {
            const jaExistia = comprasCartao.some(
              (c) =>
                c.banco === banco &&
                c.mesFatura < mesSelecionado &&
                c.descricao.toLowerCase().trim() === item.descricao.toLowerCase().trim()
            );
            const isNova = !jaExistia || (item.parcelaInfo && item.parcelaInfo.startsWith("1/"));
            return {
              ...item,
              id: `${Date.now()}-${idx}`,
              isNova: Boolean(isNova),
            };
          });
          setComprasCartao((prev) => [...comIds, ...prev]);
          setStatusPDF(
            `✓ Fatura de Cartão detectada: ${dados.descricao} • R$ ${dados.valor.toFixed(2)} • Vencimento: ${dados.vencimento} • ${compras.length} compras importadas para a Aba Cartões!`
          );
        } else {
          setStatusPDF(
            `✓ Fatura detectada: ${dados.descricao} • R$ ${dados.valor.toFixed(2)} • Vencimento: ${dados.vencimento}.`
          );
        }
      } else {
        setStatusPDF(
          `✓ PDF detectado com sucesso: ${dados.descricao} • R$ ${dados.valor > 0 ? dados.valor.toFixed(2) : "0,00"} • Vencimento: ${dados.vencimento || "Não identificado"}. Os campos foram preenchidos abaixo.`
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

  const alternarStatusPoupanca = (id: string) => {
    setPoupanca((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "PREVISTO" ? "CONFIRMADO" : "PREVISTO" }
          : p
      )
    );
  };

  const adicionarCompraCartaoPoupanca = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(compraCartaoPoupValor.replace(",", "."));
    if (!compraCartaoPoupDesc.trim() || isNaN(val) || val <= 0) return;

    const parcTexto = compraCartaoPoupParcelas ? ` • ${compraCartaoPoupParcelas}x` : "";
    const descFormatada = `[Cartão ${compraCartaoPoupBanco}${parcTexto}] ${compraCartaoPoupDesc.trim()}`;

    const novaMov: MovimentacaoPoupanca = {
      id: `cartao-poup-${Date.now()}`,
      data: compraCartaoPoupData || new Date().toISOString().slice(0, 10),
      descricao: descFormatada,
      tipo: "SAIDA",
      valor: val,
      categoria: "Metas / Projetos",
      status: compraCartaoPoupStatus,
    };

    setPoupanca((prev) => [novaMov, ...prev]);
    setCompraCartaoPoupDesc("");
    setCompraCartaoPoupValor("");
    setCompraCartaoPoupParcelas("1");
  };

  const alternarPagoConta = (id: string) => {
    setContasCasa((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pago: !c.pago } : c))
    );
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
              onClick={() => carregarDoServidor(false)}
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

            <div className="flex items-center gap-1.5">
              <label className="text-xs text-slate-300">Mês:</label>
              <input
                type="month"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-400"
              />
            </div>
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
            {/* Barra de Ação Principal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Resumo Geral do Mês ({mesSelecionado})</h2>
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
                      <h3 className="font-bold text-base">Gastos Victor no Mês ({mesSelecionado})</h3>
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
                      <h3 className="font-bold text-base">Gastos Letícia no Mês ({mesSelecionado})</h3>
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{mov.descricao}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
                            ✓ Confirmado
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="date"
                            value={mov.data}
                            onChange={(e) => {
                              const novaData = e.target.value;
                              setPoupanca((prev) =>
                                prev.map((p) => (p.id === mov.id ? { ...p, data: novaData } : p))
                              );
                            }}
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
                          onClick={() => alternarStatusPoupanca(mov.id)}
                          className="text-[11px] text-slate-500 hover:text-amber-800 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 px-2.5 py-1 rounded-lg transition"
                          title="Mover de volta para previsão futura"
                        >
                          Tornar Previsão
                        </button>

                        <button
                          onClick={() => setPoupanca((prev) => prev.filter((p) => p.id !== mov.id))}
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
                    Previsões de receitas e saídas futuras • Ordem: mais recente para o mais antigo • Confirme com 1 clique no dia
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
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{mov.descricao}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-800 border-amber-300">
                            ⏳ Previsão Futura
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="date"
                            value={mov.data}
                            onChange={(e) => {
                              const novaData = e.target.value;
                              setPoupanca((prev) =>
                                prev.map((p) => (p.id === mov.id ? { ...p, data: novaData } : p))
                              );
                            }}
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
                          onClick={() => alternarStatusPoupanca(mov.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition flex items-center gap-1.5"
                          title="Confirmar que o valor entrou/saiu na conta hoje e mover para o Extrato Realizado"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmar {mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}
                        </button>

                        <button
                          onClick={() => setPoupanca((prev) => prev.filter((p) => p.id !== mov.id))}
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
                onChange={setSalVictor}
                resultado={resVictor}
                mesAnoLabel={formatarMesAnoLabel(mesSelecionado)}
                contrachequeConfirmado={contrachequeMes.victorConfirmado}
                valorRealContracheque={contrachequeMes.victorValorReal}
                onConfirmarContracheque={confirmarContrachequeVictor}
                onReverterContracheque={reverterContrachequeVictor}
                rendimentosExtras={contrachequeMes.victorExtras || []}
                onAdicionarExtra={adicionarExtraVictor}
                onRemoverExtra={removerExtraVictor}
              />

              {/* Letícia Roque */}
              <SalarioCard
                titulo="Letícia Roque"
                cor="purple"
                params={salLeticia}
                onChange={setSalLeticia}
                resultado={resLeticia}
                mesAnoLabel={formatarMesAnoLabel(mesSelecionado)}
                contrachequeConfirmado={contrachequeMes.leticiaConfirmada}
                valorRealContracheque={contrachequeMes.leticiaValorReal}
                onConfirmarContracheque={confirmarContrachequeLeticia}
                onReverterContracheque={reverterContrachequeLeticia}
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
                    💳 Fatura Atual ({mesSelecionado})
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

                {/* Cards de Divisão do Cartão Selecionado (VIC / LE / DIV 50-50) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <div className="bg-slate-900 text-white p-4 rounded-2xl">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Rateio {bancoFiltro}</span>
                    <p className="text-sm mt-1">
                      Victor: <strong className="text-emerald-400">{formatarMoeda(resumoCartaoSelecionado.totalVictorCartao)}</strong>
                    </p>
                    <p className="text-sm">
                      Letícia: <strong className="text-emerald-400">{formatarMoeda(resumoCartaoSelecionado.totalLeticiaCartao)}</strong>
                    </p>
                  </div>
                </div>

                {/* Alerta de Novas Compras Pendentes de Definição de Pagador */}
                {comprasCartao.filter((c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado && c.isNova).length > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Atenção: <strong>{comprasCartao.filter((c) => c.banco === bancoFiltro && c.mesFatura === mesSelecionado && c.isNova).length} nova(s) compra(s) detectada(s)</strong> nesta fatura em relação ao mês anterior (destacadas em vermelho). Clique em <strong>VIC</strong>, <strong>LE</strong> ou <strong>DIV</strong> para definir quem paga.
                      </span>
                    </div>
                  </div>
                )}

                {/* Tabela de Lançamentos do Cartão Selecionado */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">Lançamentos — {bancoFiltro} ({mesSelecionado})</h3>
                    <span className="text-xs text-slate-500">Clique em VIC / LE / DIV para definir quem paga e recalcular na hora</span>
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
                                    {(["VIC", "LE", "DIV"] as Pagador[]).map((opcao) => (
                                      <button
                                        key={opcao}
                                        onClick={() => alterarPagadorCompra(compra.id, opcao)}
                                        className={`px-2.5 py-1 text-xs font-bold transition ${
                                          compra.quemPaga === opcao
                                            ? opcao === "VIC"
                                              ? "bg-blue-600 text-white"
                                              : opcao === "LE"
                                              ? "bg-purple-600 text-white"
                                              : "bg-amber-500 text-white"
                                            : "bg-white text-slate-500 hover:bg-slate-100"
                                        }`}
                                      >
                                        {opcao}
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
                          <th className="px-6 py-3 text-right">Rateio (Victor / Letícia)</th>
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
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {parc.quemPaga === "DIV" ? "Dividido (50/50)" : parc.quemPaga === "VIC" ? "100% Victor" : "100% Letícia"}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-right text-xs">
                                <span className="text-blue-600 font-bold">V: {formatarMoeda(parc.valorVictor)}</span>
                                <span className="text-slate-300 mx-1.5">•</span>
                                <span className="text-purple-600 font-bold">L: {formatarMoeda(parc.valorLeticia)}</span>
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
                      onClick={() => setMesVisualizadoContas(proj.mesAno)}
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
                                <span className={c.quemPaga === "DIV" ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
                                  {c.quemPaga === "DIV" ? "50/50" : c.quemPaga === "VIC" ? "Victor" : "Letícia"}
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
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {p.quemPaga === "DIV" ? "Dividido 50/50" : p.quemPaga === "VIC" ? "100% Victor" : "100% Letícia"}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500">
                              (V: {formatarMoeda(p.valorVictor)} • L: {formatarMoeda(p.valorLeticia)})
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

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-300 font-medium">Mês de Análise:</label>
                <input
                  type="month"
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-400"
                />
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
            {/* SEÇÃO AO FIM DA PÁGINA: RESUMO DA PROJEÇÃO DOS PRÓXIMOS MESES */}
            {/* ========================================================= */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-base">Resumo da Projeção dos Próximos Meses (DRE Familiar)</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Visão projetada mês a mês separada para Victor e Letícia, antecipando receitas, contas fixas, parcelas de cartões e saldo livre.
                  </p>
                </div>
                <span className="text-xs bg-white/10 px-3 py-1 rounded-full font-semibold border border-white/10">
                  Próximos 6 Meses
                </span>
              </div>

              {/* Destaques das Regras Futuras */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-base">💡</span>
                  <div>
                    <strong className="text-slate-800 block">Dezembro/2026: Novas Contas Fixas</strong>
                    <span className="text-slate-500">
                      Aluguel R$ 1.450 (dia 02) • Luz R$ 350 • Água R$ 120 • Internet R$ 135
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <Car className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-emerald-900 block">Janeiro/2027: Parcela do Carro</strong>
                    <span className="text-emerald-700">
                      Início em 12/01/2027: R$ 1.750,00/mês (Dividido: R$ 875,00 Victor / R$ 875,00 Letícia)
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-base">📉</span>
                  <div>
                    <strong className="text-slate-800 block">Redução de Parcelas de Cartão</strong>
                    <span className="text-slate-500">
                      Parcelas antigas são quitadas mês a mês, aliviando o orçamento familiar
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabela de Projeção Mês a Mês */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Mês / Ano</th>
                      <th className="px-4 py-3 text-blue-900 bg-blue-50/50">Victor: Salário</th>
                      <th className="px-4 py-3 text-blue-900 bg-blue-50/50">Victor: Contas</th>
                      <th className="px-4 py-3 text-blue-900 bg-blue-50/50">Victor: Saldo</th>
                      <th className="px-4 py-3 text-purple-900 bg-purple-50/50">Letícia: Salário</th>
                      <th className="px-4 py-3 text-purple-900 bg-purple-50/50">Letícia: Contas</th>
                      <th className="px-4 py-3 text-purple-900 bg-purple-50/50">Letícia: Saldo</th>
                      <th className="px-4 py-3 text-slate-900 bg-slate-100">Casal: Renda</th>
                      <th className="px-4 py-3 text-slate-900 bg-slate-100">Casal: Contas</th>
                      <th className="px-4 py-3 text-emerald-900 bg-emerald-50">Sobra Familiar</th>
                      <th className="px-4 py-3">Destaques / Eventos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {projecao6Meses.map((p) => {
                      const isAtual = p.mesAno === mesSelecionado;
                      const salVic = isAtual ? salarioVictorFinal : resVictor.liquidoFolha;
                      const salLet = isAtual ? salarioLeticiaFinal : resLeticia.liquidoFolha;
                      const saldoVic = salVic - p.totalGeralVictor;
                      const saldoLet = salLet - p.totalGeralLeticia;
                      const rendaCasal = salVic + salLet;
                      const despesaCasal = p.totalGeral;
                      const sobraCasal = rendaCasal - despesaCasal;

                      return (
                        <tr
                          key={p.mesAno}
                          className={`hover:bg-slate-50 transition ${
                            isAtual ? "bg-amber-50/40 font-semibold" : ""
                          }`}
                        >
                          {/* Mês / Ano */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-slate-900">{p.label}</span>
                            {isAtual && (
                              <span className="ml-1.5 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                Atual
                              </span>
                            )}
                          </td>

                          {/* Victor */}
                          <td className="px-4 py-3 whitespace-nowrap bg-blue-50/30 text-blue-900">
                            {formatarMoeda(salVic)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap bg-blue-50/30 font-semibold text-slate-800">
                            {formatarMoeda(p.totalGeralVictor)}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Fixas: {formatarMoeda(p.totalContasVictor)} | Cart: {formatarMoeda(p.totalParcelasVictor)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap bg-blue-50/30">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                saldoVic >= 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {formatarMoeda(saldoVic)}
                            </span>
                          </td>

                          {/* Letícia */}
                          <td className="px-4 py-3 whitespace-nowrap bg-purple-50/30 text-purple-900">
                            {formatarMoeda(salLet)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap bg-purple-50/30 font-semibold text-slate-800">
                            {formatarMoeda(p.totalGeralLeticia)}
                            <span className="block text-[10px] text-slate-400 font-normal">
                              Fixas: {formatarMoeda(p.totalContasLeticia)} | Cart: {formatarMoeda(p.totalParcelasLeticia)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap bg-purple-50/30">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                saldoLet >= 0
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {formatarMoeda(saldoLet)}
                            </span>
                          </td>

                          {/* Casal / Família */}
                          <td className="px-4 py-3 whitespace-nowrap bg-slate-50 font-bold text-slate-900">
                            {formatarMoeda(rendaCasal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap bg-slate-50 font-extrabold text-slate-800">
                            {formatarMoeda(despesaCasal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap bg-emerald-50/50">
                            <span
                              className={`font-black text-xs ${
                                sobraCasal >= 0 ? "text-emerald-700" : "text-rose-600"
                              }`}
                            >
                              {formatarMoeda(sobraCasal)}
                            </span>
                          </td>

                          {/* Destaques / Eventos */}
                          <td className="px-4 py-3 text-[11px] text-slate-600">
                            {p.mesAno === "2026-11" && (
                              <span className="text-blue-700 font-semibold">
                                Faturas fechadas (C6 R$ 2.890,81 + Sicredi R$ 3.609,22)
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

// Componente Reutilizável da Aba 3 (Salários & Rendimentos)
function SalarioCard({
  titulo,
  cor,
  params,
  onChange,
  resultado,
  mesAnoLabel,
  contrachequeConfirmado,
  valorRealContracheque,
  onConfirmarContracheque,
  onReverterContracheque,
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
  contrachequeConfirmado: boolean;
  valorRealContracheque: number;
  onConfirmarContracheque: (valor: number) => void;
  onReverterContracheque: () => void;
  rendimentosExtras?: RendimentoExtraItem[];
  onAdicionarExtra?: (descricao: string, valor: number) => void;
  onRemoverExtra?: (id: string) => void;
}) {
  const badgeColor = cor === "blue" ? "bg-blue-600" : "bg-purple-600";
  const [inputVal, setInputVal] = useState<string>(() => resultado.liquidoFolha.toFixed(2));
  const [statusPDFContracheque, setStatusPDFContracheque] = useState<string>("");
  const [novoExtraDesc, setNovoExtraDesc] = useState("");
  const [novoExtraValor, setNovoExtraValor] = useState("");
  const [editandoValor, setEditandoValor] = useState(false);
  const [inputValorEditado, setInputValorEditado] = useState<string>(() =>
    contrachequeConfirmado ? valorRealContracheque.toFixed(2) : resultado.liquidoFolha.toFixed(2)
  );

  const totalGanhosExtras = rendimentosExtras.reduce((acc, it) => acc + it.valor, 0);

  // Sincroniza o valor sugerido se mudar a simulação e não estiver confirmado
  useEffect(() => {
    if (!contrachequeConfirmado) {
      setInputVal(resultado.liquidoFolha.toFixed(2));
      setInputValorEditado(resultado.liquidoFolha.toFixed(2));
    } else {
      setInputValorEditado(valorRealContracheque.toFixed(2));
    }
  }, [resultado.liquidoFolha, contrachequeConfirmado, valorRealContracheque]);

  const handleUploadContrachequePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatusPDFContracheque("Lendo PDF do contracheque militar RS...");
    try {
      const titularPadrao = cor === "blue" ? "Victor" : "Leticia";
      const dados = await extrairDadosContrachequePDF(file, titularPadrao);
      if (dados.valorLiquido > 0) {
        onConfirmarContracheque(dados.valorLiquido);
        setStatusPDFContracheque(
          `✓ Contracheque militar ${dados.titularDetectado ? `(${dados.titularDetectado})` : ""} confirmado! Líquido a Receber: ${formatarMoeda(dados.valorLiquido)}`
        );
      } else {
        setStatusPDFContracheque(
          "Não foi possível extrair automaticamente a linha 'LÍQUIDO A RECEBER' do contracheque. Digite o valor no campo abaixo para confirmar."
        );
      }
    } catch (err: any) {
      console.error(err);
      setStatusPDFContracheque("Erro ao ler o PDF: " + (err?.message || "Arquivo ilegível ou protegido."));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className={`${badgeColor} text-white px-6 py-4 flex items-center justify-between`}>
        <h3 className="font-bold text-base">{titulo}</h3>
        <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">Tabela RS 2026</span>
      </div>

      <div className="p-6 space-y-4">
        {/* Parâmetros Editáveis */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subsídio Base (R$)</label>
            <input
              type="number"
              step="0.01"
              value={params.subsídioBase}
              onChange={(e) => onChange({ ...params, subsídioBase: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Substituição de Posto</label>
            <select
              value={params.tipoSubstituicao}
              onChange={(e) =>
                onChange({
                  ...params,
                  tipoSubstituicao: e.target.value as ParametrosSalario["tipoSubstituicao"],
                  diasSubstituicao: e.target.value === "NENHUMA" ? 0 : 30,
                })
              }
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            >
              <option value="NENHUMA">Sem Substituição</option>
              <option value="2_SGT">Substituição 2º Sgt</option>
              <option value="1_SGT">Substituição 1º Sgt</option>
              <option value="1_TEN">Substituição 1º Ten</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Substit.</label>
            <input
              type="number"
              min={0}
              max={30}
              value={params.diasSubstituicao}
              onChange={(e) => onChange({ ...params, diasSubstituicao: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Horas-Extra (Qtd)</label>
            <input
              type="number"
              min={0}
              value={params.horasExtrasQtd}
              onChange={(e) => onChange({ ...params, horasExtrasQtd: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Dias Férias (1/3)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={params.diasFerias}
              onChange={(e) => onChange({ ...params, diasFerias: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Diárias (Qtd)</label>
            <input
              type="number"
              min={0}
              value={params.diariasQtd}
              onChange={(e) => onChange({ ...params, diariasQtd: parseInt(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Acordo Banrisul (R$)</label>
            <input
              type="number"
              step="0.01"
              value={params.descontoBanrisul}
              onChange={(e) => onChange({ ...params, descontoBanrisul: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Outros Consignados (GBOEX)</label>
            <input
              type="number"
              step="0.01"
              value={params.outrosDescontosFixos}
              onChange={(e) => onChange({ ...params, outrosDescontosFixos: parseFloat(e.target.value) || 0 })}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
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

        {/* Demonstrativo Detalhado */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>(+) Subsídio Base:</span>
            <span className="font-semibold">{formatarMoeda(resultado.subsidio)}</span>
          </div>
          {resultado.valorSubstituicao > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) Substituição ({params.diasSubstituicao} dias):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorSubstituicao)}</span>
            </div>
          )}
          {resultado.valorHorasExtras > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) Horas-Extra ({params.horasExtrasQtd}h GSE):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorHorasExtras)}</span>
            </div>
          )}
          {resultado.valorFeriasTerco > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>(+) 1/3 Férias ({params.diasFerias} dias):</span>
              <span className="font-semibold">+ {formatarMoeda(resultado.valorFeriasTerco)}</span>
            </div>
          )}
          <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-800">
            <span>Total Bruto Tributável:</span>
            <span>{formatarMoeda(resultado.totalBrutoTributavel)}</span>
          </div>

          <div className="flex justify-between text-rose-600">
            <span>(-) IPE Previdência Militar (SPSMER):</span>
            <span>- {formatarMoeda(resultado.ipePrev)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) IPE Saúde (3,6%):</span>
            <span>- {formatarMoeda(resultado.ipeSaude)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) IRRF (Tabela 2026 + Redutor Lei 15.270):</span>
            <span>- {formatarMoeda(resultado.irrf)}</span>
          </div>
          <div className="flex justify-between text-rose-600">
            <span>(-) Consignados / Banrisul / GBOEX:</span>
            <span>- {formatarMoeda(resultado.descontosConsignados)}</span>
          </div>

          <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
            <span>Líquido em Conta (Contracheque):</span>
            <span className="text-emerald-600">{formatarMoeda(resultado.liquidoFolha)}</span>
          </div>

          {(resultado.valeRefeicaoIndenizatorio > 0 || resultado.valorDiarias > 0) && (
            <div className="pt-1 space-y-1 text-slate-600">
              {resultado.valeRefeicaoIndenizatorio > 0 && (
                <div className="flex justify-between">
                  <span>(+) Vale-Refeição (Dia 20 - Isento):</span>
                  <span>+ {formatarMoeda(resultado.valeRefeicaoIndenizatorio)}</span>
                </div>
              )}
              {resultado.valorDiarias > 0 && (
                <div className="flex justify-between">
                  <span>(+) Diárias ({params.diariasQtd} diárias - Isento):</span>
                  <span>+ {formatarMoeda(resultado.valorDiarias)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                <span>Total Disponível no Mês:</span>
                <span>{formatarMoeda(resultado.totalDisponivelMes + totalGanhosExtras)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Confirmação do Salário Calculado & Opção de Edição */}
        <div className="p-4 rounded-xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Confirmação do Salário Líquido ({mesAnoLabel})
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-700">
                  {formatarMoeda(contrachequeConfirmado ? valorRealContracheque : resultado.liquidoFolha)}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {contrachequeConfirmado ? "(Valor Oficial Confirmado)" : "(Líquido Calculado)"}
                </span>
              </div>
              {(params.incluirValeRefeicao || resultado.valorDiarias > 0 || totalGanhosExtras > 0) && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Total com VR, Diárias e Extras:{" "}
                  <strong className="text-slate-800">
                    {formatarMoeda(
                      (contrachequeConfirmado ? valorRealContracheque : resultado.liquidoFolha) +
                        (params.incluirValeRefeicao ? resultado.valeRefeicaoIndenizatorio : 0) +
                        resultado.valorDiarias +
                        totalGanhosExtras
                    )}
                  </strong>
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {contrachequeConfirmado ? (
                <>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Confirmado no Mês
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoValor(true);
                      setInputValorEditado(valorRealContracheque.toFixed(2));
                    }}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 shadow-sm transition"
                    title="Editar valor caso tenha algo diferente"
                  >
                    <Pencil className="w-3.5 h-3.5 text-blue-600" />
                    Editar Valor
                  </button>
                  <button
                    type="button"
                    onClick={onReverterContracheque}
                    className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition"
                    title="Voltar para a previsão calculada do simulador"
                  >
                    ↺ Recalcular
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onConfirmarContracheque(resultado.liquidoFolha)}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-emerald-600/25 transition active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Salário Líquido ({formatarMoeda(resultado.liquidoFolha)})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditandoValor(true);
                      setInputValorEditado(resultado.liquidoFolha.toFixed(2));
                    }}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 shadow-sm transition"
                    title="Editar valor caso tenha algo diferente"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    Editar / Outro Valor
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Editor Inline de Valor Diferente */}
          {editandoValor && (
            <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Ajustar Valor Líquido (R$):
              </span>
              <input
                type="number"
                step="0.01"
                placeholder={resultado.liquidoFolha.toFixed(2)}
                value={inputValorEditado}
                onChange={(e) => setInputValorEditado(e.target.value)}
                className="w-full sm:w-44 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(inputValorEditado.replace(",", "."));
                    if (!isNaN(val) && val > 0) {
                      onConfirmarContracheque(val);
                      setEditandoValor(false);
                    }
                  }}
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow-sm transition"
                >
                  Salvar e Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoValor(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-2.5 py-1.5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Confirmação do Contracheque Real do Mês */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Contracheque Oficial ({mesAnoLabel})
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                contrachequeConfirmado
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-amber-100 text-amber-800 border-amber-300"
              }`}
            >
              {contrachequeConfirmado ? "✓ Líquido Confirmado no Mês" : "⏳ Previsão / Simulador"}
            </span>
          </div>

          {contrachequeConfirmado ? (
            <div className="space-y-2 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
              <div className="flex justify-between items-center">
                <span className="text-xs text-emerald-900 font-semibold">Líquido a Receber Oficial:</span>
                <span className="text-base font-black text-emerald-700">
                  {formatarMoeda(valorRealContracheque)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500 pt-1 border-t border-emerald-200/60">
                <span>Previsão Folha (Líquido): {formatarMoeda(resultado.liquidoFolha)}</span>
                <span className={valorRealContracheque >= resultado.liquidoFolha ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                  Diferença: {formatarMoeda(valorRealContracheque - resultado.liquidoFolha)}
                </span>
              </div>
              {(params.incluirValeRefeicao || resultado.valorDiarias > 0 || totalGanhosExtras > 0) && (
                <div className="text-[11px] text-slate-600 pt-1.5 border-t border-emerald-200/50 flex flex-col gap-0.5">
                  <div className="flex justify-between">
                    <span>Líquido Contracheque:</span>
                    <span className="font-semibold">{formatarMoeda(valorRealContracheque)}</span>
                  </div>
                  {params.incluirValeRefeicao && (
                    <div className="flex justify-between text-emerald-800">
                      <span>(+) Auxílio-Refeição (Dia 20):</span>
                      <span className="font-semibold">+{formatarMoeda(resultado.valeRefeicaoIndenizatorio)}</span>
                    </div>
                  )}
                  {resultado.valorDiarias > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>(+) Diárias do Mês:</span>
                      <span className="font-semibold">+{formatarMoeda(resultado.valorDiarias)}</span>
                    </div>
                  )}
                  {totalGanhosExtras > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>(+) Ganhos Extras Fora Contracheque:</span>
                      <span className="font-semibold">+{formatarMoeda(totalGanhosExtras)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-emerald-200/80">
                    <span>Total Disponível no Mês:</span>
                    <span>
                      {formatarMoeda(
                        valorRealContracheque +
                          (params.incluirValeRefeicao ? resultado.valeRefeicaoIndenizatorio : 0) +
                          resultado.valorDiarias +
                          totalGanhosExtras
                      )}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditandoValor(true);
                    setInputValorEditado(valorRealContracheque.toFixed(2));
                  }}
                  className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition shadow-sm inline-flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                  Editar Valor
                </button>
                <label className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition text-center shadow-sm">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  Substituir por outro PDF
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleUploadContrachequePDF}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={onReverterContracheque}
                  className="py-1.5 px-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition"
                >
                  Voltar p/ Previsão
                </button>
              </div>
              {statusPDFContracheque && (
                <p className="text-[11px] text-blue-700 font-medium pt-1">{statusPDFContracheque}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Envie o PDF do contracheque militar para extrair e confirmar o <strong>Líquido a Receber</strong> oficial, ou digite o valor abaixo:
              </p>

              {/* Botão de Envio de PDF do Contracheque */}
              <div>
                <label className="cursor-pointer inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl shadow-sm transition">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  📄 Incluir PDF do Contracheque ({cor === "blue" ? "Victor" : "Letícia"})
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleUploadContrachequePDF}
                    className="hidden"
                  />
                </label>
              </div>

              {statusPDFContracheque && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                  <span>{statusPDFContracheque}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 font-semibold uppercase whitespace-nowrap">
                  Líquido a Receber:
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder={resultado.liquidoFolha.toFixed(2)}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(inputVal.replace(",", "."));
                    if (!isNaN(val) && val > 0) onConfirmarContracheque(val);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-sm"
                >
                  Confirmar Líquido
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rendimentos Extras Fora do Contracheque (Bicos, Vendas, Serviços, etc.) */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
              Ganhos Extras Fora do Contracheque
            </span>
            <span className="text-xs font-black text-emerald-600">
              Total: {formatarMoeda(totalGanhosExtras)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Adicione valores recebidos fora da folha de pagamento (bicos, plantões adicionais, vendas, freelas) para somar ao total disponível do mês:
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Descrição (ex: Plantão extra, Venda)"
              value={novoExtraDesc}
              onChange={(e) => setNovoExtraDesc(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={novoExtraValor}
              onChange={(e) => setNovoExtraValor(e.target.value)}
              className="w-24 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-sm whitespace-nowrap"
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
                        title="Remover ganho extra"
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
      </div>
    </div>
  );
}
