import { IconCircle, IconRefresh, IconX } from "@tabler/icons-solidjs";
import { createEffect, createMemo, createSignal, For, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";

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
  // if all full, return -1 for draw
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
  // if all are not null, return -1 for draw
  if (bigBoard.every((board) => getWinner(board) !== null)) {
    return -1;
  }
  return null;
}

function App() {
  const [bigBoard, setBigBoard] = createStore(createBigBoard());
  const [player, setPlayer] = createSignal<Player>(0);
  const [nextBoard, setNextBoard] = createSignal<number | null>(null);

  onMount(() => {
    // load from local storage
    const data = localStorage.getItem("data");
    if (data) {
      const { bigBoard, player, nextBoard } = JSON.parse(data);
      setBigBoard(bigBoard);
      setPlayer(player);
      setNextBoard(nextBoard);
    }
  });

  createEffect(() => {
    // save to local storage
    localStorage.setItem(
      "data",
      JSON.stringify({
        bigBoard,
        player: player(),
        nextBoard: nextBoard(),
      })
    );
  });

  const winner = createMemo(() => getBigWinner(bigBoard));

  return (
    <div class="flex items-center justify-center h-full">
      <div class="w-full h-auto md:w-auto md:h-full aspect-[8/9] p-2 sm:p-4 md:p-8 lg:p-12 flex flex-col gap-4">
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
                          ? player() === 0
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
                              winner() !== null
                            }
                            onClick={() => {
                              if (nextBoard() !== null && nextBoard() !== i()) {
                                return;
                              }
                              if (cell !== null) {
                                return;
                              }
                              setBigBoard(i(), j(), player());
                              setPlayer(player() === 0 ? 1 : 0);
                              if (getWinner(bigBoard[j()]) !== null) {
                                setNextBoard(null);
                              } else {
                                setNextBoard(j());
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
        <div class="h-16 flex items-center justify-between px-2">
          <div class="flex items-center gap-2 text-2xl text-slate-800">
            <Show
              when={winner() === null}
              fallback={
                winner() === -1 ? (
                  "Draw"
                ) : (
                  <>
                    <Show when={winner() === 0}>
                      <IconX size={40} class="text-pink-600" />
                    </Show>
                    <Show when={winner() === 1}>
                      <IconCircle size={40} class="text-violet-600" />
                    </Show>
                    wins!
                  </>
                )
              }
            >
              <Show
                when={player() === 0}
                fallback={<IconCircle size={40} class="text-violet-600" />}
              >
                <IconX size={40} class="text-pink-600" />
              </Show>
              up next
            </Show>
          </div>
          <button
            class={
              "px-4 py-1.5 rounded transition-colors hover:cursor-pointer text-lg flex items-center gap-1.5 " +
              (winner() !== null
                ? "bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-600")
            }
            onClick={() => {
              setBigBoard(createBigBoard());
              setPlayer(0);
              setNextBoard(null);
            }}
          >
            <IconRefresh class="size-5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
