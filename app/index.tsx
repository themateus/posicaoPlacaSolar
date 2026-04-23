import { Accelerometer, Magnetometer } from "expo-sensors";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

// Importa os dados que você salvou no arquivo JSON
import dadosTroplux from "./dados.json";

// Define o formato do seu JSON para o TypeScript reconhecer as chaves dinâmicas
type TropluxData = Record<string, Record<string, number>>;
const dados: TropluxData = dadosTroplux as TropluxData;

export default function App() {
  // Tipagem dos estados
  const [azimute, setAzimute] = useState<number>(0);
  const [elevacao, setElevacao] = useState<number>(0);
  const [resultadoDestaque, setResultadoDestaque] = useState<string>("0");

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
      setResultadoDestaque(valorEncontrado.toString());
    } else {
      setResultadoDestaque("--");
    }
  }, [azimute, elevacao]);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Leitura Troplux</Text>

      {/* RESULTADO EM DESTAQUE */}
      <View style={styles.cardDestaque}>
        <Text style={styles.labelDestaque}>VALOR MEDIDO</Text>
        <Text style={styles.valorDestaque}>{resultadoDestaque}</Text>
      </View>

      {/* SENSORES MENORES EM BAIXO */}
      <View style={styles.linhaSensores}>
        <View style={styles.cardMenor}>
          <Text style={styles.labelSensores}>Azimute (Horizontal)</Text>
          <Text style={styles.valorSensores}>{azimute}°</Text>
        </View>

        <View style={styles.cardMenor}>
          <Text style={styles.labelSensores}>Elevação (Vertical)</Text>
          <Text style={styles.valorSensores}>{elevacao}°</Text>
        </View>
      </View>

      <Text style={styles.instrucao}>
        Mova o celular para atualizar os valores em tempo real
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 40,
  },
  cardDestaque: {
    backgroundColor: "#262626",
    padding: 40,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#ffdd00",
    shadowColor: "#ffdd00",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  labelDestaque: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffdd00",
    letterSpacing: 2,
    marginBottom: 10,
  },
  valorDestaque: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#ffffff",
  },
  linhaSensores: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cardMenor: {
    backgroundColor: "#1a1a1a",
    padding: 20,
    borderRadius: 15,
    width: "48%",
    alignItems: "center",
  },
  labelSensores: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    marginBottom: 5,
  },
  valorSensores: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#00ffcc",
  },
  instrucao: {
    marginTop: 40,
    fontSize: 14,
    color: "#555555",
    textAlign: "center",
  },
});
