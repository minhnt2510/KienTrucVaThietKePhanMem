import app from "./app";
import { config } from "./config";
import { testDbConnection } from "./db";

app.listen(config.port, () => {
  console.log(`Order Service running on port ${config.port}`);
  console.log(`User Service URL: ${config.userServiceUrl}`);
  console.log(`Food Service URL: ${config.foodServiceUrl}`);
  testDbConnection()
    .then(() => {
      console.log(
        `MariaDB connected: ${config.dbUser}@${config.dbHost}:${config.dbPort}/${config.dbName}`
      );
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`MariaDB connection failed: ${message}`);
    });
});
