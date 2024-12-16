import type { ServerWebSocket } from "bun";
import { z } from "zod";

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

type WebSocketData = {
  gameId: string;
  player: Player;
};

type Game = {
  bigBoard: BigBoard;
  turn: Player;
  nextBoard: number | null;
  full: boolean;
  players: { num: number; socket: ServerWebSocket<WebSocketData> }[];
  rematch: Player | null;
};

const games = new Map<string, Game>();

function generateGameId(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Letters and numbers
  let gameId = "";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    gameId += characters[randomIndex];
  }
  return gameId;
}

const server = Bun.serve<WebSocketData>({
  fetch(req, server) {
    try {
      // upgrade the request to a WebSocket
      const url = new URL(req.url);
      console.log(url.pathname);
      let gameId: string;
      let playerNum: Player;
      if (url.pathname === "/ping") {
        return new Response("Pong");
      } else if (url.pathname === "/join") {
        const gameIdParam = url.searchParams.get("gameId");
        if (gameIdParam === null) {
          return new Response("Missing gameId", { status: 400 });
        }
        gameId = gameIdParam;
        const game = games.get(gameId);
        if (game === undefined) {
          return new Response("Game not found", { status: 404 });
        }
        if (game.full) {
          return new Response("Game is full", { status: 400 });
        }
        game.full = true;
        playerNum = 1;
        for (const player of game.players) {
          player.socket.send(
            JSON.stringify({
              type: "game",
              game: {
                bigBoard: game.bigBoard,
                turn: game.turn,
                nextBoard: game.nextBoard,
                full: game.full,
                player: player.num,
                id: gameId,
                rematch: game.rematch,
              },
            })
          );
        }
      } else if (url.pathname === "/create") {
        gameId = generateGameId();
        games.set(gameId, {
          bigBoard: createBigBoard(),
          turn: 0,
          nextBoard: null,
          full: false,
          players: [],
          rematch: null,
        });
        playerNum = 0;
      } else if (url.pathname === "/resume") {
        const gameIdParam = url.searchParams.get("gameId");
        const playerParam = url.searchParams.get("player");
        if (gameIdParam === null || playerParam === null) {
          return new Response("Missing gameId or player", { status: 400 });
        }

        gameId = gameIdParam;
        playerNum = parseInt(playerParam) as Player;

        console.assert(playerNum === 0 || playerNum === 1);

        const game = games.get(gameId);
        if (game === undefined) {
          return new Response("Game not found", { status: 404 });
        }
      } else {
        return new Response("Invalid path", { status: 404 });
      }
      if (
        server.upgrade(req, {
          data: {
            player: playerNum,
            gameId,
          },
        })
      ) {
        console.log("Upgrade successful");
        return; // do not return a Response
      }
      console.log("Upgrade failed");
      return new Response("Upgrade failed", { status: 500 });
    } catch (error) {
      console.error("Error handling fetch", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
  websocket: {
    message(ws, message) {
      try {
        const game = games.get(ws.data.gameId);
        if (game === undefined) {
          ws.close();
          return;
        }
        const parsedData = z
          .union([
            z.object({
              type: z.literal("move"),
              board: z.number(),
              cell: z.number(),
            }),
            z.object({
              type: z.literal("rematch"),
            }),
          ])
          .safeParse(JSON.parse(message.toString()));

        if (!parsedData.success) {
          console.error("Invalid message", parsedData.error);
          return;
        }
        const { data } = parsedData;

        if (data.type === "move") {
          console.log("Move", data);
          if (
            game.turn === ws.data.player &&
            (game.nextBoard === null || game.nextBoard === data.board) &&
            game.bigBoard[data.board][data.cell] === null
          ) {
            console.log("Valid move");
            game.bigBoard[data.board][data.cell] = ws.data.player;
            game.turn = game.turn === 0 ? 1 : 0;
            if (getWinner(game.bigBoard[data.cell]) !== null) {
              game.nextBoard = null;
            } else {
              game.nextBoard = data.cell;
            }
          }
          for (const player of game.players) {
            player.socket.send(
              JSON.stringify({
                type: "game",
                game: {
                  bigBoard: game.bigBoard,
                  turn: game.turn,
                  nextBoard: game.nextBoard,
                  full: game.full,
                  player: player.num,
                  id: ws.data.gameId,
                  rematch: game.rematch,
                },
              })
            );
          }
        } else if (data.type === "rematch") {
          console.log("Rematch");
          if (game.rematch !== null && game.rematch !== ws.data.player) {
            game.bigBoard = createBigBoard();
            game.turn = game.turn === 0 ? 1 : 0;
            game.nextBoard = null;
            game.rematch = null;
          } else {
            game.rematch = ws.data.player;
          }
          for (const player of game.players) {
            player.socket.send(
              JSON.stringify({
                type: "game",
                game: {
                  bigBoard: game.bigBoard,
                  turn: game.turn,
                  nextBoard: game.nextBoard,
                  full: game.full,
                  player: player.num,
                  id: ws.data.gameId,
                  rematch: game.rematch,
                },
              })
            );
          }
        }
      } catch (error) {
        console.error("Error handling message", error);
      }
    },
    open(ws) {
      try {
        const game = games.get(ws.data.gameId);
        if (game === undefined) {
          ws.close();
          return;
        }
        game.players.push({ num: ws.data.player, socket: ws });
        ws.send(
          JSON.stringify({
            type: "game",
            game: {
              bigBoard: game.bigBoard,
              turn: game.turn,
              nextBoard: game.nextBoard,
              full: game.full,
              player: ws.data.player,
              id: ws.data.gameId,
              rematch: game.rematch,
            },
          })
        );
      } catch (error) {
        console.error("Error handling open", error);
      }
    },
    close(ws, code, message) {
      try {
        // const game = games.get(ws.data.gameId);
        // if (game === undefined) {
        //   return;
        // }
        // const index = game.players.findIndex((player) => player.socket === ws);
        // if (index !== -1) {
        //   game.players.splice(index, 1);
        //   if (game.players.length === 0) {
        //     games.delete(ws.data.gameId);
        //   }
        // }
        console.log("Socket closed", code, message);
      } catch (error) {
        console.error("Error handling close", error);
      }
    },
    drain(ws) {}, // the socket is ready to receive more data
  },
});

console.log(`Server running at ${server.url}`);
