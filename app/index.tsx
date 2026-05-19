import * as Location from "expo-location";
import { Accelerometer, Magnetometer } from "expo-sensors";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Importa os dados das cidades no novo formato
import dadosCidadesJson from "./dados_irradiacao.json";

// --- MAPEAMENTO DE COORDENADAS PARA BUSCA POR PROXIMIDADE ---
// As chaves devem bater parcialmente com as do seu JSON.
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

// Fórmula de Haversine para calcular distância (em km) entre duas coordenadas
function calcularDistancia(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Tipagem
type ItemIrradiacao = {
  azimute: number;
  elevacao: number;
  valor: number;
};

type DadosCidades = Record<string, ItemIrradiacao[]>;
const dados: DadosCidades = dadosCidadesJson as DadosCidades;
const listaCidades = Object.keys(dados).sort();

type HistoricoItem = {
  azimute: number;
  elevacao: number;
  medido: number;
  percentual: string;
};

export default function App() {
  const cidadeInicial =
    listaCidades.find((c) => c.toLowerCase().includes("aracaju")) ||
    listaCidades[0] ||
    "";

  const [cidadeSelecionada, setCidadeSelecionada] =
    useState<string>(cidadeInicial);
  const [modalVisivel, setModalVisivel] = useState<boolean>(false);
  const [buscandoGps, setBuscandoGps] = useState<boolean>(false);

  const [azimute, setAzimute] = useState<number>(0);
  const [elevacao, setElevacao] = useState<number>(0);
  const [medido, setMedido] = useState<number>(0);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  const melhorValor = useMemo(() => {
    const dadosCidade = dados[cidadeSelecionada];
    if (!dadosCidade || dadosCidade.length === 0) return 0;
    return Math.max(...dadosCidade.map((item) => item.valor));
  }, [cidadeSelecionada]);

  useEffect(() => {
    Magnetometer.setUpdateInterval(150);
    Accelerometer.setUpdateInterval(150);

    const inscricaoMagnetometro = Magnetometer.addListener((data) => {
      const { x, y } = data;
      let angulo = Math.atan2(y, x) * (180 / Math.PI);
      if (angulo < 0) angulo += 360;
      setAzimute(Math.round(angulo));
    });

    const inscricaoAcelerometro = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const inclinacao =
        Math.atan2(y, Math.sqrt(x * x + z * z)) * (180 / Math.PI);
      setElevacao(Math.round(Math.abs(inclinacao)));
    });

    return () => {
      inscricaoMagnetometro.remove();
      inscricaoAcelerometro.remove();
    };
  }, []);

  useEffect(() => {
    let azimuteArredondado = Math.round(azimute / 10) * 10;
    let elevacaoArredondada = Math.round(elevacao / 10) * 10;

    if (elevacaoArredondada > 90) elevacaoArredondada = 90;
    if (azimuteArredondado > 360) azimuteArredondado = 360;

    const dadosCidade = dados[cidadeSelecionada];

    if (dadosCidade) {
      const registroEncontrado = dadosCidade.find(
        (item) =>
          item.azimute === azimuteArredondado &&
          item.elevacao === elevacaoArredondada,
      );

      if (registroEncontrado) {
        setMedido(registroEncontrado.valor);
      } else {
        setMedido(0);
      }
    }
  }, [azimute, elevacao, cidadeSelecionada]);

  const percentualNum = melhorValor > 0 ? (medido / melhorValor) * 100 : 0;
  const percentualStr = percentualNum.toFixed(0);

  const salvarHistorico = () => {
    const novoItem: HistoricoItem = {
      azimute,
      elevacao,
      medido,
      percentual: `${percentualStr}%`,
    };
    setHistorico([novoItem, ...historico]);
  };

  const limparHistorico = () => {
    setHistorico([]);
  };

  const buscarLocalizacaoGps = async () => {
    setBuscandoGps(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permissão para acessar a localização foi negada.");
        setBuscandoGps(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      let geocode = await Location.reverseGeocodeAsync(location.coords);

      let cidadeDetectada = "";
      if (geocode.length > 0) {
        cidadeDetectada = geocode[0].city || geocode[0].subregion || "";
      }

      const normalizar = (str: string) =>
        str
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();

      // 1. TENTA ENCONTRAR A CIDADE EXATA PELO NOME
      const cidadeNormalizada = normalizar(cidadeDetectada);
      let chaveEncontrada = listaCidades.find((cidade) =>
        normalizar(cidade).includes(cidadeNormalizada),
      );

      // 2. SE NÃO ENCONTRAR O NOME, BUSCA A MAIS PRÓXIMA POR COORDENADAS
      if (!chaveEncontrada) {
        let menorDistancia = Infinity;
        let cidadeMaisProxima = "";

        const { latitude, longitude } = location.coords;

        // Itera sobre as cidades listadas no JSON
        listaCidades.forEach((cidadeJson) => {
          // Extrai o nome da cidade removendo prefixos como "Global - " ou ".html"
          const nomePuro = Object.keys(COORDENADAS_CIDADES).find((c) =>
            cidadeJson.includes(c),
          );

          if (nomePuro) {
            const coordsDB = COORDENADAS_CIDADES[nomePuro];
            const distancia = calcularDistancia(
              latitude,
              longitude,
              coordsDB.lat,
              coordsDB.lon,
            );

            if (distancia < menorDistancia) {
              menorDistancia = distancia;
              cidadeMaisProxima = cidadeJson;
            }
          }
        });

        if (cidadeMaisProxima) {
          chaveEncontrada = cidadeMaisProxima;

          // Alerta avisando que usou o Fallback
          alert(
            `A cidade detectada (${cidadeDetectada || "Desconhecida"}) não consta na base.\nSelecionando a mais próxima: ${cidadeMaisProxima.replace("Global - ", "").replace(".html", "")} (~${Math.round(menorDistancia)}km de distância)`,
          );
        }
      }

      if (chaveEncontrada) {
        setCidadeSelecionada(chaveEncontrada);
      } else {
        alert("Não foi possível determinar sua cidade nem uma cidade próxima.");
      }
    } catch (error) {
      alert(
        "Ocorreu um erro ao buscar a localização e/ou calcular a distância.",
      );
    }
    setBuscandoGps(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.locationHeader}>
        <TouchableOpacity
          style={styles.citySelectorBtn}
          onPress={() => setModalVisivel(true)}
        >
          <Text style={styles.citySelectorText} numberOfLines={1}>
            📍 {cidadeSelecionada.replace("Global - ", "").replace(".html", "")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gpsBtn}
          onPress={buscarLocalizacaoGps}
          disabled={buscandoGps}
        >
          {buscandoGps ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.gpsBtnText}>GPS</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.topBox}>
        <Text style={styles.topBoxText}>{percentualStr}%</Text>
      </View>

      <View style={styles.gridContainer}>
        <View style={styles.gridRow}>
          <View style={styles.gridBox}>
            <Text style={styles.boxLabel}>MEDIDO</Text>
            <Text style={styles.boxValue}>
              {medido > 0 ? medido.toFixed(3) : "--"}
            </Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.boxLabel}>MELHOR</Text>
            <Text style={styles.boxValue}>
              {melhorValor > 0 ? melhorValor.toFixed(3) : "--"}
            </Text>
          </View>
        </View>
        <View style={styles.gridRow}>
          <View style={styles.gridBox}>
            <Text style={styles.boxLabel}>AZIMUTE</Text>
            <Text style={styles.boxValue}>{azimute}°</Text>
          </View>
          <View style={styles.gridBox}>
            <Text style={styles.boxLabel}>ELEVAÇÃO</Text>
            <Text style={styles.boxValue}>{elevacao}°</Text>
          </View>
        </View>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>AZI...</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>ELE...</Text>
        <Text
          style={[styles.tableHeaderText, { flex: 2, textAlign: "center" }]}
        >
          MEDIDO
        </Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}></Text>
      </View>

      <ScrollView style={styles.tableContainer}>
        {historico.map((item, index) => {
          const rowColor = index === 0 ? "#3b82f6" : "#ffffff";
          return (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableRowText, { color: rowColor, flex: 1 }]}>
                {item.azimute}°
              </Text>
              <Text style={[styles.tableRowText, { color: rowColor, flex: 1 }]}>
                {item.elevacao}°
              </Text>
              <Text
                style={[
                  styles.tableRowText,
                  { color: rowColor, flex: 2, textAlign: "center" },
                ]}
              >
                {item.medido.toFixed(3)}
              </Text>
              <Text
                style={[
                  styles.tableRowText,
                  { color: rowColor, flex: 1, textAlign: "right" },
                ]}
              >
                {item.percentual}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={limparHistorico}>
          <Text style={styles.buttonText}>RESTAURAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={salvarHistorico}>
          <Text style={styles.buttonText}>SALVAR</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisivel}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} />
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Text style={styles.modalCloseText}>FECHAR ✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={listaCidades}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    cidadeSelecionada === item && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setCidadeSelecionada(item);
                    setModalVisivel(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      cidadeSelecionada === item &&
                        styles.modalItemTextSelected,
                    ]}
                  >
                    {item
                      .replace("Global - ", "")
                      .replace("global-", "")
                      .replace(".html", "")}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    padding: 20,
    paddingTop: 50,
  },
  locationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  citySelectorBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
  },
  citySelectorText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  gpsBtn: {
    backgroundColor: "#ffffff",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  gpsBtnText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  topBox: {
    borderWidth: 2,
    borderColor: "#ffffff",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderRadius: 2,
  },
  topBoxText: {
    color: "#ffffff",
    fontSize: 72,
    fontWeight: "bold",
  },
  gridContainer: {
    marginBottom: 20,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  gridBox: {
    width: "48%",
    borderWidth: 2,
    borderColor: "#ffffff",
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 2,
  },
  boxLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  boxValue: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  tableContainer: {
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  tableRowText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
  },
  button: {
    borderWidth: 2,
    borderColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modalCloseText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  modalItemSelected: {
    backgroundColor: "#333333",
    borderRadius: 8,
  },
  modalItemText: {
    color: "#ffffff",
    fontSize: 18,
    textAlign: "center",
    textTransform: "capitalize",
  },
  modalItemTextSelected: {
    color: "#3b82f6",
    fontWeight: "bold",
  },
});
