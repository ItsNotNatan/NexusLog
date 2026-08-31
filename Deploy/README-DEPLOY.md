# NexusLog — Deploy na máquina servidora

Este é o mesmo esquema de deploy que já roda o **ATMLog** naquela máquina.
A diferença é que o NexusLog **não usa mais o Supabase**: o banco agora é o
**PocketBase**, rodando ali mesmo, sem depender de nuvem nem de internet
para funcionar.

---

## Como instalar (primeira vez)

1. Copie **esta pasta `Deploy`** para um lugar próprio na máquina servidora.
   Sugestão: `C:\NexusLog\`

   > Importante: copie a pasta para fora do repositório. É isso que mantém o
   > banco e os backups separados do código.

2. Clique com o botão direito no **`INICIAR-NEXUSLOG.bat`** →
   **Executar como Administrador**.
   (O Administrador é só para liberar as portas no firewall.)

3. Na primeira execução ele vai pedir um **e-mail e uma senha de
   administrador do banco**. Anote — é o acesso ao painel do PocketBase.
   Fica salvo só nessa máquina, no arquivo `Servidor\.env`, e nunca vai
   para o GitHub.

4. Espere aparecer **`NEXUSLOG NO AR`**. A primeira vez demora alguns
   minutos, porque ele baixa o PocketBase, instala as dependências e
   compila o site.

Pronto. A janela precisa **ficar aberta** — é ela que mantém o sistema no ar.

---

## Endereços

O `<IP>` é descoberto sozinho e aparece na tela quando o sistema sobe.

| O quê | Endereço |
|---|---|
| Sistema (o que as pessoas usam) | `http://<IP>:8083` |
| API | `http://<IP>:3002/api/health` |
| Painel do banco (PocketBase) | `http://<IP>:8092/_/` |

**Login inicial:** `adm@comau.com` / `123`
(troque a senha em Configurações assim que entrar)

### Por que estas portas

O ATMLog já ocupa `3001`, `8080`, `8082` e `8091` na mesma máquina.
O NexusLog usa `3002`, `8083` e `8092` para os dois conviverem sem brigar.

---

## Teclas (na janela do auto-deploy)

| Tecla | O que faz |
|---|---|
| **R** | reinicia os servidores |
| **U** | procura atualização agora (sem esperar os 30s) |
| **P** | pausa / retoma o sistema |
| **B** | faz um backup agora |
| **Q** | **para tudo e sai** (faz um backup antes) |
| **H** | mostra as teclas de novo |

> Use o **Q** para desligar. No Windows o Ctrl+C nem sempre encerra tudo.

---

## Como fica organizado na máquina

```
C:\NexusLog\
  INICIAR-NEXUSLOG.bat   <- você executa este
  auto-deploy.js         <- o "motor"
  NexusLog-Sistema\      <- o código (baixado do GitHub, atualiza sozinho)
  pb_data\               <- O BANCO  *fica FORA do código, nunca é apagado*
  Backups\               <- backups automáticos
```

O detalhe que importa: o banco (`pb_data`) fica **fora** da pasta do código.
Toda vez que o sistema se atualiza, ele apaga e rebaixa o código — se o banco
estivesse lá dentro, os dados iriam junto. Ficando fora, **nenhuma atualização
encosta nos dados**.

---

## Atualização automática

A cada 30 segundos ele olha o GitHub. Quando aparece um commit novo no
`main`, ele:

1. faz um backup do banco,
2. baixa o código novo,
3. recompila **só o que mudou** (front e/ou servidor),
4. reinicia o que for preciso.

Ou seja: para publicar uma mudança, basta subir para o `main`. Não precisa
mexer na máquina.

---

## Backups

- Automático a cada **6 horas**, e também ao subir, antes de cada
  atualização, ao pausar e ao sair.
- Guarda os **12 mais recentes** em `Backups\`.
- Se um dia o banco aparecer vazio, o próprio script **pergunta** se você
  quer restaurar um backup antes de começar do zero.

Para um backup 100% consistente, aperte **P** (pausa), depois **B**.

---

## Se der problema

**"Porta já em uso"** — provavelmente sobrou um processo antigo.
Aperte **Q**, feche a janela e rode o `.bat` de novo (ele limpa as portas
sozinho ao iniciar).

**O site abre mas não carrega os dados** — veja se a janela mostra
`pocketbase` e `servidor` rodando. Aperte **R** para reiniciar.

**Ninguém da rede consegue acessar** — o `.bat` precisa ter rodado como
Administrador pelo menos uma vez, para criar as regras de firewall.

**Esqueci a senha do painel do PocketBase** — apague as linhas
`PB_ADMIN_EMAIL` e `PB_ADMIN_PASSWORD` do arquivo
`NexusLog-Sistema\Servidor\.env` e rode o `.bat` de novo: ele pergunta
outra vez.
