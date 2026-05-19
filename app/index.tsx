import { File, Paths } from "expo-file-system/next";
import * as Location from "expo-location";
import { Accelerometer, Magnetometer } from "expo-sensors";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import dadosCidadesJson from "./dados_irradiacao.json";

const C = {
  bg: "#080C18",
  surface: "#0F1628",
  card: "#141C32",
  border: "#1E2A45",
  amber: "#F59E0B",
  amberDim: "#F59E0B26",
  amberMid: "#F59E0B60",
  blue: "#3B82F6",
  blueDim: "#3B82F620",
  white: "#FFFFFF",
  grey1: "#94A3B8",
  grey2: "#334155",
  danger: "#EF4444",
};

const COORDENADAS_CIDADES: Record<string, { lat: number; lon: number }> = {
  Aracaju: { lat: -10.9472, lon: -37.0731 },
  Belém: { lat: -1.4558, lon: -48.5044 },
  "Belo Horizonte": { lat: -19.9208, lon: -43.9378 },
  "Boa Vista": { lat: 2.8235, lon: -60.6758 },
  Brasília: { lat: -15.7938, lon: -47.8828 },
  Cuiabá: { lat: -15.6014, lon: -56.0974 },
  Curitiba: { lat: -25.429, lon: -49.2671 },
  Florianópolis: { lat: -27.5954, lon: -48.548 },
  Fortaleza: { lat: -3.7327, lon: -38.527 },
  Goiânia: { lat: -16.6869, lon: -49.2648 },
  "João Pessoa": { lat: -7.1195, lon: -34.845 },
  Macapá: { lat: 0.0389, lon: -51.0664 },
  Maceió: { lat: -9.6498, lon: -35.7089 },
  Manaus: { lat: -3.119, lon: -60.0217 },
  Natal: { lat: -5.7945, lon: -35.211 },
  Palmas: { lat: -10.2491, lon: -48.3243 },
  "Porto Alegre": { lat: -30.0277, lon: -51.2287 },
  Recife: { lat: -8.0476, lon: -34.877 },
  "Rio Branco": { lat: -9.9749, lon: -67.8105 },
  "Rio de Janeiro": { lat: -22.9068, lon: -43.1729 },
  Salvador: { lat: -12.9714, lon: -38.5014 },
  "São Luís": { lat: -2.5307, lon: -44.3068 },
  "São Paulo": { lat: -23.5505, lon: -46.6333 },
  Teresina: { lat: -5.0892, lon: -42.8016 },
  Vitória: { lat: -20.3155, lon: -40.3128 },
};

function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type ItemIrradiacao = { azimute: number; elevacao: number; valor: number };
type DadosCidades = Record<string, ItemIrradiacao[]>;
type HistoricoItem = {
  id: string;
  nome: string;
  azimute: number;
  elevacao: number;
  medido: number;
  percentual: string;
};

const dados: DadosCidades = dadosCidadesJson as DadosCidades;
const listaCidades = Object.keys(dados).sort();

