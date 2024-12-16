import {
  IconCheck,
  IconCircle,
  IconCloud,
  IconCopy,
  IconLoader2,
  IconPlus,
  IconRefresh,
  IconUsers,
  IconX,
} from "@tabler/icons-solidjs";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import Button from "./components/Button";
import Input from "./components/Input";
import { z } from "zod";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
if (!(SERVER_URL && typeof SERVER_URL === "string")) {
  throw new Error("VITE_SERVER_URL is not defined");
}

const playerSchema = z.union([z.literal(0), z.literal(1)]);
const boardSchema = z.tuple([
  playerSchema.nullable(),
  playerSchema.nullable(),
  playerSchema.nullable(),
  playerSchema.nullable(),
  playerSchema.nullable(),
  playerSchema.nullable(),
  playerSchema.nullable(),
  playerSchema.nullable(),
  playerSchema.nullable(),
]);

const messageSchema = z.object({
  type: z.literal("game"),
  game: z.object({
    bigBoard: z.tuple([
      boardSchema,
      boardSchema,
      boardSchema,
      boardSchema,
      boardSchema,
      boardSchema,
      boardSchema,
      boardSchema,
      boardSchema,
    ]),
    turn: playerSchema,
    id: z.string(),
    nextBoard: z.number().nullable(),
    player: playerSchema,
    full: z.boolean(),
    rematch: playerSchema.nullable(),
  }),
});

type Player = 0 | 1;
type Draw = -1;
type Cell = Player | null;
type Board = [Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell, Cell];
type BigBoard = [Board, Board, Board, Board, Board, Board, Board, Board, Board];

function createBigBoard(): BigBoard {
  return [
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null, null],
  ];
}

const lines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

function getWinner(board: Board): Player | Draw | null {
  for (const [a, b, c] of lines) {
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every((cell) => cell !== null)) {
    return -1;
  }
  return null;
}

export function getBigWinner(bigBoard: BigBoard): Player | Draw | null {
  for (const [a, b, c] of lines) {
    const winner = getWinner(bigBoard[a]);
    if (
      winner !== null &&
      winner !== -1 &&
      winner === getWinner(bigBoard[b]) &&
      winner === getWinner(bigBoard[c])
    ) {
      return winner;
    }
  }
  if (bigBoard.every((board) => getWinner(board) !== null)) {
    return -1;
  }
  return null;
}

enum AppStatus {
  None,
  Local,
  Remote,
}

