import { File, Paths } from "expo-file-system/next";
import { Image } from "expo-image";
import * as Location from "expo-location";
import { Accelerometer, Magnetometer } from "expo-sensors";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image as RNImage,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import dadosCidadesJson from "./dados_irradiacao.json";

// ─── Paletas escuro / claro ───────────────────────────────────────────────────
const DARK = {
  bg: "#080C18",
  surface: "#0F1628",
  card: "#141C32",
  border: "#1E2A45",
  amber: "#F59E0B",
  amberDim: "#F59E0B26",
  amberMid: "#F59E0B60",
  yellow: "#EAB308",
  yellowDim: "#EAB30826",
  yellowMid: "#EAB30860",
  blue: "#3B82F6",
  blueDim: "#3B82F620",
  green: "#22C55E",
  greenDim: "#22C55E26",
  greenMid: "#22C55E60",
  white: "#FFFFFF",
  text: "#FFFFFF",
  textSub: "#94A3B8",
  grey2: "#334155",
  danger: "#EF4444",
  dangerDim: "#EF444426",
  dangerMid: "#EF444460",
  isDark: true,
};

const LIGHT = {
  bg: "#F0F4FF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#CBD5E1",
  amber: "#D97706",
  amberDim: "#D9770618",
  amberMid: "#D9770650",
  yellow: "#EAB308",
  yellowDim: "#EAB30818",
  yellowMid: "#EAB30850",
  blue: "#2563EB",
  blueDim: "#2563EB18",
  green: "#16A34A",
  greenDim: "#16A34A18",
  greenMid: "#16A34A50",
  white: "#FFFFFF",
  text: "#0F172A",
  textSub: "#64748B",
  grey2: "#CBD5E1",
  danger: "#DC2626",
  dangerDim: "#DC262618",
  dangerMid: "#DC262650",
  isDark: false,
};

function getEfficiencyColors(pct: number, T: typeof DARK) {
  if (pct >= 70) return { base: T.green, dim: T.greenDim, mid: T.greenMid };
  if (pct >= 40) return { base: T.yellow, dim: T.yellowDim, mid: T.yellowMid };
  return { base: T.danger, dim: T.dangerDim, mid: T.dangerMid };
}

// ─── Coordenadas ──────────────────────────────────────────────────────────────
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

