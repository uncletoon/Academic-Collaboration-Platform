const http = require("http");

async function startServerWithPortFallback({
  createServer = () => http.createServer(),
  initDb = async () => {},
  initSocket = () => {},
  defaultPort = 5000,
  maxAttempts = 10,
  logger = console,
} = {}) {
  const requestedPort = Number(process.env.PORT || defaultPort);
  const initialPort =
    Number.isInteger(requestedPort) && requestedPort > 0
      ? requestedPort
      : defaultPort;

  let port = initialPort;

  for (let attempt = 0; attempt <= maxAttempts; attempt += 1) {
    await initDb();

    const server = createServer();
    initSocket(server);

    const outcome = await new Promise((resolve, reject) => {
      const cleanup = () => {
        server.off("error", onError);
        server.off("listening", onListening);
      };

      const onError = (error) => {
        cleanup();

        if (error.code === "EADDRINUSE" && attempt < maxAttempts) {
          const nextPort = port + 1;
          logger.warn(
            `Port ${port} is already in use. Trying ${nextPort} instead.`,
          );
          port = nextPort;
          resolve({ retry: true });
          return;
        }

        reject(error);
      };

      const onListening = () => {
        cleanup();
        resolve({ retry: false });
      };

      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port);
    });

    if (!outcome.retry) {
      return { server, port };
    }
  }

  throw new Error(
    `Unable to start server on any port from ${initialPort} to ${port}`,
  );
}

module.exports = {
  startServerWithPortFallback,
};