function App() {
  const [status, setStatus] = createSignal<AppStatus>(AppStatus.None);
  const [gameId, setGameId] = createSignal<string | null>();
  const [bigBoard, setBigBoard] = createStore(createBigBoard());
  const [turn, setTurn] = createSignal<Player>(0);
  const [player, setPlayer] = createSignal<Player | null>(null);
  const [nextBoard, setNextBoard] = createSignal<number | null>(null);
  const [socket, setSocket] = createSignal<WebSocket | null>(null);
  const [gameIdInput, setGameIdInput] = createSignal<HTMLInputElement | null>(null);
  const [full, setFull] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [connected, setConnected] = createSignal(false);
  const [rematch, setRematch] = createSignal<Player | null>(null);

  const messageListener = (event: MessageEvent) => {
    const data = messageSchema.parse(JSON.parse(event.data));
    setBigBoard(data.game.bigBoard);
    setTurn(data.game.turn);
    setNextBoard(data.game.nextBoard);
    setPlayer(data.game.player);
    setGameId(data.game.id);
    setFull(data.game.full);
    setRematch(data.game.rematch);
  };

  const openListener = () => {
    console.log("Connected to server");
    setStatus(AppStatus.Remote);
    setConnected(true);
  };

  const closeListener = () => {
    console.log("Disconnected from server");
    setConnected(false);
    setError("Connection failed");
  };

  const errorListener = (event: Event) => {
    console.error(event);
    setError("An error occurred");
  };

  onMount(() => {
    // load from local storage
    const data = localStorage.getItem("data");
    if (data) {
      const { bigBoard, turn, nextBoard, status, gameId, player, full } =
        JSON.parse(data);
      setBigBoard(bigBoard);
      setTurn(turn);
      setNextBoard(nextBoard);
      setStatus(status || AppStatus.None);
      setGameId(gameId);
      setPlayer(player);
      setFull(full);

      if (status === AppStatus.Remote) {
        const newSocket = new WebSocket(
          `${SERVER_URL}/resume?gameId=${gameId}&player=${player}`
        );
        setSocket(newSocket);
        newSocket.addEventListener("open", openListener);
        newSocket.addEventListener("message", messageListener);
        newSocket.addEventListener("close", closeListener);
        newSocket.addEventListener("error", errorListener);
      }
    }
  });

  onCleanup(() => {
    if (socket() !== null) {
      socket()!.close();
    }
  });

  createEffect(() => {
    console.log("Saving to local storage");
    // save to local storage
    localStorage.setItem(
      "data",
      JSON.stringify({
        bigBoard,
        turn: turn(),
        nextBoard: nextBoard(),
        status: status(),
        gameId: gameId(),
        player: player(),
        full: full(),
      })
    );
  });

  const winner = createMemo(() => getBigWinner(bigBoard));

  return (
    <div class="flex items-center justify-center h-full">
      <div class="w-full h-auto md:w-auto md:h-full aspect-[8/9] p-2 sm:p-4 md:p-8 lg:p-12 flex flex-col gap-4">
        {status() === AppStatus.None ? (
          <div class="p-2 sm:p-3 h-full flex items-center">
            <div class="flex flex-col w-full gap-4 sm:gap-5 md:gap-6 p-7 sm:p-10 md:p-12 bg-slate-100 rounded-xl mb-10">
              <h1 class="text-xl sm:text-2xl md:text-2xl text-slate-800 font-medium font-display mb-3">
                Ultimate Tic Tac Toe
              </h1>
              <Button onClick={() => setStatus(AppStatus.Local)} size="lg">
                <IconUsers size={20} />
                Play Local Game
              </Button>
              <p class="text-slate-700 sm:text-lg text-center">or play online</p>
              <Button
                onClick={() => {
                  const newSocket = new WebSocket(`${SERVER_URL}/create`);
                  setSocket(newSocket);
                  newSocket.addEventListener("open", openListener);
                  newSocket.addEventListener("message", messageListener);
                  newSocket.addEventListener("close", closeListener);
                  newSocket.addEventListener("error", errorListener);
                }}
                size="lg"
              >
                <IconPlus size={20} />
                Create Game
              </Button>
              <form
                class="flex flex-col gap-1.5 mt-2"
                onSubmit={(e) => {
                  e.preventDefault();

                  if (gameId() === undefined) {
                    return;
                  }

                  const newSocket = new WebSocket(
                    `${SERVER_URL}/join?gameId=${gameId()}`
                  );
                  setSocket(newSocket);
                  newSocket.addEventListener("open", openListener);
                  newSocket.addEventListener("message", messageListener);
                  newSocket.addEventListener("close", closeListener);
                  newSocket.addEventListener("error", errorListener);
                }}
              >
                <div class="grid sm:grid-cols-[3fr_1fr] gap-3 sm:gap-5">
                  <label class="text-slate-700 grid grid-cols-[auto_1fr] gap-5 items-center bg-slate-200 pl-4 rounded-lg border border-slate-200 text-lg">
                    Game ID
                    <Input
                      class="tracking-widest"
                      size="lg"
                      value={gameId() ?? ""}
                      ref={setGameIdInput}
                      onInput={(e) => setGameId(e.currentTarget.value)}
                      placeholder="ABC123"
                      required
                    />
                  </label>
                  <Button class="justify-center" size="lg" type="submit" variant="dark">
                    Join
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <>
            <div class="grid grid-cols-3 gap-1 aspect-square bg-slate-400">
              <For each={bigBoard}>
                {(board, i) => {
                  const boardWinner = createMemo(() => getWinner(board));
                  return (
                    <div class="p-2 bg-white">
                      <Show
                        when={boardWinner() === null}
                        fallback={
                          <div
                            class={
                              "flex items-center justify-center aspect-square rounded overflow-hidden " +
                              (boardWinner() === -1
                                ? "bg-slate-400"
                                : boardWinner() === 0
                                ? "bg-pink-400"
                                : "bg-violet-400")
                            }
                          >
                            <Show when={boardWinner() === 0}>
                              <IconX class="text-pink-50 size-2/3" />
                            </Show>
                            <Show when={boardWinner() === 1}>
                              <IconCircle class="text-violet-50 size-2/3" />
                            </Show>
                          </div>
                        }
                      >
                        <div
                          class={
                            "grid grid-cols-3 grid-rows-3 gap-0.5 transition-colors aspect-square rounded overflow-hidden " +
                            ((nextBoard() === null || nextBoard() === i()) &&
                            winner() === null
                              ? turn() === 0
                                ? "bg-pink-400"
                                : "bg-violet-400"
                              : "bg-slate-300")
                          }
                        >
                          <For each={board}>
                            {(cell, j) => (
                              <button
                                class="bg-white/90 hover:bg-white/80 transition-colors hover:cursor-pointer flex items-center justify-center active:bg-white/70 aspect-square disabled:cursor-auto disabled:bg-white/90"
                                disabled={
                                  cell !== null ||
                                  (nextBoard() !== null && nextBoard() !== i()) ||
                                  winner() !== null ||
                                  (player() !== turn() && status() === AppStatus.Remote)
                                }
                                onClick={() => {
                                  if (nextBoard() !== null && nextBoard() !== i()) {
                                    return;
                                  }
                                  if (cell !== null) {
                                    return;
                                  }
                                  setBigBoard(i(), j(), turn());
                                  setTurn(turn() === 0 ? 1 : 0);

                                  if (getWinner(bigBoard[j()]) !== null) {
                                    setNextBoard(null);
                                  } else {
                                    setNextBoard(j());
                                  }

                                  if (socket() !== null) {
                                    socket()!.send(
                                      JSON.stringify({
                                        type: "move",
                                        board: i(),
                                        cell: j(),
                                      })
                                    );
                                  }
                                }}
                              >
                                <Show when={cell === 0}>
                                  <IconX class="text-pink-600 size-2/3" />
                                </Show>
                                <Show when={cell === 1}>
                                  <IconCircle class="text-violet-600 size-2/3" />
                                </Show>
                              </button>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>
                  );
                }}
              </For>
            </div>
            <div class="h-16 flex items-center justify-between flex-col sm:flex-row gap-6 px-2">
              <div class="flex items-center gap-2 text-xl text-slate-800">
                <Show
                  when={winner() === null}
                  fallback={
                    winner() === -1 ? (
                      "Draw"
                    ) : (
                      <>
                        <Show when={winner() === 0}>
                          <IconX size={30} class="text-pink-600" />
                        </Show>
                        <Show when={winner() === 1}>
                          <IconCircle size={30} class="text-violet-600" />
                        </Show>
                        wins!
                      </>
                    )
                  }
                >
                  <Show
                    when={turn() === 0}
                    fallback={<IconCircle size={30} class="text-violet-600" />}
                  >
                    <IconX size={30} class="text-pink-600" />
                  </Show>
                  <Show when={status() === AppStatus.Remote} fallback="up next">
                    {player() === turn() ? "Your" : "Opponent's"} turn
                  </Show>
                </Show>
              </div>
              <div class="flex items-center gap-4">
                {status() === AppStatus.Local && (
                  <Button
                    onClick={() => {
                      setBigBoard(createBigBoard());
                      setTurn(0);
                      setNextBoard(null);
                      setPlayer(null);
                    }}
                    variant={() => (winner() === null ? "light" : "dark")}
                  >
                    <IconRefresh class="size-5" />
                    Reset
                  </Button>
                )}
                <Show when={status() === AppStatus.Remote}>
                  <div class="flex items-center gap-2">
                    <Show
                      when={connected()}
                      fallback={
                        <Show
                          when={error()}
                          fallback={
                            <>
                              <IconLoader2 class="size-5 animate-spin" />
                              Connecting
                            </>
                          }
                        >
                          <IconX class="size-5 text-red-600" />
                          {error()}
                        </Show>
                      }
                    >
                      <Show
                        when={full()}
                        fallback={
                          <>
                            <IconLoader2 class="size-5 animate-spin" />
                            Waiting for opponent
                          </>
                        }
                      >
                        <IconCloud class="size-5 text-green-600" />
                        Connected
                      </Show>
                    </Show>
                  </div>
                  <Show when={winner() !== null}>
                    <Button
                      onClick={() => {
                        if (socket() !== null) {
                          socket()!.send(JSON.stringify({ type: "rematch" }));
                        }
                      }}
                      variant="dark"
                    >
                      <Show
                        when={rematch() === player()}
                        fallback={<IconRefresh class="size-5" />}
                      >
                        <IconLoader2 class="size-5 animate-spin" />
                      </Show>
                      <Show when={rematch() === null || rematch() === player()} fallback="Accept">
                        Rematch
                      </Show>
                    </Button>
                  </Show>
                  <Show when={!full()}>
                    <Button
                      onClick={() => {
                        if (gameId() === undefined) {
                          return;
                        }
                        navigator.clipboard.writeText(gameId()!).then(() => {
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        });
                      }}
                      variant="light"
                    >
                      <Show when={copied()} fallback={<IconCopy class="size-5" />}>
                        <IconCheck class="size-5 text-green-600" />
                      </Show>
                      {gameId()}
                    </Button>
                  </Show>
                </Show>
                <Button
                  onClick={() => {
                    setStatus(AppStatus.None);
                    setGameId(null);
                    setBigBoard(createBigBoard());
                    setTurn(0);
                    setNextBoard(null);
                    setPlayer(null);
                    const workaround = gameIdInput();
                    if (workaround !== null) {
                      workaround.value = "";
                    }
                    if (socket() !== null) {
                      socket()!.close();
                      setSocket(() => null);
                    }
                  }}
                >
                  Exit
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