function formatarMilhar(val: number): string {
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
type Tema = typeof DARK;

const dados: DadosCidades = dadosCidadesJson as DadosCidades;
const listaCidades = Object.keys(dados).sort();

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  const fade1 = useRef(new Animated.Value(1)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t1 = setTimeout(() => {
      Animated.sequence([
        Animated.timing(fade1, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(fade2, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    const t2 = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => onDoneRef.current());
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [fade1, fade2, fadeOut]);

  return (
    <Animated.View
      style={[
        splash.container,
        { opacity: fadeOut, backgroundColor: "#FFFFFF" },
      ]}
    >
      <Animated.View
        style={[splash.content, { position: "absolute", opacity: fade1 }]}
      >
        <RNImage
          source={require("../assets/images/TPanel.png")}
          style={{ width: 240, height: 240 }}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View
        style={[splash.content, { position: "absolute", opacity: fade2 }]}
      >
        <RNImage
          source={require("../assets/images/ufs_horizontal_positiva.png")}
          style={{ width: 280, height: 100, marginBottom: 50 }}
          resizeMode="contain"
        />
        <RNImage
          source={require("../assets/images/logoGRILUU.png")}
          style={{ width: 280, height: 280 }}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const splash = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#080C18",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  content: { alignItems: "center", paddingHorizontal: 32 },
  logosRow: { flexDirection: "row", alignItems: "center", marginBottom: 40 },
  logoBox: { alignItems: "center" },
  logoLeft: { marginRight: 16 },
  logoRight: { marginLeft: 16 },
  logoDivider: { width: 1, height: 60, backgroundColor: "#1E2A45" },
  logoPlaceholder: { fontSize: 44, marginBottom: 6 },
  logoName: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  tagline: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 48,
  },
  dotsRow: { flexDirection: "row", gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#1E2A45" },
  dotActive: { backgroundColor: "#F59E0B", width: 20 },
});

// ─── Barra de progresso de eficiência ────────────────────────────────────────
function ArcProgress({ pct, C: T, onInfo }: { pct: number; C: Tema; onInfo?: () => void }) {
  const clamp = Math.min(100, Math.max(0, pct));
  const colors = getEfficiencyColors(clamp, T);

  return (
    <View
      style={[arc.wrap, { backgroundColor: T.card, borderColor: T.border }]}
    >
      <View style={[arc.track, { backgroundColor: T.border }]} />
      <View
        style={[
          arc.fill,
          { width: `${clamp}%` as any, backgroundColor: colors.base },
        ]}
      />
      <View style={arc.center}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
          <Text style={[arc.label, { color: T.textSub, marginBottom: 0 }]}>
            EFICIÊNCIA RELATIVA
          </Text>
          {onInfo && (
            <TouchableOpacity
              onPress={onInfo}
              style={{
                marginLeft: 6,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: T.border,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 0.5,
                borderColor: T.isDark ? "#ffffff20" : "#00000010",
              }}
              activeOpacity={0.6}
            >
              <Image
                source={require("../assets/images/question-svgrepo-com.svg")}
                style={{ width: 10, height: 10 }}
                contentFit="contain"
                tintColor={T.textSub}
              />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[arc.value, { color: colors.base }]}>
          {clamp.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const arc = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  track: { width: "100%", height: 8, borderRadius: 4, marginBottom: 12 },
  fill: { position: "absolute", top: 18, left: 16, height: 8, borderRadius: 4 },
  center: { alignItems: "center", marginTop: 6 },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  value: { fontSize: 60, fontWeight: "900", letterSpacing: -2 },
});

// ─── Card de métrica ──────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  pct,
  C: T,
  onInfo,
}: {
  label: string;
  value: string;
  pct?: number;
  C: Tema;
  onInfo?: () => void;
}) {
  const isAccent = pct !== undefined;
  const colors = isAccent ? getEfficiencyColors(pct, T) : null;

  return (
    <View
      style={[
        mc.card,
        { backgroundColor: T.card, borderColor: T.border },
        isAccent && { borderColor: colors!.mid, backgroundColor: colors!.dim },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        <Text style={[mc.label, { color: T.textSub, marginBottom: 0 }]}>{label}</Text>
        {onInfo && (
          <TouchableOpacity
            onPress={onInfo}
            style={{
              marginLeft: 6,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: T.border,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 0.5,
              borderColor: T.isDark ? "#ffffff20" : "#00000010",
            }}
            activeOpacity={0.6}
          >
            <Image
              source={require("../assets/images/question-svgrepo-com.svg")}
              style={{ width: 10, height: 10 }}
              contentFit="contain"
              tintColor={T.textSub}
            />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[mc.value, { color: isAccent ? colors!.base : T.text }]}>
        {value}
      </Text>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  value: { fontSize: 22, fontWeight: "800" },
});

// ─── Linha do histórico ───────────────────────────────────────────────────────
function HistoricoRow({
  item,
  isFirst,
  onPress,
  C: T,
}: {
  item: HistoricoItem;
  isFirst: boolean;
  onPress: () => void;
  C: Tema;
}) {
  const pct = parseFloat(item.percentual);
  const barColor = pct >= 70 ? T.green : pct >= 40 ? "#EAB308" : T.danger;

  return (
    <TouchableOpacity
      style={[
        hr.row,
        { backgroundColor: T.card, borderColor: T.border },
        isFirst && { borderColor: T.amberMid, backgroundColor: T.amberDim },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={hr.nameCol}>
        <Text
          style={[hr.name, { color: isFirst ? T.text : T.textSub }]}
          numberOfLines={1}
        >
          {item.nome}
        </Text>
        <View style={[hr.miniBar, { backgroundColor: T.border }]}>
          <View
            style={[
              hr.miniBarFill,
              {
                width: `${Math.min(pct, 100)}%` as any,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>
      <Text style={[hr.cell, { color: isFirst ? T.text : T.textSub }]}>
        {item.azimute.toFixed(1)}°
      </Text>
      <Text style={[hr.cell, { color: isFirst ? T.text : T.textSub }]}>
        {item.elevacao.toFixed(1)}°
      </Text>
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
    borderWidth: 1,
  },
  nameCol: { flex: 1.4, marginRight: 8 },
  name: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  miniBar: { height: 3, borderRadius: 2, overflow: "hidden" },
  miniBarFill: { height: 3, borderRadius: 2 },
  cell: { flex: 0.9, fontSize: 13, fontWeight: "600", textAlign: "center" },
  pct: { flex: 0.9, fontSize: 14, fontWeight: "800", textAlign: "right" },
});

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const systemScheme = useColorScheme();
  const [temaManual, setTemaManual] = useState<"dark" | "light" | null>(null);
  const tema = temaManual ?? systemScheme ?? "dark";
  const T = tema === "dark" ? DARK : LIGHT;

  const cidadeInicial =
    listaCidades.find((c) => c.toLowerCase().includes("aracaju")) ||
    listaCidades[0] ||
    "";
  const [cidadeSelecionada, setCidadeSelecionada] = useState(cidadeInicial);
  const [modalCidadeVisivel, setModalCidadeVisivel] = useState(false);
  const [carregandoLocalizacao, setCarregandoLocalizacao] = useState(true);
  const [splashVisivel, setSplashVisivel] = useState(true);

  const [modalOnboardingVisivel, setModalOnboardingVisivel] = useState(false);
  const [modalSobreVisivel, setModalSobreVisivel] = useState(false);
  const [termoTooltip, setTermoTooltip] = useState<{ termo: string; explicacao: string } | null>(null);

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
    return d && d.length > 0 ? Math.max(...d.map((i) => i.valor)) : 0;
  }, [cidadeSelecionada]);

  // Auto-detectar cidade
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setCarregandoLocalizacao(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        let best = cidadeInicial,
          bestDist = Infinity;
        listaCidades.forEach((cj) => {
          const nome = Object.keys(COORDENADAS_CIDADES).find((c) =>
            cj.includes(c),
          );
          if (nome) {
            const dist = calcularDistancia(
              latitude,
              longitude,
              COORDENADAS_CIDADES[nome].lat,
              COORDENADAS_CIDADES[nome].lon,
            );
            if (dist < bestDist) {
              bestDist = dist;
              best = cj;
            }
          }
        });
        setCidadeSelecionada(best);
      } catch {
        /* fallback */
      } finally {
        setCarregandoLocalizacao(false);
      }
    })();
  }, [cidadeInicial]);

  // Sensores
  useEffect(() => {
    Magnetometer.setUpdateInterval(150);
    Accelerometer.setUpdateInterval(150);
    const mag = Magnetometer.addListener(({ x, y }) => {
      let a = Math.atan2(y, x) * (180 / Math.PI);
      if (a < 0) a += 360;
      setAzimute(a);
    });
    const acc = Accelerometer.addListener(({ x, y, z }) => {
      setElevacao(
        Math.abs(Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI)),
      );
    });
    return () => {
      mag.remove();
      acc.remove();
    };
  }, []);

  // Lookup
  useEffect(() => {
    const az = Math.min(360, Math.round(azimute / 10) * 10);
    const el = Math.min(90, Math.round(elevacao / 10) * 10);
    const d = dados[cidadeSelecionada];
    if (d) {
      const r = d.find((i) => i.azimute === az && i.elevacao === el);
      setMedido(r ? r.valor : 0);
    }
  }, [azimute, elevacao, cidadeSelecionada]);

  const pctNum = melhorValor > 0 ? (medido / melhorValor) * 100 : 0;
  const pctStr = `${pctNum.toFixed(1)}%`;
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
    setHistorico((prev) => [
      {
        id: Date.now().toString(),
        nome: `Medição ${prev.length + 1}`,
        azimute,
        elevacao,
        medido,
        percentual: pctStr,
      },
      ...prev,
    ]);
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
      "Previsto (lx)",
      "Eficiencia Relativa (%)",
    ].join(sep);
    const lin = historico
      .map((i) =>
        [
          `"${norm(i.nome)}"`,
          i.azimute.toFixed(1),
          i.elevacao.toFixed(1),
          i.medido > 0 ? Math.round(i.medido).toString() : "0",
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
      <StatusBar
        barStyle={T.isDark ? "light-content" : "dark-content"}
        backgroundColor={T.bg}
      />

      {/* ── Splash ── */}
      {splashVisivel && <SplashScreen onDone={() => setSplashVisivel(false)} />}

      <SafeAreaView
        style={[s.safe, { backgroundColor: T.bg }]}
        edges={["top", "bottom"]}
      >
        <View style={s.container}>
          {/* ── Header ── */}
          <View style={s.header}>
            {/* Logo placeholder esquerda */}
            <TouchableOpacity
              style={[
                s.logoSmall,
                { backgroundColor: T.card, borderColor: T.border },
              ]}
              onPress={() => setModalSobreVisivel(true)}
              activeOpacity={0.7}
            >
              <Image
                source={require("../assets/images/griloVetorizado.svg")}
                style={{ width: 24, height: 24 }}
                contentFit="contain"
                tintColor={
                  pctNum >= 70 ? T.green : pctNum >= 40 ? "#EAB308" : T.danger
                }
              />
            </TouchableOpacity>

            {/* Cidade */}
            <View style={s.headerCenter}>
              <Text style={[s.headerLabel, { color: T.textSub }]}>LOCAL</Text>
              {carregandoLocalizacao ? (
                <ActivityIndicator color={T.amber} size="small" />
              ) : (
                <TouchableOpacity
                  onPress={() => setModalCidadeVisivel(true)}
                  style={s.cityBtn}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Image
                      source={require("../assets/images/location-pin-alt-1-svgrepo-com.svg")}
                      style={{ width: 16, height: 16, marginRight: 4 }}
                      contentFit="contain"
                      tintColor={T.text}
                    />
                    <Text
                      style={[s.cityText, { color: T.text }]}
                      numberOfLines={1}
                    >
                      {cidadeExibida}
                    </Text>
                  </View>
                  <Text style={[s.cityChevron, { color: T.amber }]}>›</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Botões direita: tema + exportar + onboarding */}
            <View style={s.headerActions}>
              {/* Onboarding */}
              <TouchableOpacity
                style={[
                  s.iconBtn,
                  { backgroundColor: T.card, borderColor: T.border },
                ]}
                onPress={() => setModalOnboardingVisivel(true)}
                activeOpacity={0.7}
              >
                <Image
                  source={require("../assets/images/book-open-svgrepo-com.svg")}
                  style={{ width: 18, height: 18 }}
                  contentFit="contain"
                  tintColor={T.text}
                />
              </TouchableOpacity>

              {/* Toggle tema */}
              <TouchableOpacity
                style={[
                  s.iconBtn,
                  { backgroundColor: T.card, borderColor: T.border },
                ]}
                onPress={() =>
                  setTemaManual(tema === "dark" ? "light" : "dark")
                }
                activeOpacity={0.7}
              >
                {tema === "dark" ? (
                  <Image
                    source={require("../assets/images/sun-svgrepo-com.svg")}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                    tintColor={T.text}
                  />
                ) : (
                  <Image
                    source={require("../assets/images/moon-svgrepo-com.svg")}
                    style={{ width: 20, height: 20 }}
                    contentFit="contain"
                    tintColor={T.text}
                  />
                )}
              </TouchableOpacity>

              {/* Exportar */}
              <TouchableOpacity
                style={[
                  s.iconBtn,
                  { backgroundColor: T.amberDim, borderColor: T.amberMid },
                ]}
                onPress={exportarCSV}
                activeOpacity={0.7}
              >
                <Image
                  source={require("../assets/images/arrow-up-right-from-square-svgrepo-com.svg")}
                  style={{ width: 18, height: 18 }}
                  contentFit="contain"
                  tintColor={T.amber}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Eficiência relativa ── */}
          <ArcProgress pct={pctNum} C={T} onInfo={() => setTermoTooltip({ termo: "Eficiência Relativa", explicacao: "Relação entre a incidência luminosa na posição atual e a máxima para a localidade"})} />

          {/* ── Métricas ── */}
          <View style={s.metricRow}>
            <MetricCard
              label="Previsto (lx)"
              value={medido > 0 ? formatarMilhar(medido) : "—"}
              C={T}
              onInfo={() => setTermoTooltip({ termo: "Previsto (lx)", explicacao: "Iluminância estimada para a superfície para a posição atual, calculada como média da iluminância incidente no plano inclinado, em lx."})}
            />
            <View style={{ width: 10 }} />
            <MetricCard
              label="Máximo (lx)"
              value={melhorValor > 0 ? formatarMilhar(melhorValor) : "—"}
              pct={100}
              C={T}
              onInfo={() => setTermoTooltip({ termo: "Máximo (lx)", explicacao: "Iluminância média anual máxima para a cidade estudada, em lx."})}
            />
          </View>
          <View style={[s.metricRow, { marginTop: 10, marginBottom: 16 }]}>
            <MetricCard
              label="Azimute"
              value={`${azimute.toFixed(1)}°`}
              C={T}
              onInfo={() => setTermoTooltip({ termo: "Azimute", explicacao: "Ângulo horizontal do painel, medido a partir do norte, no sentido horário"})}
            />
            <View style={{ width: 10 }} />
            <MetricCard
              label="Elevação"
              value={`${elevacao.toFixed(1)}°`}
              C={T}
              onInfo={() => setTermoTooltip({ termo: "Elevação", explicacao: "Ângulo vertical medido a partir do horizonte em direção ao céu."})}
            />
          </View>

          {/* ── Cabeçalho tabela ── */}
          {historico.length > 0 && (
            <View style={s.tableHead}>
              <Text style={[s.thText, { color: T.textSub, flex: 1.4 }]}>
                NOME
              </Text>
              <Text
                style={[
                  s.thText,
                  { color: T.textSub, flex: 0.9, textAlign: "center" },
                ]}
              >
                AZIMUTE
              </Text>
              <Text
                style={[
                  s.thText,
                  { color: T.textSub, flex: 0.9, textAlign: "center" },
                ]}
              >
                ELEVAÇÃO
              </Text>
              <Text
                style={[
                  s.thText,
                  { color: T.textSub, flex: 0.9, textAlign: "right" },
                ]}
              >
                EFICIÊNCIA
              </Text>
            </View>
          )}

          {/* ── Lista ── */}
          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {historico.length === 0 ? (
              <View style={s.empty}>
                <Text style={[s.emptyIcon, { color: T.grey2 }]}>◎</Text>
                <Text style={[s.emptyText, { color: T.textSub }]}>
                  Nenhuma medição salva
                </Text>
                <Text style={[s.emptyHint, { color: T.grey2 }]}>
                  Coloque o dispositivo sobre a superfície e toque em SALVAR
                </Text>
              </View>
            ) : (
              historico.map((item, idx) => (
                <HistoricoRow
                  key={item.id}
                  item={item}
                  isFirst={idx === 0}
                  onPress={() => abrirDetalhe(item)}
                  C={T}
                />
              ))
            )}
          </ScrollView>

          {/* ── Ações ── */}
          <View style={s.actionBar}>
            <TouchableOpacity
              style={[s.btnSecondary, { borderColor: T.border }]}
              onPress={() =>
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
                )
              }
              activeOpacity={0.7}
            >
              <Text style={[s.btnSecondaryText, { color: T.textSub }]}>
                LIMPAR
              </Text>
            </TouchableOpacity>

            <Animated.View
              style={{
                transform: [{ scale: saveScale }],
                flex: 1,
                marginLeft: 10,
              }}
            >
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor: T.amber }]}
                onPress={salvarHistorico}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.btnPrimaryText,
                    { color: T.isDark ? "#080C18" : "#FFFFFF" },
                  ]}
                >
                  SALVAR +
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>

        {/* ── Modal cidade ── */}
        <Modal
          visible={modalCidadeVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalCidadeVisivel(false)}
        >
          <View style={m.overlay}>
            <View style={[m.sheet, { backgroundColor: T.surface }]}>
              <View style={[m.handle, { backgroundColor: T.border }]} />
              <Text style={[m.title, { color: T.text }]}>
                Selecionar cidade
              </Text>
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
                      style={[
                        m.item,
                        { borderBottomColor: T.border },
                        sel && { paddingHorizontal: 4 },
                      ]}
                      onPress={() => {
                        setCidadeSelecionada(item);
                        setModalCidadeVisivel(false);
                      }}
                      activeOpacity={0.7}
                    >
                      {sel && (
                        <Text style={[m.itemDot, { color: T.amber }]}>● </Text>
                      )}
                      <Text
                        style={[
                          m.itemText,
                          { color: sel ? T.amber : T.textSub },
                          sel && { fontWeight: "700" },
                        ]}
                      >
                        {nome}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
              <TouchableOpacity
                style={[
                  m.closeBtn,
                  { backgroundColor: T.card, borderColor: T.border },
                ]}
                onPress={() => setModalCidadeVisivel(false)}
                activeOpacity={0.7}
              >
                <Text style={[m.closeBtnText, { color: T.textSub }]}>
                  Fechar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal detalhe ── */}
        <Modal
          visible={modalDetalheVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalDetalheVisivel(false)}
        >
          <View style={m.overlay}>
            <View style={[m.sheet, { backgroundColor: T.surface }]}>
              <View style={[m.handle, { backgroundColor: T.border }]} />
              <Text style={[m.title, { color: T.text }]}>
                Detalhe da medição
              </Text>

              {itemSelecionado && (
                <>
                  <Text style={[d.label, { color: T.textSub }]}>Nome</Text>
                  <TextInput
                    style={[
                      d.input,
                      {
                        backgroundColor: T.card,
                        borderColor: T.amber,
                        color: T.text,
                      },
                    ]}
                    value={nomeEditando}
                    onChangeText={setNomeEditando}
                    placeholderTextColor={T.grey2}
                    placeholder="Nome da medição"
                    autoFocus
                    selectTextOnFocus
                  />

                  <View style={d.grid}>
                    {[
                      {
                        l: "AZIMUTE",
                        v: `${itemSelecionado.azimute.toFixed(1)}°`,
                        onInfo: () => setTermoTooltip({ termo: "Azimute", explicacao: "Ângulo horizontal do painel, medido a partir do norte, no sentido horário"})
                      },
                      {
                        l: "ELEVAÇÃO",
                        v: `${itemSelecionado.elevacao.toFixed(1)}°`,
                        onInfo: () => setTermoTooltip({ termo: "Elevação", explicacao: "Ângulo vertical medido a partir do horizonte em direção ao céu."})
                      },
                      {
                        l: "PREVISTO (lx)",
                        v:
                          itemSelecionado.medido > 0
                            ? formatarMilhar(itemSelecionado.medido)
                            : "—",
                        onInfo: () => setTermoTooltip({ termo: "Previsto (lx)", explicacao: "Iluminância estimada para a superfície para a posição atual, calculada como média da iluminância incidente no plano inclinado, em lx."})
                      },
                      {
                        l: "MÁXIMO (lx)",
                        v:
                          melhorValor > 0
                            ? formatarMilhar(melhorValor)
                            : "—",
                        onInfo: () => setTermoTooltip({ termo: "Máximo (lx)", explicacao: "Iluminância média anual máxima para a cidade estudada, em lx."})
                      },
                      {
                        l: "EFICIÊNCIA RELATIVA",
                        v: itemSelecionado.percentual,
                        pct: parseFloat(itemSelecionado.percentual),
                        onInfo: () => setTermoTooltip({ termo: "Eficiência Relativa", explicacao: "Relação entre a incidência luminosa na posição atual e a máxima para a localidade"})
                      },
                    ].map(({ l, v, pct, onInfo }) => {
                      const isAccent = pct !== undefined;
                      const colors = isAccent
                        ? getEfficiencyColors(pct, T)
                        : null;

                      return (
                        <View
                          key={l}
                          style={[
                            d.card,
                            { backgroundColor: T.card, borderColor: T.border },
                            isAccent && d.cardWide,
                            isAccent && {
                              borderColor: colors!.mid,
                              backgroundColor: colors!.dim,
                            },
                          ]}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                            <Text style={[d.cardLabel, { color: T.textSub, marginBottom: 0 }]}>
                              {l}
                            </Text>
                            {onInfo && (
                              <TouchableOpacity
                                onPress={onInfo}
                                style={{
                                  marginLeft: 6,
                                  width: 18,
                                  height: 18,
                                  borderRadius: 9,
                                  backgroundColor: T.border,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  borderWidth: 0.5,
                                  borderColor: T.isDark ? "#ffffff20" : "#00000010",
                                }}
                                activeOpacity={0.6}
                              >
                                <Image
                                  source={require("../assets/images/question-svgrepo-com.svg")}
                                  style={{ width: 10, height: 10 }}
                                  contentFit="contain"
                                  tintColor={T.textSub}
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text
                            style={[
                              d.cardValue,
                              { color: isAccent ? colors!.base : T.text },
                              isAccent && d.cardValueLarge,
                            ]}
                          >
                            {v}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={d.actions}>
                    <TouchableOpacity
                      style={d.btnDelete}
                      onPress={() =>
                        Alert.alert(
                          "Excluir medição",
                          `Excluir "${itemSelecionado.nome}"?`,
                          [
                            { text: "Cancelar", style: "cancel" },
                            {
                              text: "Excluir",
                              style: "destructive",
                              onPress: () => {
                                setHistorico((prev) =>
                                  prev.filter(
                                    (h) => h.id !== itemSelecionado.id,
                                  ),
                                );
                                setModalDetalheVisivel(false);
                              },
                            },
                          ],
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <Image
                        source={require("../assets/images/trash-xmark-alt-svgrepo-com.svg")}
                        style={{ width: 22, height: 22 }}
                        contentFit="contain"
                        tintColor="#EF4444"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[d.btnCancel, { borderColor: T.border }]}
                      onPress={() => setModalDetalheVisivel(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={[d.btnCancelText, { color: T.textSub }]}>
                        Cancelar
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[d.btnSave, { backgroundColor: T.amber }]}
                      onPress={salvarNome}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          d.btnSaveText,
                          { color: T.isDark ? "#080C18" : "#FFFFFF" },
                        ]}
                      >
                        Salvar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* ── Modal Tooltip ── */}
        <Modal
          visible={!!termoTooltip}
          animationType="fade"
          transparent
          onRequestClose={() => setTermoTooltip(null)}
        >
          <View style={m.overlayCentered}>
            <View style={[m.sheet, { backgroundColor: T.surface, width: '80%', paddingBottom: 24 }]}>
              <Text style={[m.title, { color: T.text, marginBottom: 8 }]}>
                {termoTooltip?.termo}
              </Text>
              <Text style={{ color: T.textSub, fontSize: 15, lineHeight: 22, marginBottom: 20 }}>
                {termoTooltip?.explicacao}
              </Text>
              <TouchableOpacity
                style={[
                  m.closeBtn,
                  { backgroundColor: T.amber, borderColor: T.amber, marginTop: 0 },
                ]}
                onPress={() => setTermoTooltip(null)}
                activeOpacity={0.8}
              >
                <Text style={[m.closeBtnText, { color: T.isDark ? "#080C18" : "#FFFFFF" }]}>
                  Entendi
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Modal Sobre ── */}
        <Modal
          visible={modalSobreVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalSobreVisivel(false)}
        >
          <View style={m.overlay}>
            <View style={[m.sheet, { backgroundColor: T.surface, maxHeight: '90%' }]}>
              <View style={[m.handle, { backgroundColor: T.border }]} />
              <ScrollView showsVerticalScrollIndicator={false}>
                <RNImage
                  source={require("../assets/images/logoGRILUU.png")}
                  style={{ width: '100%', height: 120, marginBottom: 20 }}
                  resizeMode="contain"
                />
                <Text style={[m.title, { color: T.text, textAlign: 'center' }]}>Sobre o Projeto</Text>
                <Text style={{ color: T.textSub, fontSize: 15, lineHeight: 22, marginBottom: 20, textAlign: 'center' }}>
                  Esse aplicativo foi desenvolvido pela equipe do Grupo de Pesquisa em Iluminação e Eficiência Energética – GriluEE. Seu objetivo é facilitar a escolha do posicionamento de painéis solares, para geração de energia solar fotovoltaica.
                </Text>

                <TouchableOpacity
                  style={[s.btnPrimary, { backgroundColor: T.card, borderColor: T.border, borderWidth: 1, marginBottom: 16 }]}
                  onPress={() => {
                    setModalSobreVisivel(false);
                    setTimeout(() => setModalOnboardingVisivel(true), 300);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.btnPrimaryText, { color: T.text }]}>Ver Tutorial</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[m.closeBtn, { backgroundColor: T.card, borderColor: T.border, marginTop: 0 }]}
                  onPress={() => setModalSobreVisivel(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[m.closeBtnText, { color: T.textSub }]}>Fechar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ── Modal Onboarding ── */}
        <Modal
          visible={modalOnboardingVisivel}
          animationType="slide"
          transparent
          onRequestClose={() => setModalOnboardingVisivel(false)}
        >
          <View style={m.overlay}>
            <View style={[m.sheet, { backgroundColor: T.surface, maxHeight: '90%' }]}>
              <View style={[m.handle, { backgroundColor: T.border }]} />
              <Text style={[m.title, { color: T.text }]}>Como utilizar a aplicação</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: T.textSub, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: T.text }}>1. Selecione o Local:</Text> O aplicativo tenta detectar sua localização automaticamente. Se não conseguir, toque em &quot;LOCAL&quot; e escolha sua cidade na lista para obter os dados de radiação solar corretos.
                </Text>
                <Text style={{ color: T.textSub, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: T.text }}>2. Aponte o dispositivo:</Text> Posicione o celular sobre o painel solar ou no local onde deseja instalá-lo. O aplicativo medirá o <Text style={{ fontWeight: 'bold', color: T.text }}>Azimute</Text> (direção) e a <Text style={{ fontWeight: 'bold', color: T.text }}>Elevação</Text> (inclinação) em tempo real.
                </Text>
                <Text style={{ color: T.textSub, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: T.text }}>3. Verifique a Eficiência:</Text> A barra de &quot;Eficiência Relativa&quot; indica o quão boa é a posição atual comparada à posição ideal para a sua cidade. Tente ajustar o celular até obter a maior porcentagem possível (cor verde).
                </Text>
                <Text style={{ color: T.textSub, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: T.text }}>4. Salve e Exporte:</Text> Toque no botão &quot;SALVAR +&quot; para registrar as medições. Você pode salvar várias posições para comparar. Depois, use o botão de exportar (no canto superior direito) para compartilhar ou salvar os dados em formato CSV.
                </Text>
                <TouchableOpacity
                  style={[m.closeBtn, { backgroundColor: T.amber, borderColor: T.amber }]}
                  onPress={() => setModalOnboardingVisivel(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[m.closeBtnText, { color: T.isDark ? "#080C18" : "#FFFFFF" }]}>Começar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  logoSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoEmoji: { fontSize: 20 },
  headerCenter: { flex: 1 },
  headerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  cityBtn: { flexDirection: "row", alignItems: "center" },
  cityText: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  cityChevron: { fontSize: 22, marginLeft: 4, fontWeight: "300" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnShare: { width: 52, flexDirection: "column" },
  shareArrow: { fontSize: 15, fontWeight: "900", lineHeight: 16 },
  shareLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
    lineHeight: 11,
  },
  metricRow: { flexDirection: "row" },
  tableHead: { flexDirection: "row", paddingHorizontal: 14, marginBottom: 6 },
  thText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  list: { flex: 1 },
  empty: { alignItems: "center", paddingTop: 36, paddingBottom: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  emptyHint: { fontSize: 13 },
  actionBar: { flexDirection: "row", paddingVertical: 12, paddingBottom: 8 },
  btnSecondary: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondaryText: { fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  btnPrimary: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "900", letterSpacing: 1 },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  overlayCentered: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: "75%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
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
  },
  itemDot: { fontSize: 10 },
  itemText: { fontSize: 16 },
  closeBtn: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  closeBtnText: { fontSize: 14, fontWeight: "700" },
});

const d = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    fontSize: 17,
    fontWeight: "600",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  card: { width: "47%", borderRadius: 12, borderWidth: 1, padding: 14 },
  cardWide: { width: "100%" },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardValue: { fontSize: 26, fontWeight: "800" },
  cardValueLarge: { fontSize: 36 },
  actions: { flexDirection: "row", gap: 10, alignItems: "center" },
  btnDelete: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EF444420",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  btnDeleteText: { fontSize: 18 },
  btnCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnCancelText: { fontSize: 14, fontWeight: "700" },
  btnSave: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnSaveText: { fontSize: 14, fontWeight: "900" },
});
