# TPanel ☀️📱

O **TPanel** é um aplicativo mobile desenvolvido para auxiliar na instalação e no posicionamento ideal de painéis solares. Através de sensores integrados ao dispositivo móvel (como acelerômetro e magnetômetro) e dados de radiação solar regionalizados, o aplicativo calcula a eficiência de captação em tempo real de acordo com a inclinação (elevação) e a orientação (azimute).

Este projeto foi desenvolvido em colaboração com o **GriluEE** (Grupo de Pesquisa em Iluminação e Eficiência Energética) da **Universidade Federal de Sergipe (UFS)**.

---

## 🚀 Funcionalidades Principais

- **Detecção de Sensores em Tempo Real**: Mede o **Azimute** (ângulo horizontal/direção geográfica) e a **Elevação** (ângulo vertical/inclinação do painel) em tempo real usando o magnetômetro e acelerômetro do aparelho.
- **Cálculo de Eficiência Relativa**: Compara as leituras dos sensores em tempo real com a base de dados de irradiância solar da cidade selecionada, fornecendo a porcentagem de eficiência e um feedback visual por cores (Verde: eficiência ideal $\ge 70\%$, Amarelo: regular $\ge 40\%$, Vermelho: baixa eficiência $< 40\%$).
- **Geolocalização Automática**: Identifica a cidade atual do usuário via GPS (ou permite selecionar manualmente a capital mais próxima) para carregar os dados específicos de radiação solar de forma instantânea.
- **Histórico de Medições**: Permite salvar e listar medições de placas solares com o nome da placa, data, azimute, elevação e eficiência calculada.
- **Exportação de Dados para CSV**: Exporte todas as medições salvas para um arquivo de planilha `.csv` utilizando as bibliotecas nativas de compartilhamento do dispositivo móvel.
- **Interface Moderna com Tema Escuro Dinâmico**: Visual escuro otimizado para o trabalho em campo sob a luz solar, alternando de forma adaptativa com o tema claro do sistema.
- **Onboarding Interativo & Dicas Contextuais (Tooltips)**: Facilita o aprendizado de termos como Azimute e Elevação para novos instaladores diretamente na interface do app.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando o ecossistema moderno do **React Native** e **Expo**:

- **Core**: [React Native](https://reactnative.dev/) (v0.81.5) & [React](https://react.dev/) (v19)
- **Framework**: [Expo](https://expo.dev/) (SDK 54) com [Expo Router](https://docs.expo.dev/router/introduction/) para gerenciamento de rotas baseado em arquivos.
- **Sensores**: `expo-sensors` para integração nativa com o acelerômetro e magnetômetro do dispositivo móvel.
- **Geolocalização**: `expo-location` para ler coordenadas e calcular a cidade de referência mais próxima por distância haversine.
- **Formatos de Arquivos & Compartilhamento**: `xlsx` (SheetJS) para geração de arquivos de planilhas robustos e `expo-sharing` + `expo-file-system` para exportar dados nativamente.
- **Imagens**: `expo-image` para renderização rápida e otimizada de imagens e vetores SVG.

---

## 📦 Estrutura do Projeto

O código principal está organizado da seguinte forma:

```text
├── app/
│   ├── _layout.tsx           # Configuração base de rotas e estilos de tela
│   ├── dados_irradiacao.json # Banco de dados de radiação solar para as capitais brasileiras
│   └── index.tsx             # Código principal do aplicativo (Lógica dos sensores, estados de localização, modais de onboarding, sobre, tooltips e histórico)
├── assets/
│   ├── images/               # Logos do GriluEE, UFS, TPanel e ícones do aplicativo
│   └── fonts/                # Fontes personalizadas
├── package.json              # Configurações do projeto, dependências e scripts do Expo
└── tsconfig.json             # Configuração do compilador TypeScript
```

---

## 💻 Como Executar o Projeto Localmente

### Pré-requisitos
1. **Node.js** (versão 18 ou superior recomendada)
2. Gerenciador de pacotes **npm** ou **yarn**
3. Aplicativo **Expo Go** instalado no celular (disponível na [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) ou [App Store](https://apps.apple.com/app/expo-go/id984023796))

### Passos de Instalação

1. Clone o repositório para o seu ambiente local:
   ```bash
   git clone https://github.com/themateus/posicaoPlacaSolar.git
   cd posicaoPlacaSolar
   ```

2. Instale as dependências do projeto:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento do Expo:
   ```bash
   npx expo start
   ```

4. **Rodando no Celular**:
   - Abra o aplicativo **Expo Go** no celular.
   - Escaneie o QR Code gerado no terminal.
   - Se o seu computador e o celular estiverem em redes diferentes, utilize o script de túnel incluído para conexão remota estável:
     ```bash
     npm run tunnel
     ```

---

## 📊 Base de Dados e Metodologia

O cálculo de eficiência baseia-se na radiação solar estimada para cada par de ângulos (azimute de 0° a 360° e elevação de 0° a 90°) em diversas capitais brasileiras. 
O aplicativo obtém a localização do aparelho e identifica o ponto de referência cadastrado mais próximo. A partir daí, faz a correspondência em tempo real dos ângulos do celular com a tabela de irradiância ótima local, guiando o instalador para o ângulo de máxima captura solar.

---

## 👥 Créditos e Realização

Este aplicativo foi desenvolvido em parceria acadêmica com o **GriluEE** (Grupo de Pesquisa em Iluminação e Eficiência Energética) da **Universidade Federal de Sergipe (UFS)**.

- **Desenvolvedor:** Mateus Lucena ([@themateus](https://github.com/themateus))
- **Grupo de Pesquisa:** GriluEE - UFS
