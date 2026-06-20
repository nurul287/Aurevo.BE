import app from "./app";
import { config } from "./app/config";

const PORT = parseInt(config.PORT, 10);

app.listen(PORT, () => {
  console.log(`
Aurevo Backend — ${config.NODE_ENV}
Server   : http://localhost:${PORT}
API Docs : http://localhost:${PORT}/api/docs
Health   : http://localhost:${PORT}/health
  `);
});



