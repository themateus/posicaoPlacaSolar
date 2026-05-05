import { Accelerometer, Magnetometer } from "expo-sensors";
import React, { useEffect, useState, useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";

// Importa os dados que você salvou no arquivo JSON
import dadosTroplux from "./dados.json";

// Define o formato do seu JSON para o TypeScript reconhecer as chaves dinâmicas
type TropluxData = Record<string, Record<string, number>>;
const dados: TropluxData = dadosTroplux as TropluxData;

type HistoricoItem = {
  azimute: number;
  elevacao: number;
  medido: number;
  percentual: string;
};

export default function App() {
  // Tipagem dos estados
  const [azimute, setAzimute] = useState<number>(0);
  const [elevacao, setElevacao] = useState<number>(0);
  
  // Estados para os valores da tela
  const [medido, setMedido] = useState<number>(0);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);

  // Calcula o melhor valor (máximo) disponível no JSON apenas uma vez na inicialização
  const melhorValor = useMemo(() => {
    let max = 0;
    for (const az in dados) {
      for (const el in dados[az]) {
        if (dados[az][el] > max) {
          max = dados[az][el];
        }
      }
    }
    return max;
  }, []);

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

  // Monitora as mudanças nos sensores e busca no JSON
  useEffect(() => {
    // Arredonda para combinar com a tabela de 10 em 10
    let azimuteArredondado = Math.round(azimute / 10) * 10;
    let elevacaoArredondada = Math.round(elevacao / 10) * 10;

    // Garante que a elevação não ultrapasse 90 e azimute limite em 360
    if (elevacaoArredondada > 90) elevacaoArredondada = 90;
    if (azimuteArredondado > 360) azimuteArredondado = 360;

    // Converte os números para string para usá-los como chave de busca no JSON
    const chaveAzimute = azimuteArredondado.toString();
    const chaveElevacao = elevacaoArredondada.toString();

    // Busca o valor no JSON tipado
    const valorEncontrado = dados[chaveAzimute]?.[chaveElevacao];

    if (valorEncontrado !== undefined) {
      setMedido(valorEncontrado);
    } else {
      setMedido(0);
    }
  }, [azimute, elevacao]);

  // Calcula o percentual
  const percentualNum = melhorValor > 0 ? (medido / melhorValor) * 100 : 0;
  const percentualStr = percentualNum.toFixed(0);

  // Função para salvar no histórico
  const salvarHistorico = () => {
    const novoItem: HistoricoItem = {
      azimute,
      elevacao,
      medido,
      percentual: `${percentualStr}%`,
    };
    // Adiciona no início da lista
    setHistorico([novoItem, ...historico]);
  };

  // Função para restaurar/limpar histórico
  const limparHistorico = () => {
    setHistorico([]);
  };

  return (
    <View style={styles.container}>
      {/* Top Banner: Percentage */}
      <View style={styles.topBox}>
        <Text style={styles.topBoxText}>{percentualStr}%</Text>
      </View>

      {/* Grid: Medido, Melhor, Azimute, Vertical */}
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
            <Text style={styles.boxLabel}>VERTICAL</Text>
            <Text style={styles.boxValue}>{elevacao}°</Text>
          </View>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>AZI...</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>VER...</Text>
        <Text style={[styles.tableHeaderText, { flex: 2, textAlign: "center" }]}>MEDIDO</Text>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}></Text>
      </View>

      {/* Table Rows */}
      <ScrollView style={styles.tableContainer}>
        {historico.map((item, index) => {
          // Destaca a primeira linha (mais recente) em azul
          const rowColor = index === 0 ? "#3b82f6" : "#ffffff";
          return (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableRowText, { color: rowColor, flex: 1 }]}>{item.azimute}°</Text>
              <Text style={[styles.tableRowText, { color: rowColor, flex: 1 }]}>{item.elevacao}°</Text>
              <Text style={[styles.tableRowText, { color: rowColor, flex: 2, textAlign: "center" }]}>
                {item.medido.toFixed(3)}
              </Text>
              <Text style={[styles.tableRowText, { color: rowColor, flex: 1, textAlign: "right" }]}>
                {item.percentual}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={limparHistorico}>
          <Text style={styles.buttonText}>RESTAURAR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={salvarHistorico}>
          <Text style={styles.buttonText}>SALVAR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    padding: 20,
    paddingTop: 60,
  },
  topBox: {
    borderWidth: 2,
    borderColor: "#ffffff",
    paddingVertical: 20,
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
    marginBottom: 30,
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
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase",
  },
  boxValue: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
  },
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 18,
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
    fontSize: 20,
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
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
});