// ─── Arco de progresso SVG-style via View rotacionadas ───────────────────────
function ArcProgress({ pct }: { pct: number }) {
  const clamp = Math.min(100, Math.max(0, pct));
  const color = clamp >= 70 ? C.amber : clamp >= 40 ? "#FBBF24" : C.blue;

  return (
    <View style={arc.wrap}>
      <View style={arc.track} />
      <View
        style={[
          arc.fill,
          { width: `${clamp}%` as any, backgroundColor: color },
        ]}
      />
      <View style={arc.center}>
        <Text style={arc.label}>EFICIÊNCIA</Text>
        <Text style={[arc.value, { color }]}>{clamp.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

const arc = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  track: {
    width: "100%",
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    marginBottom: 12,
  },
  fill: {
    position: "absolute",
    top: 20,
    left: 16,
    height: 8,
    borderRadius: 4,
  },
  center: {
    alignItems: "center",
    marginTop: 8,
  },
  label: {
    color: C.grey1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: {
    fontSize: 64,
    fontWeight: "900",
    letterSpacing: -2,
  },
});

// ─── Card de métrica ──────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={[mc.card, accent && mc.cardAccent]}>
      <Text style={mc.label}>{label}</Text>
      <Text style={[mc.value, accent && mc.valueAccent]}>{value}</Text>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  cardAccent: {
    borderColor: C.amberMid,
    backgroundColor: C.amberDim,
  },
  label: {
    color: C.grey1,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: {
    color: C.white,
    fontSize: 22,
    fontWeight: "800",
  },
  valueAccent: {
    color: C.amber,
  },
});

// ─── Linha da tabela ──────────────────────────────────────────────────────────
function HistoricoRow({
  item,
  isFirst,
  onPress,
}: {
  item: HistoricoItem;
  isFirst: boolean;
  onPress: () => void;
}) {
  const pct = parseInt(item.percentual, 10);
  const barColor = pct >= 70 ? C.amber : pct >= 40 ? "#FBBF24" : C.blue;

  return (
    <TouchableOpacity
      style={[hr.row, isFirst && hr.rowFirst]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={hr.nameCol}>
        <Text style={[hr.name, isFirst && hr.nameFirst]} numberOfLines={1}>
          {item.nome}
        </Text>
        <View style={hr.miniBar}>
          <View
            style={[
              hr.miniBarFill,
              { width: `${pct}%` as any, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
      <Text style={[hr.cell, isFirst && hr.cellFirst]}>{item.azimute}°</Text>
      <Text style={[hr.cell, isFirst && hr.cellFirst]}>{item.elevacao}°</Text>
      <Text style={[hr.pct, { color: barColor }]}>{item.percentual}</Text>
    </TouchableOpacity>
  );
}

const hr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  rowFirst: {
    borderColor: C.amberMid,
    backgroundColor: C.amberDim,
  },
  nameCol: { flex: 1.1, marginRight: 6 },
  name: { color: C.grey1, fontSize: 13, fontWeight: "600", marginBottom: 4 },
  nameFirst: { color: C.white, fontWeight: "700" },
  miniBar: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  miniBarFill: { height: 3, borderRadius: 2 },
  cell: {
    flex: 0.95,
    color: C.grey1,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  cellFirst: { color: C.white, fontWeight: "700" },
  pct: { flex: 1, fontSize: 13, fontWeight: "800", textAlign: "right" },
});

// ─── App principal ────────────────────────────────────────────────────────────
export default function App() {
  const cidadeInicial =
    listaCidades.find((c) => c.toLowerCase().includes("aracaju")) ||
    listaCidades[0] ||
    "";

  const [cidadeSelecionada, setCidadeSelecionada] = useState(cidadeInicial);
  const [modalCidadeVisivel, setModalCidadeVisivel] = useState(false);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(true);

  const [azimute, setAzimute] = useState(0);
  const [elevacao, setElevacao] = useState(0);
  const [medido, setMedido] = useState(0);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  const [itemSelecionado, setItemSelecionado] = useState<HistoricoItem | null>(
    null,
  );
  const [modalDetalheVisivel, setModalDetalheVisivel] = useState(false);
  const [nomeEditando, setNomeEditando] = useState("");

  const saveScale = useRef(new Animated.Value(1)).current;

  const melhorValor = useMemo(() => {
    const d = dados[cidadeSelecionada];
    if (!d || d.length === 0) return 0;
    return Math.max(...d.map((i) => i.valor));
  }, [cidadeSelecionada]);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCarregandoLocalizacao(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        let menorDist = Infinity;
        let melhor = cidadeInicial;
        listaCidades.forEach((cj) => {
          const nome = Object.keys(COORDENADAS_CIDADES).find((c) =>
            cj.includes(c),
          );
          if (nome) {
            const d = calcularDistancia(
              latitude,
              longitude,
              COORDENADAS_CIDADES[nome].lat,
              COORDENADAS_CIDADES[nome].lon,
            );
            if (d < menorDist) {
              menorDist = d;
              melhor = cj;
            }
          }
        });
        setCidadeSelecionada(melhor);
      } catch {
      } finally {
        setCarregandoLocalizacao(false);
      }
    })();
  }, []);

  useEffect(() => {
    Magnetometer.setUpdateInterval(150);
    Accelerometer.setUpdateInterval(150);
    const mag = Magnetometer.addListener(({ x, y }) => {
      let a = Math.atan2(y, x) * (180 / Math.PI);
      if (a < 0) a += 360;
      setAzimute(Math.round(a));
    });
    const acc = Accelerometer.addListener(({ x, y, z }) => {
      setElevacao(
        Math.round(
          Math.abs(Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI)),
        ),
      );
    });
    return () => {
      mag.remove();
      acc.remove();
    };
  }, []);

  useEffect(() => {
    let az = Math.min(360, Math.round(azimute / 10) * 10);
    let el = Math.min(90, Math.round(elevacao / 10) * 10);
    const d = dados[cidadeSelecionada];
    if (d) {
      const r = d.find((i) => i.azimute === az && i.elevacao === el);
      setMedido(r ? r.valor : 0);
    }
  }, [azimute, elevacao, cidadeSelecionada]);

  const pctNum = melhorValor > 0 ? (medido / melhorValor) * 100 : 0;
  const pctStr = pctNum.toFixed(0);

  const cidadeExibida = cidadeSelecionada
    .replace("Global - ", "")
    .replace(".html", "");

  const salvarHistorico = () => {
    Animated.sequence([
      Animated.timing(saveScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(saveScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    const novoItem: HistoricoItem = {
      id: Date.now().toString(),
      nome: `Medição ${historico.length + 1}`,
      azimute,
      elevacao,
      medido,
      percentual: `${pctStr}%`,
    };
    setHistorico((prev) => [novoItem, ...prev]);
  };

  const abrirDetalhe = (item: HistoricoItem) => {
    setItemSelecionado(item);
    setNomeEditando(item.nome);
    setModalDetalheVisivel(true);
  };

  const salvarNome = () => {
    if (!itemSelecionado) return;
    setHistorico((prev) =>
      prev.map((h) =>
        h.id === itemSelecionado.id ? { ...h, nome: nomeEditando } : h,
      ),
    );
    setModalDetalheVisivel(false);
  };

  const excluirMedicao = () => {
    if (!itemSelecionado) return;
    Alert.alert(
      "Excluir medição",
      `Tem certeza que deseja excluir "${itemSelecionado.nome}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            setHistorico((prev) =>
              prev.filter((h) => h.id !== itemSelecionado.id),
            );
            setModalDetalheVisivel(false);
          },
        },
      ],
    );
  };

  const exportarCSV = async () => {
    if (historico.length === 0) {
      Alert.alert(
        "Sem dados",
        "Salve pelo menos uma medição antes de exportar.",
      );
      return;
    }
    const norm = (s: string) =>
      s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const sep = ";";
    const cab = [
      "Nome",
      "Azimute (graus)",
      "Elevacao (graus)",
      "Medido",
      "Eficiencia (%)",
    ].join(sep);
    const lin = historico
      .map((i) =>
        [
          `"${norm(i.nome)}"`,
          i.azimute,
          i.elevacao,
          i.medido.toFixed(2).replace(".", ","),
          i.percentual.replace("%", "").trim(),
        ].join(sep),
      )
      .join("\n");
    const nomeArq = `medicoes_${norm(cidadeExibida).replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 16).replace("T", "_").replace(":", "h")}.csv`;
    try {
      const f = new File(Paths.cache, nomeArq);
      await f.write(cab + "\n" + lin);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(f.uri, {
          mimeType: "text/csv",
          UTI: "public.comma-separated-values-text",
          dialogTitle: "Exportar medicoes",
        });
      } else {
        Alert.alert("Exportado", f.uri);
      }
    } catch {
      Alert.alert("Erro", "Nao foi possivel exportar.");
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.container}>
          {/* ── Topo: cidade ── */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerLabel}>LOCAL</Text>
              {carregandoLocalizacao ? (
                <ActivityIndicator
                  color={C.amber}
                  size="small"
                  style={{ marginTop: 2 }}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => setModalCidadeVisivel(true)}
                  style={s.cityBtn}
                  activeOpacity={0.7}
                >
                  <Text style={s.cityText} numberOfLines={1}>
                    📍 {cidadeExibida}
                  </Text>
                  <Text style={s.cityChevron}>›</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={s.exportIconBtn}
              onPress={exportarCSV}
              activeOpacity={0.7}
            >
              <Text style={s.exportIcon}>↑</Text>
            </TouchableOpacity>
          </View>

          {/* ── Eficiência ── */}
          <ArcProgress pct={pctNum} />

          {/* ── Grid de métricas ── */}
          <View style={s.metricRow}>
            <MetricCard
              label="Medido"
              value={medido > 0 ? medido.toFixed(3) : "—"}
            />
            <View style={{ width: 10 }} />
            <MetricCard
              label="Melhor"
              value={melhorValor > 0 ? melhorValor.toFixed(3) : "—"}
              accent
            />
          </View>
          <View style={[s.metricRow, { marginTop: 10, marginBottom: 18 }]}>
            <MetricCard label="Azimute" value={`${azimute}°`} />
            <View style={{ width: 10 }} />
            <MetricCard label="Elevação" value={`${elevacao}°`} />
          </View>

          {/* ── Cabeçalho da tabela ── */}
          {historico.length > 0 && (
            <View style={s.tableHead}>
              <Text style={[s.thText, { flex: 1.1 }]}>NOME</Text>
              <Text style={[s.thText, { flex: 0.95, textAlign: "center" }]}>
                AZIMUTE
              </Text>
              <Text style={[s.thText, { flex: 0.95, textAlign: "center" }]}>
                ELEVAÇÃO
              </Text>
              <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>
                EFICIÊNCIA
              </Text>
            </View>
          )}

          {/* ── Lista de medições ── */}
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {historico.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyIcon}>◎</Text>
                <Text style={s.emptyText}>Nenhuma medição salva</Text>
                <Text style={s.emptyHint}>
                  Aponte o dispositivo e toque em SALVAR
                </Text>
              </View>
            ) : (
              historico.map((item, idx) => (
                <HistoricoRow
                  key={item.id}
                  item={item}
                  isFirst={idx === 0}
                  onPress={() => abrirDetalhe(item)}
                />
              ))
            )}
          </ScrollView>

          {/* ── Barra de ações ── */}
          <View style={s.actionBar}>
            <TouchableOpacity
              style={s.btnSecondary}
              onPress={() => {
                Alert.alert(
                  "Limpar medições",
                  "Remover todas as medições salvas?",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Limpar",
                      style: "destructive",
                      onPress: () => setHistorico([]),
                    },
                  ],
                );
              }}
              activeOpacity={0.7}
            >
              <Text style={s.btnSecondaryText}>LIMPAR</Text>
            </TouchableOpacity>

            <Animated.View
              style={{
                transform: [{ scale: saveScale }],
                flex: 1,
                marginLeft: 10,
              }}
            >
              <TouchableOpacity
                style={s.btnPrimary}
                onPress={salvarHistorico}
                activeOpacity={0.8}
              >
                <Text style={s.btnPrimaryText}>SALVAR +</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* ── Modal: selecionar cidade ── */}
        <Modal
          visible={modalCidadeVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalCidadeVisivel(false)}
        >
          <View style={m.overlay}>
            <View style={m.sheet}>
              <View style={m.handle} />
              <Text style={m.title}>Selecionar cidade</Text>
              <FlatList
                data={listaCidades}
                keyExtractor={(i) => i}
                renderItem={({ item }) => {
                  const nome = item
                    .replace("Global - ", "")
                    .replace("global-", "")
                    .replace(".html", "");
                  const sel = cidadeSelecionada === item;
                  return (
                    <TouchableOpacity
                      style={[m.item, sel && m.itemSel]}
                      onPress={() => {
                        setCidadeSelecionada(item);
                        setModalCidadeVisivel(false);
                      }}
                      activeOpacity={0.7}
                    >
                      {sel && <Text style={m.itemDot}>● </Text>}
                      <Text style={[m.itemText, sel && m.itemTextSel]}>
                        {nome}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                style={m.closeBtn}
                onPress={() => setModalCidadeVisivel(false)}
                activeOpacity={0.7}
              >
                <Text style={m.closeBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal: detalhe/editar medição ── */}
        <Modal
          visible={modalDetalheVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalDetalheVisivel(false)}
        >
          <View style={m.overlay}>
            <View style={m.sheet}>
              <View style={m.handle} />
              <Text style={m.title}>Detalhe da medição</Text>

              {itemSelecionado && (
                <>
                  <Text style={d.label}>Nome</Text>
                  <TextInput
                    style={d.input}
                    value={nomeEditando}
                    onChangeText={setNomeEditando}
                    placeholderTextColor={C.grey2}
                    placeholder="Nome da medição"
                    autoFocus
                    selectTextOnFocus
                  />

                  <View style={d.grid}>
                    {[
                      { l: "AZIMUTE", v: `${itemSelecionado.azimute}°` },
                      { l: "ELEVAÇÃO", v: `${itemSelecionado.elevacao}°` },
                      { l: "MEDIDO", v: itemSelecionado.medido.toFixed(3) },
                      {
                        l: "EFICIÊNCIA",
                        v: itemSelecionado.percentual,
                        accent: true,
                      },
                    ].map(({ l, v, accent }) => (
                      <View key={l} style={d.card}>
                        <Text style={d.cardLabel}>{l}</Text>
                        <Text
                          style={[d.cardValue, accent && d.cardValueAccent]}
                        >
                          {v}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={d.btnDelete}
                    onPress={excluirMedicao}
                    activeOpacity={0.7}
                  >
                    <Text style={d.btnDeleteText}>Excluir medição</Text>
                  </TouchableOpacity>

                  <View style={d.actions}>
                    <TouchableOpacity
                      style={d.btnCancel}
                      onPress={() => setModalDetalheVisivel(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={d.btnCancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={d.btnSave}
                      onPress={salvarNome}
                      activeOpacity={0.8}
                    >
                      <Text style={d.btnSaveText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ─── Estilos globais ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  headerLeft: { flex: 1 },
  headerLabel: {
    color: C.grey1,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  cityBtn: { flexDirection: "row", alignItems: "center" },
  cityText: { color: C.white, fontSize: 17, fontWeight: "700", flexShrink: 1 },
  cityChevron: {
    color: C.amber,
    fontSize: 22,
    marginLeft: 4,
    fontWeight: "300",
  },
  exportIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.amberDim,
    borderWidth: 1,
    borderColor: C.amberMid,
    alignItems: "center",
    justifyContent: "center",
  },
  exportIcon: { color: C.amber, fontSize: 20, fontWeight: "700" },
  metricRow: { flexDirection: "row" },
  tableHead: { flexDirection: "row", paddingHorizontal: 14, marginBottom: 6 },
  thText: {
    color: C.grey1,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  list: { flex: 1 },
  empty: { alignItems: "center", paddingTop: 40, paddingBottom: 20 },
  emptyIcon: { color: C.grey2, fontSize: 40, marginBottom: 12 },
  emptyText: {
    color: C.grey1,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  emptyHint: { color: C.grey2, fontSize: 13 },
  actionBar: { flexDirection: "row", paddingVertical: 14, paddingBottom: 20 },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: {
    color: C.grey1,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
  btnPrimary: {
    backgroundColor: C.amber,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: {
    color: C.bg,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
  },
});

// Modal sheets
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    color: C.white,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  itemSel: { paddingHorizontal: 4 },
  itemDot: { color: C.amber, fontSize: 10 },
  itemText: { color: C.grey1, fontSize: 16 },
  itemTextSel: { color: C.amber, fontWeight: "700" },
  closeBtn: {
    marginTop: 16,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  closeBtnText: { color: C.grey1, fontSize: 14, fontWeight: "700" },
});

// Modal detalhe
const d = StyleSheet.create({
  label: {
    color: C.grey1,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.amber,
    color: C.white,
    fontSize: 17,
    fontWeight: "600",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  card: {
    width: "47%",
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  cardLabel: {
    color: C.grey1,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardValue: { color: C.white, fontSize: 26, fontWeight: "800" },
  cardValueAccent: { color: C.amber },

  // Botão de Excluir que adicionei
  btnDelete: {
    backgroundColor: C.danger + "15",
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  btnDeleteText: { color: C.danger, fontSize: 14, fontWeight: "700" },

  actions: { flexDirection: "row", gap: 10 },
  btnCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnCancelText: { color: C.grey1, fontSize: 14, fontWeight: "700" },
  btnSave: {
    flex: 1,
    backgroundColor: C.amber,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnSaveText: { color: C.bg, fontSize: 14, fontWeight: "900" },
});
