# Gravador de Tela Chequetto

Aplicativo desktop local para captura de tela, criado com Electron e APIs nativas do Chromium. A interface não usa framework ou servidor externo; o vídeo é codificado em WebM no computador do usuário e salvo diretamente na pasta escolhida.

## Estrutura

```text
src/
	main.js       Processo principal: janelas, arquivos, fontes e licença local
	preload.js    Ponte IPC mínima e segura entre Electron e a interface
	index.html    Interface do gravador e modal de planos
	styles.css    UI responsiva, clara e compacta
	renderer.js   Captura, mixagem de áudio, câmera, timer e atalhos
```

## Executar

Requer Node.js 20+.

```bash
npm install
npm start
```

Para gerar o instalador Windows:

```bash
npm run build
```

## Recursos

- Tela inteira e janela específica via `desktopCapturer`.
- Região preparada na UI para o fluxo de seleção.
- Som do sistema e microfone sincronizados na mesma gravação.
- Webcam opcional composta no canto inferior do vídeo.
- Captura instantânea em PNG.
- `F9` inicia ou encerra; `F10` pausa ou retoma, inclusive em segundo plano.
- Saída local em WebM, sem upload.
- Trial local de 30 dias e planos mensal (R$ 29,90), trimestral (R$ 69,90), anual (R$ 199,90) e vitalício (R$ 497,00).

## Ativação comercial

O fluxo de paywall e o estado da licença são locais em `license.json`, dentro do diretório de dados do Electron. A ativação mostrada no protótipo é deliberadamente local para manter o projeto sem dependência de nuvem; antes de vender o produto, conecte os botões a um provedor de pagamentos e valide recibos assinados no processo principal.