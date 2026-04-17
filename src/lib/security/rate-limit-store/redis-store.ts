import net from "net";

import { RateLimitIncrementResult, RateLimitStore } from "@/lib/security/rate-limit-store/types";

function parseRedisUrl(redisUrl: string) {
  const parsed = new URL(redisUrl);
  const host = parsed.hostname;
  const port = Number(parsed.port || "6379");
  return { host, port };
}

async function sendRedisCommand(
  redisUrl: string,
  command: string[],
): Promise<string | null> {
  const { host, port } = parseRedisUrl(redisUrl);

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    socket.setTimeout(2000);

    let response = "";

    socket.on("connect", () => {
      const payload =
        `*${command.length}\r\n` +
        command.map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join("");
      socket.write(payload);
    });

    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (response.includes("\r\n")) {
        socket.end();
      }
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Redis command timeout"));
    });

    socket.on("error", (error) => reject(error));
    socket.on("end", () => resolve(response || null));
  });
}

function parseIntegerResponse(raw: string | null) {
  if (!raw) return 0;
  const match = raw.match(/:(\d+)/);
  return match ? Number(match[1]) : 0;
}

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redisUrl: string) {}

  async increment(key: string, windowMs: number): Promise<RateLimitIncrementResult> {
    const current = parseIntegerResponse(
      await sendRedisCommand(this.redisUrl, ["INCR", key]),
    );

    if (current === 1) {
      await sendRedisCommand(this.redisUrl, ["PEXPIRE", key, String(windowMs)]);
    }

    const ttlMs = parseIntegerResponse(
      await sendRedisCommand(this.redisUrl, ["PTTL", key]),
    );

    return {
      count: current,
      expiresAt: Date.now() + Math.max(ttlMs, 0),
    };
  }
}
